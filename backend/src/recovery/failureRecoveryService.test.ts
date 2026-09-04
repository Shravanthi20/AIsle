import assert from 'node:assert/strict';
import { test } from 'node:test';
import { FailureRecoveryService } from './failureRecoveryService.js';
import type { AuthenticatedUser } from '../types/auth.js';

const buyer: AuthenticatedUser = { id: 'buyer-1', name: 'Buyer', email: 'buyer@test', role: 'BUYER' };
const merchant: AuthenticatedUser = { id: 'merchant-1', name: 'Merchant', email: 'merchant@test', role: 'MERCHANT' };
const failedOrder = { id: '11111111-1111-4111-8111-111111111111', buyerId: buyer.id, merchantId: 'store-1', totalAmount: '6000.00', currency: 'INR', status: 'PENDING' as const, paymentStatus: 'FAILED' as const, razorpayOrderId: 'rzp-order-1', razorpayPaymentId: null, razorpaySignature: null, createdAt: new Date(), updatedAt: new Date() };

test('failed payment remains retryable and retry reuses the existing order', async () => {
  let received = '';
  const service = new FailureRecoveryService(
    { createOrder: async (_user: AuthenticatedUser, body: { orderId: string }) => { received = body.orderId; return { keyId: 'test', razorpayOrderId: 'rzp-order-2', amount: 600000, currency: 'INR', orderId: body.orderId }; } } as never,
    { getPaymentOrder: async () => failedOrder } as never,
    { log: async () => null } as never,
  );
  const result = await service.retryPayment(buyer, failedOrder.id);
  assert.equal(received, failedOrder.id);
  assert.equal(result.orderId, failedOrder.id);
  const status = await service.status(buyer, failedOrder.id);
  assert.equal(status.canRetryPayment, true);
  assert.match(status.message, /not been confirmed/);
});

test('recovery APIs reject non-buyers and isolate unknown orders', async () => {
  const service = new FailureRecoveryService({} as never, { getPaymentOrder: async () => null } as never, {} as never);
  await assert.rejects(service.status(merchant, 'order-1'), { message: 'Buyer access required' });
  await assert.rejects(service.status(buyer, 'malformed'), { message: 'Order ID is invalid' });
  await assert.rejects(service.status(buyer, '22222222-2222-4222-8222-222222222222'), { message: 'Order not found' });
});