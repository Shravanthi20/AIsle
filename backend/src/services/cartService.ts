import { CartRepository, type CartProductRow } from '../repositories/cartRepository.js';
import { ProductRepository } from '../repositories/productRepository.js';
import type { AuthenticatedUser } from '../types/auth.js';
import { HttpError, httpStatus } from '../utils/http.js';
import { AuditService } from '../audit/auditService.js';

export class CartService {
  constructor(
    private readonly carts = new CartRepository(),
    private readonly products = new ProductRepository(),
    private readonly audits = new AuditService(),
  ) {}

  private buyer(user: AuthenticatedUser) {
    if (user.role !== 'BUYER') throw new HttpError(httpStatus.forbidden, 'Buyer access required');
  }

  private id(id: string) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))
      throw new HttpError(httpStatus.badRequest, 'Product ID is invalid');
    return id;
  }

  private quantity(input: unknown): number {
    if (!Number.isInteger(input) || (input as number) <= 0)
      throw new HttpError(httpStatus.badRequest, 'Quantity must be a positive integer');
    return input as number;
  }

  private async cart(user: AuthenticatedUser) {
    return this.carts.createCart(user.id);
  }

  private response(items: CartProductRow[]) {
    const currency = items[0]?.currency ?? 'INR';
    return {
      items: items.map((item) => ({ ...item, subtotal: (Number(item.unitPrice) * item.quantity).toFixed(2) })),
      subtotal: items.reduce((sum, item) => sum + Number(item.unitPrice) * item.quantity, 0).toFixed(2),
      currency,
    };
  }

  async get(user: AuthenticatedUser) {
    this.buyer(user);
    return this.response(await this.carts.getItems((await this.cart(user)).id));
  }

  async add(user: AuthenticatedUser, productId: string, rawQuantity: unknown) {
    this.buyer(user);
    const quantity = this.quantity(rawQuantity);
    const product = await this.products.getProductById(this.id(productId));
    if (!product || product.status !== 'ACTIVE') throw new HttpError(httpStatus.notFound, 'Product is not available');
    const cart = await this.cart(user);
    const requested = (await this.carts.getItemQuantity(cart.id, product.id)) + quantity;
    if (requested > product.stock) throw new HttpError(httpStatus.conflict, 'Requested quantity exceeds available stock');
    await this.carts.addItem(cart.id, product.id, quantity);
    const result = this.response(await this.carts.getItems(cart.id));
    await this.audits.log({ user, buyerId: user.id, merchantId: product.merchantId, actorType: 'USER', action: 'CART_ITEM_ADDED', entityType: 'PRODUCT', entityId: product.id, context: { quantity }, explanation: 'Product was added after availability and stock validation.' });
    return result;
  }

  async update(user: AuthenticatedUser, productId: string, rawQuantity: unknown) {
    this.buyer(user);
    const quantity = this.quantity(rawQuantity);
    const product = await this.products.getProductById(this.id(productId));
    if (!product || product.status !== 'ACTIVE') throw new HttpError(httpStatus.conflict, 'Product is no longer available');
    if (quantity > product.stock) throw new HttpError(httpStatus.conflict, 'Requested quantity exceeds available stock');
    const cart = await this.cart(user);
    if (!(await this.carts.updateItemQuantity(cart.id, product.id, quantity)))
      throw new HttpError(httpStatus.notFound, 'Cart item not found');
    const result = this.response(await this.carts.getItems(cart.id));
    await this.audits.log({ user, buyerId: user.id, merchantId: product.merchantId, actorType: 'USER', action: 'CART_ITEM_UPDATED', entityType: 'PRODUCT', entityId: product.id, context: { quantity }, explanation: 'Cart quantity was updated after stock validation.' });
    return result;
  }

  async remove(user: AuthenticatedUser, productId: string) {
    this.buyer(user);
    const cart = await this.cart(user);
    if (!(await this.carts.removeItem(cart.id, this.id(productId))))
      throw new HttpError(httpStatus.notFound, 'Cart item not found');
    const result = this.response(await this.carts.getItems(cart.id));
    await this.audits.log({ user, buyerId: user.id, actorType: 'USER', action: 'CART_ITEM_REMOVED', entityType: 'PRODUCT', entityId: productId, explanation: 'Product was removed from the buyer cart.' });
    return result;
  }

  async clear(user: AuthenticatedUser) {
    this.buyer(user);
    await this.carts.clearCart((await this.cart(user)).id);
    const result = this.response([]);
    await this.audits.log({ user, buyerId: user.id, actorType: 'USER', action: 'CART_CLEARED', entityType: 'CART', explanation: 'Buyer cart was cleared.' });
    return result;
  }
}