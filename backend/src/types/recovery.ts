import type { Order } from '../models/order.js';

export interface RecoveryStatus {
  order: Order;
  canRetryPayment: boolean;
  message: string;
}

export interface PaymentRetryResult {
  keyId: string | undefined;
  razorpayOrderId: string | null;
  amount: number | string;
  currency: string;
  orderId: string;
}