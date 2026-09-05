import type { AuthenticatedUser } from '../types/auth.js';
import { MerchantAgentService, type MerchantAgentAction, type MerchantAgentResponse } from './merchantAgentService.js';

export class MerchantAgent {
  constructor(private readonly service = new MerchantAgentService()) {}

  chat(user: AuthenticatedUser, message: string): Promise<MerchantAgentResponse> {
    return this.service.chat(user, message);
  }

  handleAction(user: AuthenticatedUser, action: MerchantAgentAction): Promise<void> {
    return this.service.handleAction(user, action);
  }
}