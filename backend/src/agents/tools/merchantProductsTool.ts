import { ProductService } from '../../services/productService.js';
import type { AuthenticatedUser } from '../../types/auth.js';

export class MerchantProductsTool {
  constructor(private readonly products = new ProductService()) {}

  execute(user: AuthenticatedUser) {
    return this.products.list(user);
  }
}