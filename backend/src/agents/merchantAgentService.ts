import { MerchantAnalyticsTool } from './tools/merchantAnalyticsTool.js';
import { MerchantProductsTool } from './tools/merchantProductsTool.js';
import { ProductPerformanceTool } from './tools/productPerformanceTool.js';
import type { Product } from '../models/product.js';
import type { AuthenticatedUser } from '../types/auth.js';
import type { MerchantAnalytics, ProductPerformance } from '../types/merchantAnalytics.js';
import { HttpError, httpStatus } from '../utils/http.js';

export interface MerchantAgentResponse {
  answer: string;
  relevantProducts: Product[];
  relevantData: MerchantAnalytics;
  suggestedActions: string[];
}

export class MerchantAgentService {
  constructor(
    private readonly analytics = new MerchantAnalyticsTool(),
    private readonly products = new MerchantProductsTool(),
    private readonly performance = new ProductPerformanceTool(),
  ) {}

  async chat(user: AuthenticatedUser, message: string): Promise<MerchantAgentResponse> {
    if (user.role !== 'MERCHANT') throw new HttpError(httpStatus.forbidden, 'Merchant access required');
    if (typeof message !== 'string' || !message.trim()) throw new HttpError(httpStatus.badRequest, 'Message is required');
    const text = message.trim().toLowerCase();
    const data = await this.analytics.execute(user);
    const catalog = await this.products.execute(user);
    const performance = /perform|sell|promot|improv|underperform/.test(text)
      ? await this.performance.execute(user)
      : data.productPerformance;
    const relevantProducts = this.relevantProducts(catalog, data, performance.length ? performance : data.productPerformance.length ? data.productPerformance : data.topSellingProducts, text);
    const suggestedActions = this.actions(data, text);

    return {
      answer: this.answer(data, relevantProducts, text),
      relevantProducts,
      relevantData: data,
      suggestedActions,
    };
  }

  private relevantProducts(products: Product[], data: MerchantAnalytics, performance: ProductPerformance[], text: string) {
    const requested = /low stock|stock/.test(text)
      ? data.lowStockProducts.map((product) => product.id)
      : /inactive/.test(text)
        ? data.inactiveProducts.map((product) => product.id)
        : /underperform/.test(text)
          ? data.underperformingProducts.map((product) => product.productId)
          : performance.slice(0, 5).map((item) => item.productId);
    return products.filter((product) => requested.includes(product.id));
  }

  private answer(data: MerchantAnalytics, products: Product[], text: string): string {
    if (/low stock|stock/.test(text)) return products.length ? `You have ${products.length} active product${products.length === 1 ? '' : 's'} below the low-stock threshold.` : 'No active products are currently below the low-stock threshold.';
    if (/underperform/.test(text)) return products.length ? `${products.length} active product${products.length === 1 ? ' is' : 's are'} currently underperforming with no paid-order units sold.` : 'All active products have recorded at least one unit from a paid order.';
    if (/sell|promot/.test(text) && data.topSellingProducts[0]) return `${data.topSellingProducts[0].name} is your top-selling product with ${data.topSellingProducts[0].unitsSold} unit${data.topSellingProducts[0].unitsSold === 1 ? '' : 's'} sold. The ranking is based on paid orders.`;
    return `Your store has ${data.totalOrders} order${data.totalOrders === 1 ? '' : 's'} and ${data.currency ?? 'mixed-currency'} paid-order revenue of ${data.revenue.toLocaleString('en-IN')}. I used your catalog and order data to identify the products and actions below.`;
  }

  private actions(data: MerchantAnalytics, text: string): string[] {
    const actions: string[] = [];
    if (data.lowStockProducts.length) actions.push(`Review replenishment for ${data.lowStockProducts.length} low-stock active product${data.lowStockProducts.length === 1 ? '' : 's'}.`);
    if (data.underperformingProducts.length) actions.push(`Review descriptions, pricing, and promotion for ${data.underperformingProducts.length} active product${data.underperformingProducts.length === 1 ? '' : 's'} with no paid-order sales.`);
    if (data.topSellingProducts.length && (/promot|increase|idea|sell/.test(text) || !actions.length)) actions.push(`Consider promoting ${data.topSellingProducts[0]?.name}, your current top seller.`);
    return actions.length ? actions : ['Review product performance regularly and use paid-order results to guide promotion decisions.'];
  }
}