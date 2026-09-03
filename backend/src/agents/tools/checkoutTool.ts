import { CartService } from '../../services/cartService.js';
import type { AuthenticatedUser } from '../../types/auth.js';

export class CheckoutTool {
  constructor(private readonly cart = new CartService()) {}

  async execute(user: AuthenticatedUser) {
    const summary = await this.cart.get(user);
    return {
      ...summary,
      requiresApproval: true,
      message: summary.items.length
        ? 'Checkout is ready. Review the total and approve it before continuing to payment.'
        : 'Your cart is empty.',
    };
  }
}