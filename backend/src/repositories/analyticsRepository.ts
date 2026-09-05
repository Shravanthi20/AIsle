import { pool } from '../database/db.js';
import type { BuyerAnalytics, BuyerOrderAnalytics, BuyerProductPurchase, MerchantAnalytics, MerchantOrderAnalytics, ProductSales, TrendPoint } from '../types/analytics.js';

interface DateParams { startDate: string | null; endDate: string | null; }

const dateWhere = (column: string, start = 2, end = 3) =>
  ` AND ($${start}::date IS NULL OR ${column} >= $${start}::date)
    AND ($${end}::date IS NULL OR ${column} < ($${end}::date + INTERVAL '1 day'))`;

function trend(row: { date: string; orders: string; revenue: string }): TrendPoint {
  return { date: row.date, orders: Number(row.orders), revenue: row.revenue };
}

export class AnalyticsRepository {
  async merchantSummary(merchantId: string, dates: DateParams): Promise<MerchantAnalytics> {
    const result = await pool.query<{
      total_orders: string; confirmed_completed_orders: string; revenue: string | null;
      average_order_value: string | null; currency: string | null; currency_count: string;
    }>(
      `SELECT COUNT(*)::text AS total_orders,
        COUNT(*) FILTER (WHERE payment_status = 'PAID' AND status IN ('CONFIRMED', 'COMPLETED'))::text AS confirmed_completed_orders,
        COALESCE(SUM(total_amount) FILTER (WHERE payment_status = 'PAID' AND status IN ('CONFIRMED', 'COMPLETED')), 0)::numeric(14,2)::text AS revenue,
        COALESCE(AVG(total_amount) FILTER (WHERE payment_status = 'PAID' AND status IN ('CONFIRMED', 'COMPLETED')), 0)::numeric(14,2)::text AS average_order_value,
        MIN(currency) FILTER (WHERE payment_status = 'PAID' AND status IN ('CONFIRMED', 'COMPLETED')) AS currency,
        COUNT(DISTINCT currency) FILTER (WHERE payment_status = 'PAID' AND status IN ('CONFIRMED', 'COMPLETED'))::text AS currency_count
       FROM orders WHERE merchant_id = $1${dateWhere('created_at')}`,
      [merchantId, dates.startDate, dates.endDate],
    );
    const row = result.rows[0] as (typeof result.rows)[number];
    return {
      totalOrders: Number(row.total_orders),
      confirmedCompletedOrders: Number(row.confirmed_completed_orders),
      revenue: row.revenue ?? '0.00',
      averageOrderValue: row.average_order_value ?? '0.00',
      currency: row.currency_count === '1' ? row.currency : null,
      topSellingProducts: [], lowStockProducts: [], inactiveProducts: [], trends: [], forecast: [],
    };
  }

  async merchantProducts(merchantId: string, dates: DateParams): Promise<ProductSales[]> {
    const result = await pool.query<ProductSales & { product_id: string; quantity_sold: string; revenue: string }>(
      `SELECT p.id AS product_id, p.name, p.category, p.status, p.stock, p.price::text, p.currency,
        COALESCE(SUM(oi.quantity) FILTER (WHERE o.payment_status = 'PAID' AND o.status IN ('CONFIRMED', 'COMPLETED')), 0)::text AS quantity_sold,
        COALESCE(SUM(oi.quantity * oi.unit_price) FILTER (WHERE o.payment_status = 'PAID' AND o.status IN ('CONFIRMED', 'COMPLETED')), 0)::numeric(14,2)::text AS revenue
       FROM products p
       LEFT JOIN order_items oi ON oi.product_id = p.id
       LEFT JOIN orders o ON o.id = oi.order_id${dateWhere('o.created_at')}
       WHERE p.merchant_id = $1
       GROUP BY p.id ORDER BY quantity_sold DESC, p.name ASC`,
      [merchantId, dates.startDate, dates.endDate],
    );
    return result.rows.map((row) => ({ productId: row.product_id, name: row.name, category: row.category, status: row.status, stock: row.stock, price: row.price, currency: row.currency, quantitySold: Number(row.quantity_sold), revenue: row.revenue }));
  }

  async merchantOrders(merchantId: string, dates: DateParams): Promise<MerchantOrderAnalytics[]> {
    const result = await pool.query<MerchantOrderAnalytics & { created_at: Date; buyer_id: string; total_amount: string; payment_status: MerchantOrderAnalytics['paymentStatus'] }>(
      `SELECT id, buyer_id, total_amount::text, currency, status, payment_status, created_at
       FROM orders WHERE merchant_id = $1${dateWhere('created_at')} ORDER BY created_at DESC`,
      [merchantId, dates.startDate, dates.endDate],
    );
    return result.rows.map((row) => ({ id: row.id, buyerId: row.buyer_id, totalAmount: row.total_amount, currency: row.currency, status: row.status, paymentStatus: row.payment_status, createdAt: row.created_at }));
  }

  async merchantTrends(merchantId: string, dates: DateParams): Promise<TrendPoint[]> {
    const result = await pool.query<{ date: string; orders: string; revenue: string }>(
      `SELECT to_char(created_at::date, 'YYYY-MM-DD') AS date,
        COUNT(*) FILTER (WHERE payment_status = 'PAID' AND status IN ('CONFIRMED', 'COMPLETED'))::text AS orders,
        COALESCE(SUM(total_amount) FILTER (WHERE payment_status = 'PAID' AND status IN ('CONFIRMED', 'COMPLETED')), 0)::numeric(14,2)::text AS revenue
       FROM orders WHERE merchant_id = $1${dateWhere('created_at')}
       GROUP BY created_at::date ORDER BY created_at::date`,
      [merchantId, dates.startDate, dates.endDate],
    );
    return result.rows.map(trend);
  }

  async buyerSummary(buyerId: string, dates: DateParams): Promise<BuyerAnalytics> {
    const result = await pool.query<{ total_orders: string; spending: string; currency: string | null; currency_count: string }>(
      `SELECT COUNT(*) FILTER (WHERE payment_status = 'PAID' AND status IN ('CONFIRMED', 'COMPLETED'))::text AS total_orders,
        COALESCE(SUM(total_amount) FILTER (WHERE payment_status = 'PAID' AND status IN ('CONFIRMED', 'COMPLETED')), 0)::numeric(14,2)::text AS spending,
        MIN(currency) FILTER (WHERE payment_status = 'PAID' AND status IN ('CONFIRMED', 'COMPLETED')) AS currency,
        COUNT(DISTINCT currency) FILTER (WHERE payment_status = 'PAID' AND status IN ('CONFIRMED', 'COMPLETED'))::text AS currency_count
       FROM orders WHERE buyer_id = $1${dateWhere('created_at')}`,
      [buyerId, dates.startDate, dates.endDate],
    );
    const row = result.rows[0] as (typeof result.rows)[number];
    return { totalOrders: Number(row.total_orders), totalSpending: row.spending, currency: row.currency_count === '1' ? row.currency : null, mostPurchasedProducts: [], trends: [] };
  }

  async buyerProducts(buyerId: string, dates: DateParams): Promise<BuyerProductPurchase[]> {
    const result = await pool.query<{ product_id: string; name: string; quantity: string; spending: string; currency: string }>(
      `SELECT oi.product_id, p.name, SUM(oi.quantity)::text AS quantity,
        SUM(oi.quantity * oi.unit_price)::numeric(14,2)::text AS spending, o.currency
       FROM order_items oi JOIN orders o ON o.id = oi.order_id JOIN products p ON p.id = oi.product_id
       WHERE o.buyer_id = $1 AND o.payment_status = 'PAID' AND o.status IN ('CONFIRMED', 'COMPLETED')${dateWhere('o.created_at')}
       GROUP BY oi.product_id, p.name, o.currency ORDER BY SUM(oi.quantity) DESC, p.name ASC`,
      [buyerId, dates.startDate, dates.endDate],
    );
    return result.rows.map((row) => ({ productId: row.product_id, name: row.name, quantityPurchased: Number(row.quantity), spending: row.spending, currency: row.currency }));
  }

  async buyerOrders(buyerId: string, dates: DateParams): Promise<BuyerOrderAnalytics[]> {
    const result = await pool.query<BuyerOrderAnalytics & { created_at: Date; merchant_id: string; total_amount: string; payment_status: BuyerOrderAnalytics['paymentStatus'] }>(
      `SELECT id, merchant_id, total_amount::text, currency, status, payment_status, created_at
       FROM orders WHERE buyer_id = $1${dateWhere('created_at')} ORDER BY created_at DESC`,
      [buyerId, dates.startDate, dates.endDate],
    );
    return result.rows.map((row) => ({ id: row.id, merchantId: row.merchant_id, totalAmount: row.total_amount, currency: row.currency, status: row.status, paymentStatus: row.payment_status, createdAt: row.created_at }));
  }

  async buyerTrends(buyerId: string, dates: DateParams): Promise<TrendPoint[]> {
    const result = await pool.query<{ date: string; orders: string; revenue: string }>(
      `SELECT to_char(created_at::date, 'YYYY-MM-DD') AS date,
        COUNT(*) FILTER (WHERE payment_status = 'PAID' AND status IN ('CONFIRMED', 'COMPLETED'))::text AS orders,
        COALESCE(SUM(total_amount) FILTER (WHERE payment_status = 'PAID' AND status IN ('CONFIRMED', 'COMPLETED')), 0)::numeric(14,2)::text AS revenue
       FROM orders WHERE buyer_id = $1${dateWhere('created_at')}
       GROUP BY created_at::date ORDER BY created_at::date`,
      [buyerId, dates.startDate, dates.endDate],
    );
    return result.rows.map(trend);
  }
}