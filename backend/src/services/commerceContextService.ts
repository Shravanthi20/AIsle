import { AgentCatalogService } from './agentCatalogService.js';
import type { AgentCatalogProduct } from '../types/agentCatalog.js';
import type { AuthenticatedUser } from '../types/auth.js';
import type { CustomerContext, MerchantContext, ProductIntelligence } from '../types/commerceIntelligence.js';
import { AnalyticsService } from '../analytics/analyticsService.js';
import { MerchantRepository } from '../repositories/merchantRepository.js';

export class CommerceContextService {
  constructor(
    private readonly catalog = new AgentCatalogService(),
    private readonly analytics = new AnalyticsService(),
    private readonly merchants = new MerchantRepository(),
  ) {}

  async products(): Promise<ProductIntelligence[]> {
    const products = await this.catalog.list();
    return products.map((product) => this.product(product));
  }

  async customer(user: AuthenticatedUser): Promise<CustomerContext> {
    if (user.role !== 'BUYER') return { purchasedProductIds: [], preferredCategories: [], preferredUseCases: [] };
    const analytics = await this.analytics.buyer(user, {});
    const categories = new Set<string>();
    return {
      customerId: user.id,
      purchasedProductIds: analytics.mostPurchasedProducts.map((item) => item.productId),
      preferredCategories: [...categories],
      preferredUseCases: [],
      averageOrderValue: analytics.totalOrders ? Number(analytics.totalSpending) / analytics.totalOrders : undefined,
      currency: analytics.currency ?? undefined,
    };
  }

  async merchant(user: AuthenticatedUser): Promise<MerchantContext> {
    const merchant = await this.merchants.getMerchantByUserId(user.id);
    if (!merchant) throw new Error('Merchant profile not found');
    const products = await this.catalog.list();
    const own = products.filter((product) => product.merchant_id === merchant.id);
    return {
      merchantId: merchant.id,
      productCount: own.length,
      activeProductCount: own.filter((product) => product.status === 'ACTIVE').length,
      currency: own[0]?.currency,
    };
  }

  product(product: AgentCatalogProduct): ProductIntelligence {
    const attributes = Object.entries(product.attributes).flatMap(([key, value]) => [key.toLowerCase(), value.toLowerCase()]);
    const quality = Object.entries(product.attributes).some(([key]) => /quality|rating|premium|tier|warranty/i.test(key)) ? 0.8 : 0.5;
    return { product, qualityScore: quality, useCases: product.use_cases, attributeTokens: attributes };
  }
}
