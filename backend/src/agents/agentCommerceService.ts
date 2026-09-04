import { randomUUID } from 'node:crypto';
import { BuyerAgent } from './buyerAgent.js';
import { AgentMessageService } from './agentMessageService.js';
import { BuyerRequirementTool } from './tools/buyerRequirementTool.js';
import { MerchantQueryTool } from './tools/merchantQueryTool.js';
import { AgentCatalogService } from '../services/agentCatalogService.js';
import type { AuthenticatedUser } from '../types/auth.js';
import type { AgentCommerceRequest, AgentCommerceResponse, BuyerAgentMessage, MerchantAgentMessage } from '../types/agentCommerce.js';
import type { AgentCatalogProduct } from '../types/agentCatalog.js';
import { HttpError, httpStatus } from '../utils/http.js';
import { AuditService } from '../audit/auditService.js';

export class AgentCommerceService {
  constructor(
    private readonly buyer = new BuyerAgent(),
    private readonly requirements = new BuyerRequirementTool(),
    private readonly merchantQuery = new MerchantQueryTool(),
    private readonly catalog = new AgentCatalogService(),
    private readonly messages = new AgentMessageService(),
    private readonly audits = new AuditService(),
  ) {}

  async query(user: AuthenticatedUser, request: AgentCommerceRequest): Promise<AgentCommerceResponse> {
    if (user.role !== 'BUYER') throw new HttpError(httpStatus.forbidden, 'Buyer access required');
    if (!request || typeof request.message !== 'string' || !request.message.trim()) {
      throw new HttpError(httpStatus.badRequest, 'Message is required');
    }
    const requirement = this.requirements.execute(request);
    await this.audits.log({ user, buyerId: user.id, actorType: 'BUYER_AGENT', action: 'AGENT_REQUEST', entityType: 'AGENT_COMMERCE', context: { requirements: requirement.requirements, budget: requirement.budget, quantity: requirement.quantity }, explanation: 'Buyer agent created a structured commerce request.' });
    const buyerResponse = await this.buyer.chat(user, request.message, request.action);
    const candidates = requirement.productId
      ? [await this.catalog.get(requirement.productId)]
      : buyerResponse.products.length
        ? buyerResponse.products
        : [];
    const merchantIds = [...new Set(candidates.map((product) => product.merchant_id))];
    const requests: BuyerAgentMessage[] = [];
    const responses: MerchantAgentMessage[] = [];
    const products: AgentCatalogProduct[] = [];
    for (const merchantId of merchantIds) {
      const messageId = randomUUID();
      const requestMessage: BuyerAgentMessage = {
        messageId,
        from: 'BUYER_AGENT',
        to: 'MERCHANT_AGENT',
        type: 'PRODUCT_QUERY',
        merchantId,
        payload: requirement,
        createdAt: new Date().toISOString(),
      };
      this.messages.log(requestMessage);
      await this.audits.log({ user, buyerId: user.id, merchantId, actorType: 'BUYER_AGENT', action: 'AGENT_MESSAGE', entityType: 'MERCHANT_AGENT', entityId: messageId, context: { type: requestMessage.type, requirements: requirement.requirements, budget: requirement.budget, quantity: requirement.quantity }, explanation: 'Buyer agent sent a structured product query to a relevant merchant agent.' });
      requests.push(requestMessage);
      const returned = await this.merchantQuery.execute(merchantId, requirement);
      const verified = await this.verifyProducts(merchantId, returned.map((product) => product.product_id));
      products.push(...verified);
      const responseMessage: MerchantAgentMessage = {
        messageId: randomUUID(),
        inReplyTo: messageId,
        from: 'MERCHANT_AGENT',
        to: 'BUYER_AGENT',
        type: 'PRODUCT_RESPONSE',
        merchantId,
        products: verified,
        message: verified.length ? `${verified.length} matching product${verified.length === 1 ? '' : 's'} available.` : 'No matching in-stock products available.',
        createdAt: new Date().toISOString(),
      };
      this.messages.log(responseMessage);
      await this.audits.log({ user, buyerId: user.id, merchantId, actorType: 'MERCHANT_AGENT', action: 'AGENT_MESSAGE', entityType: 'BUYER_AGENT', entityId: responseMessage.messageId, context: { type: responseMessage.type, productIds: verified.map((product) => product.product_id) }, explanation: 'Merchant agent returned products verified against the active catalog.' });
      responses.push(responseMessage);
    }
    const uniqueProducts = [...new Map(products.map((product) => [product.product_id, product])).values()];
    return {
      answer: this.answer(uniqueProducts, responses, buyerResponse.message),
      products: uniqueProducts,
      suggestedActions: buyerResponse.actions,
      buyerResponse,
      messages: { requests, responses },
    };
  }

  private async verifyProducts(merchantId: string, productIds: string[]): Promise<AgentCatalogProduct[]> {
    const verified: AgentCatalogProduct[] = [];
    for (const productId of productIds) {
      try {
        const product = await this.catalog.get(productId);
        if (product.merchant_id === merchantId) verified.push(product);
      } catch {
        // An unavailable product is omitted from the merchant response.
      }
    }
    return verified;
  }

  private answer(products: AgentCatalogProduct[], responses: MerchantAgentMessage[], buyerMessage: string): string {
    if (!products.length) return 'No participating merchant currently has an in-stock product matching those requirements.';
    const best = products[0];
    if (!best) return 'No participating merchant currently has an in-stock product matching those requirements.';
    return `${buyerMessage} I found ${products.length} verified option${products.length === 1 ? '' : 's'} across ${responses.filter((response) => response.products.length).length} merchant${responses.filter((response) => response.products.length).length === 1 ? '' : 's'}. The first option is ${best.name} at ${best.currency} ${best.price.toLocaleString('en-IN')}, with stock ${best.stock}. Select a product to continue; checkout and payment remain separate controlled steps.`;
  }
}