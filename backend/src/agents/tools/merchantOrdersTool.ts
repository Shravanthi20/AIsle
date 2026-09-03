import { OrderService } from '../../services/orderService.js';
import type { AuthenticatedUser } from '../../types/auth.js';

export class MerchantOrdersTool {
  constructor(private readonly orders = new OrderService()) {}

  execute(user: AuthenticatedUser) {
    return this.orders.list(user);
  }
}