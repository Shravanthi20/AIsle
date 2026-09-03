import { MerchantRepository } from '../repositories/merchantRepository.js';
import type { Product } from '../models/product.js';
import type { AuthenticatedUser } from '../types/auth.js';
import type { MerchantAnalytics, ProductPerformance } from '../types/merchantAnalytics.js';
import { HttpError, httpStatus } from '../utils/http.js';
import { OrderService } from './orderService.js';
import { ProductService } from './productService.js';

type MerchantOrder = NonNullable<Awaited<ReturnType<OrderService['list']>>[number]>;

export class MerchantAnalyticsService {
  constructor(
    private readonly products = new ProductService(),
    private readonly orders = new OrderService(),
    private readonly merchants = new MerchantRepository(),
  ) {}

  async get(user: AuthenticatedUser): Promise<MerchantAnalytics> {
    if (user.role !== 'MERCHANT') throw new HttpError(httpStatus.forbidden, 'Merchant access required');
    const merchant = await this.merchants.getMerchantByUserId(user.id);
    if (!merchant) throw new HttpError(httpStatus.forbidden, 'Merchant profile not found');
    const [products, listedOrders] = await Promise.all([this.products.list(user), this.orders.list(user)]);
    const orders = listedOrders.filter((order): order is MerchantOrder => order !== null);
    const paidOrders = orders.filter((order) => order.paymentStatus === 'PAID');
    const currency = paidOrders.length && new Set(paidOrders.map((order) => order.currency)).size === 1
      ? paidOrders[0]?.currency ?? null
      : null;
    const revenue = paidOrders.reduce((total, order) => total + Number(order.totalAmount), 0);
    const performance = this.performance(products, paidOrders);

    return {
      totalOrders: orders.length,
      paidOrders: paidOrders.length,
      revenue,
      currency,
      topSellingProducts: [...performance].sort((left, right) => right.unitsSold - left.unitsSold || right.revenue - left.revenue).slice(0, 5),
      lowStockProducts: products.filter((product) => product.status === 'ACTIVE' && product.stock < 5),
      inactiveProducts: products.filter((product) => product.status === 'INACTIVE'),
      underperformingProducts: performance.filter((item) => item.status === 'ACTIVE' && item.unitsSold === 0),
      productPerformance: performance,
    };
  }

  private performance(products: Product[], orders: MerchantOrder[]): ProductPerformance[] {
    const sales = new Map<string, { unitsSold: number; revenue: number; orderIds: Set<string> }>();
    for (const order of orders) {
      for (const item of order.items ?? []) {
        const current = sales.get(item.productId) ?? { unitsSold: 0, revenue: 0, orderIds: new Set<string>() };
        current.unitsSold += item.quantity;
        current.revenue += Number(item.unitPrice) * item.quantity;
        current.orderIds.add(order.id);
        sales.set(item.productId, current);
      }
    }
    return products.map((product) => {
      const sale = sales.get(product.id);
      return {
        productId: product.id,
        name: product.name,
        category: product.category,
        status: product.status,
        stock: product.stock,
        currency: product.currency,
        unitsSold: sale?.unitsSold ?? 0,
        revenue: sale?.revenue ?? 0,
        orderCount: sale?.orderIds.size ?? 0,
      };
    });
  }
}