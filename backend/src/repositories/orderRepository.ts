import { pool } from '../database/db.js';
import type { Order, OrderItem } from '../models/order.js';
import type { OrderStatus, PaymentStatus } from '../types/database.js';

interface OrderRecord {
  id: string;
  buyer_id: string;
  merchant_id: string;
  total_amount: string;
  currency: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  created_at: Date;
  updated_at: Date;
}

interface OrderItemRecord {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price: string;
  created_at: Date;
}

interface CreateOrderItemInput {
  productId: string;
  quantity: number;
  unitPrice: string;
}

interface CreateOrderInput {
  buyerId: string;
  merchantId: string;
  totalAmount: string;
  currency?: string;
  items: CreateOrderItemInput[];
}

function mapOrder(record: OrderRecord): Order {
  return {
    id: record.id,
    buyerId: record.buyer_id,
    merchantId: record.merchant_id,
    totalAmount: record.total_amount,
    currency: record.currency,
    status: record.status,
    paymentStatus: record.payment_status,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

function mapOrderItem(record: OrderItemRecord): OrderItem {
  return {
    id: record.id,
    orderId: record.order_id,
    productId: record.product_id,
    quantity: record.quantity,
    unitPrice: record.unit_price,
    createdAt: record.created_at,
  };
}

export class OrderRepository {
  async createOrder(input: CreateOrderInput): Promise<Order> {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      const orderResult = await client.query<OrderRecord>(
        `
          INSERT INTO orders (buyer_id, merchant_id, total_amount, currency)
          VALUES ($1, $2, $3, $4)
          RETURNING id, buyer_id, merchant_id, total_amount, currency, status, payment_status, created_at, updated_at
        `,
        [input.buyerId, input.merchantId, input.totalAmount, input.currency ?? 'INR'],
      );
      const order = orderResult.rows[0] as OrderRecord;

      for (const item of input.items) {
        await client.query(
          `
            INSERT INTO order_items (order_id, product_id, quantity, unit_price)
            VALUES ($1, $2, $3, $4)
          `,
          [order.id, item.productId, item.quantity, item.unitPrice],
        );
      }

      await client.query('COMMIT');
      return mapOrder(order);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getOrderById(id: string): Promise<Order | null> {
    const result = await pool.query<OrderRecord>(
      `
        SELECT id, buyer_id, merchant_id, total_amount, currency, status, payment_status, created_at, updated_at
        FROM orders
        WHERE id = $1
      `,
      [id],
    );

    return result.rows[0] ? mapOrder(result.rows[0]) : null;
  }

  async getOrderItems(orderId: string): Promise<OrderItem[]> {
    const result = await pool.query<OrderItemRecord>(
      `
        SELECT id, order_id, product_id, quantity, unit_price, created_at
        FROM order_items
        WHERE order_id = $1
        ORDER BY created_at ASC
      `,
      [orderId],
    );

    return result.rows.map(mapOrderItem);
  }

  async getOrdersByBuyer(buyerId: string): Promise<Order[]> {
    const result = await pool.query<OrderRecord>(
      `
        SELECT id, buyer_id, merchant_id, total_amount, currency, status, payment_status, created_at, updated_at
        FROM orders
        WHERE buyer_id = $1
        ORDER BY created_at DESC
      `,
      [buyerId],
    );

    return result.rows.map(mapOrder);
  }

  async getOrdersByMerchant(merchantId: string): Promise<Order[]> {
    const result = await pool.query<OrderRecord>(
      `
        SELECT id, buyer_id, merchant_id, total_amount, currency, status, payment_status, created_at, updated_at
        FROM orders
        WHERE merchant_id = $1
        ORDER BY created_at DESC
      `,
      [merchantId],
    );

    return result.rows.map(mapOrder);
  }

  async updateOrderStatus(id: string, status: OrderStatus): Promise<Order | null> {
    const result = await pool.query<OrderRecord>(
      `
        UPDATE orders
        SET status = $2
        WHERE id = $1
        RETURNING id, buyer_id, merchant_id, total_amount, currency, status, payment_status, created_at, updated_at
      `,
      [id, status],
    );

    return result.rows[0] ? mapOrder(result.rows[0]) : null;
  }

  async updatePaymentStatus(id: string, paymentStatus: PaymentStatus): Promise<Order | null> {
    const result = await pool.query<OrderRecord>(
      `
        UPDATE orders
        SET payment_status = $2
        WHERE id = $1
        RETURNING id, buyer_id, merchant_id, total_amount, currency, status, payment_status, created_at, updated_at
      `,
      [id, paymentStatus],
    );

    return result.rows[0] ? mapOrder(result.rows[0]) : null;
  }
}
