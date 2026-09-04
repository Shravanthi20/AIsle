import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PaymentService } from '../services/paymentService.js';
import type { AuthenticatedUser } from '../types/auth.js';

test('payment creation cannot bypass a required purchase approval', async () => {
  const buyer: AuthenticatedUser = { id: 'buyer-1', name: 'Buyer', email: 'buyer@test', role: 'BUYER' };
  const service = new PaymentService(
    { getPaymentOrder: async () => ({ id: 'order-1', buyerId: buyer.id, merchantId: 'merchant-1', approvalId: null, totalAmount: '15000.00', currency: 'INR', status: 'PENDING', paymentStatus: 'PENDING', razorpayOrderId: null, razorpayPaymentId: null, razorpaySignature: null, createdAt: new Date(), updatedAt: new Date() }) } as never,
    { evaluate: async () => ({ decision: 'REQUIRES_APPROVAL' }) } as never,
  );
  await assert.rejects(service.createOrder(buyer, { orderId: '00000000-0000-4000-8000-000000000001' }), { message: 'Explicit approval is required before payment' });
});