import type { AuthenticatedUser } from '../types/auth.js';
import type { GrowthOpportunity } from '../types/commerceIntelligence.js';
import { AgentCatalogService } from './agentCatalogService.js';
import { CommerceContextService } from './commerceContextService.js';
import { NextBestActionService } from './nextBestActionService.js';
import { MerchantRepository } from '../repositories/merchantRepository.js';
import { HttpError, httpStatus } from '../utils/http.js';

export class GrowthOpportunityService {
  constructor(private readonly catalog = new AgentCatalogService(), private readonly context = new CommerceContextService(), private readonly actions = new NextBestActionService(), private readonly merchants = new MerchantRepository()) {}

  async list(user: AuthenticatedUser, productId?: string): Promise<GrowthOpportunity[]> {
    if (user.role !== 'MERCHANT') throw new HttpError(httpStatus.forbidden, 'Merchant access required');
    const merchant = await this.merchants.getMerchantByUserId(user.id);
    if (!merchant) throw new HttpError(httpStatus.forbidden, 'Merchant profile not found');
    const products = (await this.catalog.list()).filter((product) => product.merchant_id === merchant.id && (!productId || product.product_id === productId));
    if (productId && !products.length) throw new HttpError(httpStatus.notFound, 'Product not found for this merchant');
    const opportunities: GrowthOpportunity[] = [];
    for (const product of products.slice(0, 25)) {
      const next = await this.actions.decide({ product, trigger: 'Product performance or customer product interaction' });
      if (next.action !== 'DO_NOTHING') opportunities.push(this.actions.opportunity(next, undefined, merchant.id));
    }
    return opportunities.sort((left, right) => right.opportunityScore - left.opportunityScore);
  }
}
