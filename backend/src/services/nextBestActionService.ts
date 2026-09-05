import type { AgentCatalogProduct } from '../types/agentCatalog.js';
import type { CustomerContext, GrowthOpportunity, NextBestAction } from '../types/commerceIntelligence.js';
import { CrossSellService } from './crossSellService.js';
import { UpsellService } from './upsellService.js';

export class NextBestActionService {
  constructor(private readonly upsells = new UpsellService(), private readonly crossSells = new CrossSellService()) {}

  async decide(input: { product?: AgentCatalogProduct; customer?: CustomerContext; trigger?: string }): Promise<NextBestAction> {
    if (!input.product) return { action: 'DO_NOTHING', products: [], opportunityScore: 0, confidence: 0.9, trigger: input.trigger ?? 'No product context', reason: 'There is not enough product context to make a relevant growth recommendation.', requiresApproval: false };
    const [upsell, crossSell] = await Promise.all([this.upsells.recommend({ product: input.product, customer: input.customer, limit: 1 }), this.crossSells.recommend({ product: input.product, customer: input.customer, limit: 1 })]);
    const bestUpsell = upsell[0]; const bestCrossSell = crossSell[0];
    if (!bestUpsell && !bestCrossSell) return { action: 'DO_NOTHING', products: [], opportunityScore: 0, confidence: 0.7, trigger: input.trigger ?? 'Product interaction', reason: 'No relevant, available upgrade or complementary product was found.', requiresApproval: false };
    if ((bestUpsell?.score ?? 0) >= (bestCrossSell?.score ?? 0)) return { action: 'UPSELL', products: [bestUpsell!.product], opportunityScore: bestUpsell!.score, confidence: bestUpsell!.confidence, trigger: input.trigger ?? 'Product interaction', reason: bestUpsell!.reason, requiresApproval: false };
    return { action: 'CROSS_SELL', products: [bestCrossSell!.product], opportunityScore: bestCrossSell!.score, confidence: bestCrossSell!.confidence, trigger: input.trigger ?? 'Product interaction', reason: bestCrossSell!.reason, requiresApproval: false };
  }

  opportunity(action: NextBestAction, customerId?: string, merchantId?: string): GrowthOpportunity {
    return { customerId, merchantId, trigger: action.trigger, actionType: action.action === 'UPSELL' || action.action === 'CROSS_SELL' ? action.action : 'RECOMMEND', products: action.products, customerValue: ['Relevant product fit', 'Available now'], growthValue: ['Potential incremental order value'], opportunityScore: action.opportunityScore, confidence: action.confidence, reason: action.reason, requiresApproval: action.requiresApproval };
  }
}
