import { CartService } from '../../services/cartService.js';
import type { AuthenticatedUser } from '../../types/auth.js';

export class AddToCartTool {
  constructor(private readonly cart = new CartService()) {}

  async execute(user: AuthenticatedUser, productId: string, quantity = 1) {
    return this.cart.add(user, productId, quantity);
  }
}