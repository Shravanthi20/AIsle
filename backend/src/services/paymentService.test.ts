import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PaymentService } from './paymentService.js';
import type { AuthenticatedUser } from '../types/auth.js';

const buyer: AuthenticatedUser = { id: 'buyer-1', name: 'Buyer', email: 'buyer@test', role: 'BUYER' };
const order = { id: 'order-1', buyerId: buyer.id, merchantId: 'merchant-1', totalAmount: '1500.00', currency: 'INR', status: 'PENDING' as const, paymentStatus: 'PENDING' as const, razorpayOrderId: 'rzp-order-1', razorpayPaymentId: null, razorpaySignature: null, createdAt: new Date(), updatedAt: new Date() };

test('invalid payment signature is rejected without marking the order paid', async () => {
  let markedPaid = false;
  const actions: string[] = [];
  const service = new PaymentService(
    { getPaymentOrder: async () => order, markPaid: async () => { markedPaid = true; return null; } } as never,
    {} as never,
    { log: async (input: { action: string }) => { actions.push(input.action); return null; } } as never,
  );
  await assert.rejects(service.verify(buyer, { orderId: order.id, razorpayOrderId: order.razorpayOrderId, razorpayPaymentId: 'pay-1', razorpaySignature: 'invalid' }), { message: 'Invalid payment signature' });
  assert.equal(markedPaid, false);
  assert.ok(actions.includes('PAYMENT_VERIFICATION_FAILED'));
});

test('repeated payment failure callback is idempotent', async () => {
  const failed = { ...order, paymentStatus: 'FAILED' as const };
  const service = new PaymentService(
    { markFailed: async () => null, getPaymentOrder: async () => failed } as never,
    {} as never,
    { log: async () => null } as never,
  );
  const result = await service.failure(buyer, { orderId: order.id, razorpayOrderId: order.razorpayOrderId });
  assert.equal(result.order.id, order.id);
  assert.equal(result.order.paymentStatus, 'FAILED');
});