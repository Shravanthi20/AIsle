import { AuditService } from '../audit/auditService.js';
import { PaymentService } from '../services/paymentService.js';
import { PaymentRepository } from '../repositories/paymentRepository.js';
import type { AuthenticatedUser } from '../types/auth.js';
import type { PaymentRetryResult, RecoveryStatus } from '../types/recovery.js';
import { HttpError, httpStatus } from '../utils/http.js';

export class FailureRecoveryService {
  constructor(private readonly payments = new PaymentService(), private readonly paymentRepository = new PaymentRepository(), private readonly audits = new AuditService()) {}

  async retryPayment(user: AuthenticatedUser, orderId: string): Promise<PaymentRetryResult> {
    this.requireBuyer(user);
    this.requireOrderId(orderId);
    const order = await this.paymentRepository.getPaymentOrder(orderId, user.id);
    if (!order) throw new HttpError(httpStatus.notFound, 'Order not found');
    if (order.status !== 'PENDING' || !['PENDING', 'FAILED'].includes(order.paymentStatus)) throw new HttpError(httpStatus.conflict, 'Order is not eligible for payment retry');
    await this.audits.log({ user, buyerId: user.id, merchantId: order.merchantId, actorType: 'USER', action: 'PAYMENT_RETRY', entityType: 'ORDER', entityId: order.id, context: { paymentStatus: order.paymentStatus }, explanation: 'Buyer requested a retry for the existing order; no new order was created.' });
    return this.payments.createOrder(user, { orderId });
  }

  async status(user: AuthenticatedUser, orderId: string): Promise<RecoveryStatus> {
    this.requireBuyer(user);
    this.requireOrderId(orderId);
    const order = await this.paymentRepository.getPaymentOrder(orderId, user.id);
    if (!order) throw new HttpError(httpStatus.notFound, 'Order not found');
    const canRetryPayment = order.status === 'PENDING' && ['PENDING', 'FAILED'].includes(order.paymentStatus);
    return { order, canRetryPayment, message: order.paymentStatus === 'FAILED' ? 'Payment failed. Your order has not been confirmed. You can retry payment.' : order.paymentStatus === 'PAID' ? 'Payment confirmed.' : 'Payment is pending.' };
  }

  private requireBuyer(user: AuthenticatedUser): void { if (user.role !== 'BUYER') throw new HttpError(httpStatus.forbidden, 'Buyer access required'); }
  private requireOrderId(orderId: string): void { if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(orderId)) throw new HttpError(httpStatus.badRequest, 'Order ID is invalid'); }
}