import type { OrderStatus, PaymentStatus } from '../types/database.js';

export interface Order {
  id: string;
  buyerId: string;
  merchantId: string;
  approvalId?: string | null;
  totalAmount: string;
  currency: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  razorpayOrderId?: string | null;
  razorpayPaymentId?: string | null;
  razorpaySignature?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  unitPrice: string;
  createdAt: Date;
}
