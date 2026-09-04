import { pool } from '../database/db.js';
import type { Order } from '../models/order.js';
import type { OrderStatus, PaymentStatus } from '../types/database.js';

interface PaymentOrderRecord {
  id: string;
  buyer_id: string;
  merchant_id: string;
  approval_id: string | null;
  total_amount: string;
  currency: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  razorpay_signature: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface PaymentOrder extends Order {
  razorpayOrderId: string | null;
  razorpayPaymentId: string | null;
  razorpaySignature: string | null;
}

function mapPaymentOrder(record: PaymentOrderRecord): PaymentOrder {
  return {
    id: record.id,
    buyerId: record.buyer_id,
    merchantId: record.merchant_id,
    approvalId: record.approval_id,
    totalAmount: record.total_amount,
    currency: record.currency,
    status: record.status,
    paymentStatus: record.payment_status,
    razorpayOrderId: record.razorpay_order_id,
    razorpayPaymentId: record.razorpay_payment_id,
    razorpaySignature: record.razorpay_signature,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

export class PaymentRepository {
  async getPaymentOrder(id: string, buyerId: string): Promise<PaymentOrder | null> {
    const result = await pool.query<PaymentOrderRecord>(
      `SELECT id, buyer_id, merchant_id, approval_id, total_amount, currency, status, payment_status,
        razorpay_order_id, razorpay_payment_id, razorpay_signature, created_at, updated_at
       FROM orders WHERE id = $1 AND buyer_id = $2`,
      [id, buyerId],
    );
    return result.rows[0] ? mapPaymentOrder(result.rows[0]) : null;
  }

  async attachRazorpayOrder(id: string, razorpayOrderId: string): Promise<boolean> {
    const result = await pool.query(
      `UPDATE orders SET razorpay_order_id = $2
       WHERE id = $1 AND payment_status IN ('PENDING', 'FAILED') AND razorpay_order_id IS NULL`,
      [id, razorpayOrderId],
    );
    return (result.rowCount ?? 0) > 0;
  }

  async markPaid(id: string, razorpayPaymentId: string, razorpaySignature: string): Promise<PaymentOrder | null> {
    const result = await pool.query<PaymentOrderRecord>(
      `UPDATE orders SET payment_status = 'PAID', status = 'CONFIRMED',
        razorpay_payment_id = $2, razorpay_signature = $3
       WHERE id = $1 AND payment_status <> 'PAID'
       RETURNING id, buyer_id, merchant_id, total_amount, currency, status, payment_status,
         razorpay_order_id, razorpay_payment_id, razorpay_signature, created_at, updated_at`,
      [id, razorpayPaymentId, razorpaySignature],
    );
    return result.rows[0] ? mapPaymentOrder(result.rows[0]) : null;
  }

  async markFailed(id: string, buyerId: string, razorpayOrderId: string): Promise<PaymentOrder | null> {
    const result = await pool.query<PaymentOrderRecord>(
      `UPDATE orders SET payment_status = 'FAILED'
      WHERE id = $1 AND buyer_id = $2 AND razorpay_order_id = $3 AND payment_status <> 'PAID'
       RETURNING id, buyer_id, merchant_id, total_amount, currency, status, payment_status,
         razorpay_order_id, razorpay_payment_id, razorpay_signature, created_at, updated_at`,
      [id, buyerId, razorpayOrderId],
    );
    return result.rows[0] ? mapPaymentOrder(result.rows[0]) : null;
  }
}