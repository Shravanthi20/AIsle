import { CartService } from '../../services/cartService.js';
import type { AuthenticatedUser } from '../../types/auth.js';
import { PolicyService } from '../../policy/policyService.js';

export class CheckoutTool {
  constructor(private readonly cart = new CartService(), private readonly policies = new PolicyService()) {}

  async execute(user: AuthenticatedUser) {
    const summary = await this.cart.get(user);
    const merchantIds = [...new Set(summary.items.map((item) => item.merchantId))];
    const evaluation = summary.items.length
      ? await this.policies.evaluate(user, 'PURCHASE', Number(summary.subtotal), summary.currency, merchantIds.length === 1 ? merchantIds[0] : undefined)
      : undefined;
    const decision = evaluation?.decision ?? 'DENY';
    return {
      ...summary,
      decision,
      requiresApproval: decision === 'REQUIRES_APPROVAL',
      message: !summary.items.length ? 'Your cart is empty.' : decision === 'DENY' ? evaluation?.reason ?? 'Checkout is blocked by your policy.' : decision === 'REQUIRES_APPROVAL' ? `Your cart total is ${summary.currency} ${Number(summary.subtotal).toLocaleString('en-IN')}. ${evaluation?.reason ?? 'Explicit approval is required.'}` : 'Checkout is allowed by your current policy. Review the total before continuing to payment.',
    };
  }
}