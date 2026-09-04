import type { AgentCatalogProduct } from './agentCatalog.js';
import type { BuyerAgentAction } from '../agents/buyerAgent.js';

export type AgentMessageType = 'PRODUCT_QUERY' | 'PRODUCT_RESPONSE';

export interface BuyerRequirement {
  requirements: string;
  budget?: number;
  quantity: number;
  productId?: string;
  attributes: Record<string, string>;
}

export interface BuyerAgentMessage {
  messageId: string;
  from: 'BUYER_AGENT';
  to: 'MERCHANT_AGENT';
  type: 'PRODUCT_QUERY';
  merchantId: string;
  payload: BuyerRequirement;
  createdAt: string;
}

export interface MerchantAgentMessage {
  messageId: string;
  inReplyTo: string;
  from: 'MERCHANT_AGENT';
  to: 'BUYER_AGENT';
  type: 'PRODUCT_RESPONSE';
  merchantId: string;
  products: AgentCatalogProduct[];
  message: string;
  createdAt: string;
}

export interface AgentCommerceRequest {
  message: string;
  budget?: number;
  quantity?: number;
  productId?: string;
  action?: BuyerAgentAction;
}

export interface AgentCommerceResponse {
  answer: string;
  products: AgentCatalogProduct[];
  suggestedActions: Array<{ type: string; productId?: string; label: string }>;
  buyerResponse: Awaited<ReturnType<import('../agents/buyerAgent.js').BuyerAgent['chat']>>;
  messages: {
    requests: BuyerAgentMessage[];
    responses: MerchantAgentMessage[];
  };
}