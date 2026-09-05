import type { AgentCatalogProduct } from './agentCatalog.js';

export type RecommendationKind = 'RECOMMEND' | 'UPSELL' | 'CROSS_SELL';
export type GrowthAction = 'RECOMMEND' | 'UPSELL' | 'CROSS_SELL' | 'REENGAGE' | 'CREATE_CAMPAIGN' | 'ASK_CLARIFICATION' | 'REQUEST_APPROVAL' | 'DO_NOTHING';

export interface ShoppingIntent {
  query: string;
  category?: string;
  useCases: string[];
  mandatoryRequirements: string[];
  preferredRequirements: string[];
  budget?: number;
  budgetFlexibility: number;
  confidence: number;
}

export interface CustomerContext {
  customerId?: string;
  purchasedProductIds: string[];
  preferredCategories: string[];
  preferredUseCases: string[];
  averageOrderValue?: number;
  currency?: string;
}

export interface ProductIntelligence {
  product: AgentCatalogProduct;
  qualityScore: number;
  useCases: string[];
  attributeTokens: string[];
}

export interface MerchantContext {
  merchantId: string;
  productCount: number;
  activeProductCount: number;
  currency?: string;
}

export interface CandidateRetriever {
  retrieve(input: { query?: string; category?: string; maxPrice?: number; excludeIds?: string[]; limit?: number }): Promise<AgentCatalogProduct[]>;
}

export interface RankedCandidate {
  product: AgentCatalogProduct;
  score: number;
  reasons: string[];
}

export interface GrowthOpportunity {
  customerId?: string;
  merchantId?: string;
  trigger: string;
  actionType: Exclude<GrowthAction, 'DO_NOTHING' | 'ASK_CLARIFICATION'>;
  products: AgentCatalogProduct[];
  customerValue: string[];
  growthValue: string[];
  opportunityScore: number;
  confidence: number;
  reason: string;
  expiresAt?: string;
  requiresApproval: boolean;
}

export interface NextBestAction {
  action: GrowthAction;
  products: AgentCatalogProduct[];
  opportunityScore: number;
  confidence: number;
  trigger: string;
  reason: string;
  requiresApproval: boolean;
}
