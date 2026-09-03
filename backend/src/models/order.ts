import type { OrderStatus, PaymentStatus } from '../types/database.js';

export interface Order {
  id: string;
  buyerId: string;
  merchantId: string;
  totalAmount: string;
  currency: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
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
