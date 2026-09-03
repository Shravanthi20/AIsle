import type { AuthenticatedUser } from '../types/auth.js';
import { BuyerAgentService } from './buyerAgentService.js';

export class BuyerAgent {
  constructor(private readonly service = new BuyerAgentService()) {}

  chat(user: AuthenticatedUser, message: string, action?: BuyerAgentAction) {
    return this.service.chat(user, message, action);
  }
}

export interface BuyerAgentAction {
  type: 'select_product' | 'add_to_cart' | 'view_cart' | 'prepare_checkout';
  productId?: string;
  quantity?: number;
}