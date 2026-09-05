import { MerchantRepository } from '../repositories/merchantRepository.js';
import { CheckoutConflictError, OrderRepository, type CheckoutItem } from '../repositories/orderRepository.js';
import { ProductRepository } from '../repositories/productRepository.js';
import type { AuthenticatedUser } from '../types/auth.js';
import { HttpError, httpStatus } from '../utils/http.js';
import { CartService } from './cartService.js';
import { PolicyService } from '../policy/policyService.js';
import { AuditService } from '../audit/auditService.js';

export class OrderService {
  constructor(
    private readonly orders = new OrderRepository(),
    private readonly merchants = new MerchantRepository(),
    private readonly products = new ProductRepository(),
    private readonly cart = new CartService(),
    private readonly policies = new PolicyService(),
    private readonly audits = new AuditService(),
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

  async checkout(user: AuthenticatedUser, approvalId?: unknown) {
    if (user.role !== 'BUYER') throw new HttpError(httpStatus.forbidden, 'Buyer access required');
    if (approvalId !== undefined && (typeof approvalId !== 'string' || !approvalId.trim())) throw new HttpError(httpStatus.badRequest, 'Approval ID is invalid');
    const summary = await this.cart.get(user);
    if (!summary.items.length) throw new HttpError(httpStatus.conflict, 'Your cart is empty');
    const merchantIds = [...new Set(summary.items.map((item) => item.merchantId))];
    const evaluation = await this.policies.evaluate(user, 'PURCHASE', Number(summary.subtotal), summary.currency, merchantIds.length === 1 ? merchantIds[0] : undefined);
    if (evaluation.decision === 'DENY') throw new HttpError(httpStatus.forbidden, evaluation.reason ?? 'Purchase is blocked by your policy');
    if (evaluation.decision === 'REQUIRES_APPROVAL' && !approvalId) throw new HttpError(httpStatus.conflict, evaluation.reason ?? 'Approval is required before checkout');
    try {
      const result = await this.orders.checkout(user.id, approvalId as string | undefined);
      if (!result) throw new HttpError(httpStatus.conflict, 'Your cart is empty');
      await this.audits.log({ user, buyerId: user.id, merchantId: result.order.merchantId, actorType: 'USER', action: 'CHECKOUT_CREATED', entityType: 'ORDER', entityId: result.order.id, context: { amount: Number(result.order.totalAmount), currency: result.order.currency, approvalId: result.order.approvalId ?? null }, decision: 'ALLOW', explanation: 'Checkout created after policy evaluation and approval validation.' });
      return { ...result.order, items: result.items };
    } catch (error) {
      await this.audits.log({ user, buyerId: user.id, actorType: 'USER', action: error instanceof CheckoutConflictError && /stock|active/i.test(error.message) ? 'STOCK_CONFLICT' : /approval|total/i.test(error instanceof Error ? error.message : '') ? 'STALE_APPROVAL' : 'CHECKOUT_FAILED', entityType: 'CHECKOUT', context: { approvalId: typeof approvalId === 'string' ? approvalId : null }, decision: 'FAILED', explanation: error instanceof Error ? error.message : 'Checkout could not be completed.' });
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
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))
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