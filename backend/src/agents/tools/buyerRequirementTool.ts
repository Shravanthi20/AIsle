import { RuleBasedIntentProvider, type BuyerIntent } from '../intentProvider.js';
import type { AgentCommerceRequest, BuyerRequirement } from '../../types/agentCommerce.js';
import { HttpError, httpStatus } from '../../utils/http.js';

export class BuyerRequirementTool {
  constructor(private readonly intent = new RuleBasedIntentProvider()) {}

  execute(request: AgentCommerceRequest): BuyerRequirement & BuyerIntent {
    const parsed = this.intent.understand(request.message);
    const budget = request.budget ?? parsed.maxPrice;
    const quantity = request.quantity ?? request.action?.quantity ?? 1;
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
      throw new HttpError(httpStatus.badRequest, 'Quantity must be between 1 and 100');
    }
    if (budget !== undefined && (!Number.isFinite(budget) || budget < 0)) {
      throw new HttpError(httpStatus.badRequest, 'Budget must be a non-negative number');
    }
    return {
      requirements: request.message.trim(),
      ...(budget === undefined ? {} : { budget }),
      quantity,
      ...(request.productId ? { productId: request.productId } : {}),
      attributes: parsed.attributes,
      maxPrice: budget,
    };
  }
}