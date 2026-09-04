import type { BuyerAgentMessage, MerchantAgentMessage } from '../types/agentCommerce.js';

export class AgentMessageService {
  private readonly messages: Array<BuyerAgentMessage | MerchantAgentMessage> = [];

  log(message: BuyerAgentMessage | MerchantAgentMessage): void {
    this.messages.push(message);
    console.info('[agent-commerce]', JSON.stringify({
      messageId: message.messageId,
      inReplyTo: 'inReplyTo' in message ? message.inReplyTo : undefined,
      from: message.from,
      to: message.to,
      type: message.type,
      merchantId: message.merchantId,
    }));
  }

  recent(): Array<BuyerAgentMessage | MerchantAgentMessage> {
    return [...this.messages];
  }
}