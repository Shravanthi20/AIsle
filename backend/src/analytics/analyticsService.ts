import { MerchantRepository } from '../repositories/merchantRepository.js';
import { AnalyticsRepository } from '../repositories/analyticsRepository.js';
import type { AuthenticatedUser } from '../types/auth.js';
import type { AnalyticsDateFilter, BuyerAnalytics, BuyerOrderAnalytics, MerchantAnalytics, MerchantOrderAnalytics, ProductSales } from '../types/analytics.js';
import { HttpError, httpStatus } from '../utils/http.js';

export class AnalyticsService {
  constructor(private readonly repository = new AnalyticsRepository(), private readonly merchants = new MerchantRepository()) {}

  private dates(filter: AnalyticsDateFilter): { startDate: string | null; endDate: string | null } {
    for (const value of [filter.startDate, filter.endDate]) if (value !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new HttpError(httpStatus.badRequest, 'Dates must use YYYY-MM-DD format');
    if (filter.startDate && filter.endDate && filter.startDate > filter.endDate) throw new HttpError(httpStatus.badRequest, 'startDate must be before or equal to endDate');
    return { startDate: filter.startDate ?? null, endDate: filter.endDate ?? null };
  }

  private async merchantId(user: AuthenticatedUser): Promise<string> {
    if (user.role !== 'MERCHANT') throw new HttpError(httpStatus.forbidden, 'Merchant access required');
    const merchant = await this.merchants.getMerchantByUserId(user.id);
    if (!merchant) throw new HttpError(httpStatus.forbidden, 'Merchant profile not found');
    return merchant.id;
  }

  async merchant(user: AuthenticatedUser, filter: AnalyticsDateFilter): Promise<MerchantAnalytics> {
    const merchantId = await this.merchantId(user); const dates = this.dates(filter);
    const [summary, products, trends] = await Promise.all([this.repository.merchantSummary(merchantId, dates), this.repository.merchantProducts(merchantId, dates), this.repository.merchantTrends(merchantId, dates)]);
    return { ...summary, topSellingProducts: products.filter((item) => item.quantitySold > 0).slice(0, 5), lowStockProducts: products.filter((item) => item.status === 'ACTIVE' && item.stock < 5), inactiveProducts: products.filter((item) => item.status === 'INACTIVE'), trends };
  }
  async merchantProducts(user: AuthenticatedUser, filter: AnalyticsDateFilter): Promise<ProductSales[]> { return this.repository.merchantProducts(await this.merchantId(user), this.dates(filter)); }
  async merchantOrders(user: AuthenticatedUser, filter: AnalyticsDateFilter): Promise<MerchantOrderAnalytics[]> { return this.repository.merchantOrders(await this.merchantId(user), this.dates(filter)); }
  async buyer(user: AuthenticatedUser, filter: AnalyticsDateFilter): Promise<BuyerAnalytics> {
    if (user.role !== 'BUYER') throw new HttpError(httpStatus.forbidden, 'Buyer access required');
    const dates = this.dates(filter); const [summary, products, trends] = await Promise.all([this.repository.buyerSummary(user.id, dates), this.repository.buyerProducts(user.id, dates), this.repository.buyerTrends(user.id, dates)]);
    return { ...summary, mostPurchasedProducts: products.slice(0, 5), trends };
  }
  async buyerOrders(user: AuthenticatedUser, filter: AnalyticsDateFilter): Promise<BuyerOrderAnalytics[]> { if (user.role !== 'BUYER') throw new HttpError(httpStatus.forbidden, 'Buyer access required'); return this.repository.buyerOrders(user.id, this.dates(filter)); }
}