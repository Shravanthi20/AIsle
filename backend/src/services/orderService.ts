import { MerchantRepository } from '../repositories/merchantRepository.js';
import { CheckoutConflictError, OrderRepository, type CheckoutItem } from '../repositories/orderRepository.js';
import { ProductRepository } from '../repositories/productRepository.js';
import type { AuthenticatedUser } from '../types/auth.js';
import { HttpError, httpStatus } from '../utils/http.js';

export class OrderService {
  constructor(
    private readonly orders = new OrderRepository(),
    private readonly merchants = new MerchantRepository(),
    private readonly products = new ProductRepository(),
  ) {}

  private async merchantId(user: AuthenticatedUser) {
    const merchant = await this.merchants.getMerchantByUserId(user.id);
    if (!merchant) throw new HttpError(httpStatus.forbidden, 'Merchant profile not found');
    return merchant.id;
  }

  private async detail(order: Awaited<ReturnType<OrderRepository['getOrderById']>>) {
    if (!order) return null;
    const items = await this.orders.getOrderItems(order.id);
    const enrichedItems: CheckoutItem[] = await Promise.all(
      items.map(async (item) => {
        const product = await this.products.getProductById(item.productId);
        return {
          productId: item.productId,
          name: product?.name ?? 'Product unavailable',
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          currency: order.currency,
          subtotal: (Number(item.unitPrice) * item.quantity).toFixed(2),
        };
      }),
    );
    return { ...order, items: enrichedItems };
  }

  async checkout(user: AuthenticatedUser) {
    if (user.role !== 'BUYER') throw new HttpError(httpStatus.forbidden, 'Buyer access required');
    try {
      const result = await this.orders.checkout(user.id);
      if (!result) throw new HttpError(httpStatus.conflict, 'Your cart is empty');
      return { ...result.order, items: result.items };
    } catch (error) {
      if (error instanceof CheckoutConflictError) throw new HttpError(httpStatus.conflict, error.message);
      throw error;
    }
  }

  async list(user: AuthenticatedUser) {
    if (user.role === 'BUYER') return Promise.all((await this.orders.getOrdersByBuyer(user.id)).map((order) => this.detail(order)));
    if (user.role === 'MERCHANT') return Promise.all((await this.orders.getOrdersByMerchant(await this.merchantId(user))).map((order) => this.detail(order)));
    throw new HttpError(httpStatus.forbidden, 'You do not have access to orders');
  }

  async get(user: AuthenticatedUser, id: string) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))
      throw new HttpError(httpStatus.badRequest, 'Order ID is invalid');
    const order = await this.orders.getOrderById(id);
    if (!order) throw new HttpError(httpStatus.notFound, 'Order not found');
    if (user.role === 'BUYER' && order.buyerId !== user.id)
      throw new HttpError(httpStatus.notFound, 'Order not found');
    if (user.role === 'MERCHANT' && order.merchantId !== (await this.merchantId(user)))
      throw new HttpError(httpStatus.notFound, 'Order not found');
    return this.detail(order);
  }
}