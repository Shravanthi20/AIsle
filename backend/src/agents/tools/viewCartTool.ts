import { CartService } from '../../services/cartService.js';
import type { AuthenticatedUser } from '../../types/auth.js';

export class ViewCartTool {
  constructor(private readonly cart = new CartService()) {}

  async execute(user: AuthenticatedUser) {
    return this.cart.get(user);
  }
}