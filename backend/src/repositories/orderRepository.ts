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
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  razorpay_signature: string | null;
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

export interface CheckoutItem {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: string;
  currency: string;
  subtotal: string;
}

export interface CheckoutResult {
  order: Order;
  items: CheckoutItem[];
}

export class CheckoutConflictError extends Error {}

function mapOrder(record: OrderRecord): Order {
  return {
    id: record.id,
    buyerId: record.buyer_id,
    merchantId: record.merchant_id,
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
  async checkout(buyerId: string): Promise<CheckoutResult | null> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const cartResult = await client.query<{
        cart_id: string;
        product_id: string;
        quantity: number;
        name: string;
        price: string;
        currency: string;
        stock: number;
        status: string;
        merchant_id: string;
      }>(
        `
          SELECT c.id AS cart_id, ci.product_id, ci.quantity, p.name,
            p.price, p.currency, p.stock, p.status, p.merchant_id
          FROM carts c
          JOIN cart_items ci ON ci.cart_id = c.id
          JOIN products p ON p.id = ci.product_id
          WHERE c.buyer_id = $1
          ORDER BY ci.created_at ASC
          FOR UPDATE OF p, ci
        `,
        [buyerId],
      );
      if (!cartResult.rows.length) {
        await client.query('ROLLBACK');
        return null;
      }
      const rows = cartResult.rows;
      const first = rows[0] as (typeof rows)[number];
      if (rows.some((row) => row.status !== 'ACTIVE')) {
        throw new CheckoutConflictError('A product in your cart is no longer active');
      }
      if (rows.some((row) => row.quantity > row.stock)) {
        throw new CheckoutConflictError('A product in your cart does not have enough stock');
      }
      const merchantIds = new Set(rows.map((row) => row.merchant_id));
      if (merchantIds.size !== 1) {
        throw new CheckoutConflictError('Cart items must belong to one merchant per checkout');
      }
      const items = rows.map((row) => ({
        productId: row.product_id,
        name: row.name,
        quantity: row.quantity,
        unitPrice: row.price,
        currency: row.currency,
        subtotal: (Number(row.price) * row.quantity).toFixed(2),
      }));
      const currency = first.currency;
      const totalAmount = items
        .reduce((total, item) => total + Number(item.subtotal), 0)
        .toFixed(2);
      const orderResult = await client.query<OrderRecord>(
        `
          INSERT INTO orders (buyer_id, merchant_id, total_amount, currency, status, payment_status)
          VALUES ($1, $2, $3, $4, 'PENDING', 'PENDING')
          RETURNING id, buyer_id, merchant_id, total_amount, currency, status, payment_status, razorpay_order_id, razorpay_payment_id, razorpay_signature, created_at, updated_at
        `,
        [buyerId, first.merchant_id, totalAmount, currency],
      );
      const order = mapOrder(orderResult.rows[0] as OrderRecord);
      for (const item of items) {
        await client.query(
          'INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES ($1, $2, $3, $4)',
          [order.id, item.productId, item.quantity, item.unitPrice],
        );
      }
      await client.query('DELETE FROM cart_items WHERE cart_id = $1', [first.cart_id]);
      await client.query('COMMIT');
      return { order, items };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  async createOrder(input: CreateOrderInput): Promise<Order> {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      const orderResult = await client.query<OrderRecord>(
        `
          INSERT INTO orders (buyer_id, merchant_id, total_amount, currency)
          VALUES ($1, $2, $3, $4)
          RETURNING id, buyer_id, merchant_id, total_amount, currency, status, payment_status, razorpay_order_id, razorpay_payment_id, razorpay_signature, created_at, updated_at
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
        SELECT id, buyer_id, merchant_id, total_amount, currency, status, payment_status, razorpay_order_id, razorpay_payment_id, razorpay_signature, created_at, updated_at
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
        SELECT id, buyer_id, merchant_id, total_amount, currency, status, payment_status, razorpay_order_id, razorpay_payment_id, razorpay_signature, created_at, updated_at
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
        SELECT id, buyer_id, merchant_id, total_amount, currency, status, payment_status, razorpay_order_id, razorpay_payment_id, razorpay_signature, created_at, updated_at
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
        RETURNING id, buyer_id, merchant_id, total_amount, currency, status, payment_status, razorpay_order_id, razorpay_payment_id, razorpay_signature, created_at, updated_at
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
        RETURNING id, buyer_id, merchant_id, total_amount, currency, status, payment_status, razorpay_order_id, razorpay_payment_id, razorpay_signature, created_at, updated_at
      `,
      [id, paymentStatus],
    );

    return result.rows[0] ? mapOrder(result.rows[0]) : null;
  }
}
