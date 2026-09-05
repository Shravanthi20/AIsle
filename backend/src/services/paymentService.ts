import crypto from 'node:crypto';
import Razorpay from 'razorpay';

import { env } from '../config/env.js';
import { PaymentRepository, type PaymentOrder } from '../repositories/paymentRepository.js';
import type { AuthenticatedUser } from '../types/auth.js';
import { HttpError, httpStatus } from '../utils/http.js';
import { PolicyService } from '../policy/policyService.js';
import { AuditService } from '../audit/auditService.js';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface CreateOrderBody { orderId?: unknown }
interface VerifyBody {
  orderId?: unknown;
  razorpayOrderId?: unknown;
  razorpayPaymentId?: unknown;
  razorpaySignature?: unknown;
}
interface FailureBody { orderId?: unknown; razorpayOrderId?: unknown }

function requiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new HttpError(httpStatus.badRequest, `${field} is required`);
  }
  return value.trim();
}

function amountInSubunits(total: string): number {
  const amount = Math.round(Number(total) * 100);
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    throw new HttpError(httpStatus.conflict, 'Order total is not payable');
  }
  return amount;
}

export class PaymentService {
  constructor(private readonly payments = new PaymentRepository(), private readonly policies = new PolicyService(), private readonly audits = new AuditService()) {}

  private razorpay() {
    if (env.razorpayMode !== 'test' || !env.razorpayKeyId || !env.razorpayKeySecret) {
      throw new HttpError(httpStatus.internalServerError, 'Razorpay is not configured');
    }
    return new Razorpay({ key_id: env.razorpayKeyId, key_secret: env.razorpayKeySecret });
  }

  private checkoutDetails(order: PaymentOrder) {
    return {
      keyId: env.razorpayKeyId,
      razorpayOrderId: order.razorpayOrderId,
      amount: amountInSubunits(order.totalAmount),
      currency: order.currency,
      orderId: order.id,
    };
  }

  async createOrder(user: AuthenticatedUser, body: CreateOrderBody) {
    const orderId = requiredString(body.orderId, 'orderId');
    if (!uuidPattern.test(orderId)) throw new HttpError(httpStatus.badRequest, 'Order ID is invalid');

    const order = await this.payments.getPaymentOrder(orderId, user.id);
    if (!order) throw new HttpError(httpStatus.notFound, 'Order not found');
    if (order.status !== 'PENDING' || !['PENDING', 'FAILED'].includes(order.paymentStatus)) {
      throw new HttpError(httpStatus.conflict, 'Order is not eligible for payment');
    }
    if (!order.approvalId) {
      const evaluation = await this.policies.evaluate(user, 'PURCHASE', Number(order.totalAmount), order.currency, order.merchantId);
      if (evaluation.decision !== 'ALLOW') throw new HttpError(httpStatus.conflict, evaluation.reason ?? 'Explicit approval is required before payment');
    }
    if (order.razorpayOrderId) {
      await this.audits.log({ user, buyerId: user.id, merchantId: order.merchantId, actorType: 'USER', action: 'PAYMENT_ORDER_CREATED', entityType: 'ORDER', entityId: order.id, context: { amount: Number(order.totalAmount), currency: order.currency }, explanation: 'Existing Razorpay test order returned for the persisted order total.' });
      return this.checkoutDetails(order);
    }

    const razorpayOrder = await this.razorpay().orders.create({
      amount: amountInSubunits(order.totalAmount),
      currency: order.currency,
      receipt: order.id,
    });
    const attached = await this.payments.attachRazorpayOrder(order.id, razorpayOrder.id);
    if (!attached) {
      const existing = await this.payments.getPaymentOrder(order.id, user.id);
      if (existing?.razorpayOrderId) return this.checkoutDetails(existing);
    }
    await this.audits.log({ user, buyerId: user.id, merchantId: order.merchantId, actorType: 'USER', action: 'PAYMENT_ORDER_CREATED', entityType: 'ORDER', entityId: order.id, context: { amount: Number(order.totalAmount), currency: order.currency }, explanation: 'Razorpay test order created from the persisted backend order total.' });
    return {
      keyId: env.razorpayKeyId,
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      orderId: order.id,
    };
  }

  async verify(user: AuthenticatedUser, body: VerifyBody) {
    if (env.razorpayMode !== 'test' || !env.razorpayKeySecret) throw new HttpError(httpStatus.internalServerError, 'Razorpay is not configured');
    const orderId = requiredString(body.orderId, 'orderId');
    const razorpayOrderId = requiredString(body.razorpayOrderId, 'razorpayOrderId');
    const razorpayPaymentId = requiredString(body.razorpayPaymentId, 'razorpayPaymentId');
    const razorpaySignature = requiredString(body.razorpaySignature, 'razorpaySignature');
    const order = await this.payments.getPaymentOrder(orderId, user.id);
    if (!order) throw new HttpError(httpStatus.notFound, 'Order not found');

    if (order.paymentStatus === 'PAID') {
      if (order.razorpayPaymentId === razorpayPaymentId) return { order };
      throw new HttpError(httpStatus.conflict, 'Order is already paid');
    }
    if (order.razorpayOrderId !== razorpayOrderId) {
      throw new HttpError(httpStatus.badRequest, 'Razorpay order does not match');
    }

    const expectedSignature = crypto
      .createHmac('sha256', env.razorpayKeySecret)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');
    const expected = Buffer.from(expectedSignature, 'utf8');
    const received = Buffer.from(razorpaySignature, 'utf8');
    if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) {
      await this.audits.log({ user, buyerId: user.id, merchantId: order.merchantId, actorType: 'USER', action: 'PAYMENT_VERIFICATION_FAILED', entityType: 'ORDER', entityId: order.id, context: { razorpayOrderId }, decision: 'FAILED', explanation: 'Payment verification was rejected because the Razorpay signature was invalid.' });
      throw new HttpError(httpStatus.badRequest, 'Invalid payment signature');
    }

    const updated = await this.payments.markPaid(order.id, razorpayPaymentId, razorpaySignature);
    if (!updated) {
      const existing = await this.payments.getPaymentOrder(order.id, user.id);
      if (existing?.paymentStatus === 'PAID' && existing.razorpayPaymentId === razorpayPaymentId) return { order: existing };
      throw new HttpError(httpStatus.conflict, 'Payment state changed; please check order status');
    }
    await this.audits.log({ user, buyerId: user.id, merchantId: order.merchantId, actorType: 'USER', action: 'PAYMENT_VERIFIED', entityType: 'ORDER', entityId: order.id, context: { razorpayOrderId }, decision: 'PAID', explanation: 'Payment was marked paid only after Razorpay signature verification.' });
    return { order: updated };
  }

  async failure(user: AuthenticatedUser, body: FailureBody) {
    const orderId = requiredString(body.orderId, 'orderId');
    const razorpayOrderId = requiredString(body.razorpayOrderId, 'razorpayOrderId');
    const order = await this.payments.markFailed(orderId, user.id, razorpayOrderId);
    if (!order) {
      const existing = await this.payments.getPaymentOrder(orderId, user.id);
      if (!existing) throw new HttpError(httpStatus.notFound, 'Order not found');
      if (existing.paymentStatus === 'FAILED' && existing.razorpayOrderId === razorpayOrderId) return { order: existing };
      if (existing.paymentStatus === 'PAID') throw new HttpError(httpStatus.conflict, 'Order is already paid');
      throw new HttpError(httpStatus.conflict, 'Payment failure could not be applied');
    }
    await this.audits.log({ user, buyerId: user.id, merchantId: order.merchantId, actorType: 'USER', action: 'PAYMENT_FAILED', entityType: 'ORDER', entityId: order.id, context: { razorpayOrderId }, decision: 'FAILED', explanation: 'Payment failure was recorded for the buyer-owned order.' });
    return { order };
  }
}