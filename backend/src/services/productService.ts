import { MerchantRepository } from '../repositories/merchantRepository.js';
import {
  ProductRepository,
  type CreateProductInput,
  type UpdateProductInput,
} from '../repositories/productRepository.js';
import type { ProductStatus } from '../types/database.js';
import type { AuthenticatedUser } from '../types/auth.js';
import { HttpError, httpStatus } from '../utils/http.js';

const statuses = ['ACTIVE', 'INACTIVE'] as const;
type ProductInput = Record<string, unknown>;

function text(input: ProductInput, ...keys: string[]): string | undefined {
  const value = keys.map((key) => input[key]).find((candidate) => candidate !== undefined);
  return typeof value === 'string' ? value.trim() : undefined;
}

function attributes(input: unknown): Record<string, string> | undefined {
  if (input === undefined) return undefined;
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new HttpError(httpStatus.badRequest, 'Attributes must be an object');
  }
  const output: Record<string, string> = {};
  for (const [rawKey, rawValue] of Object.entries(input)) {
    const key = rawKey.trim();
    const value = typeof rawValue === 'string' ? rawValue.trim() : '';
    if (!key || !value || key.length > 80 || value.length > 500) {
      throw new HttpError(httpStatus.badRequest, 'Attribute keys and values must be valid text');
    }
    if (output[key]) throw new HttpError(httpStatus.badRequest, 'Duplicate product attribute');
    output[key] = value;
  }
  return output;
}

export class ProductService {
  constructor(
    private readonly products = new ProductRepository(),
    private readonly merchants = new MerchantRepository(),
  ) {}

  private async merchantId(user: AuthenticatedUser): Promise<string> {
    const merchant = await this.merchants.getMerchantByUserId(user.id);
    if (!merchant) throw new HttpError(httpStatus.forbidden, 'Merchant profile not found');
    return merchant.id;
  }

  private validateId(id: string): string {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      throw new HttpError(httpStatus.badRequest, 'Product ID is invalid');
    }
    return id;
  }

  private validate(input: ProductInput, partial = false): CreateProductInput | UpdateProductInput {
    const name = text(input, 'name');
    const category = text(input, 'category');
    const descriptionValue = input.description;
    const priceValue = input.price;
    const stockValue = input.stock;
    const currency = text(input, 'currency')?.toUpperCase();
    const status = text(input, 'status') as ProductStatus | undefined;
    const imageUrl = text(input, 'imageUrl', 'image_url');

    if (!partial && (!name || !category))
      throw new HttpError(httpStatus.badRequest, 'Name and category are required');
    if (name !== undefined && (!name || name.length > 200))
      throw new HttpError(httpStatus.badRequest, 'Name is invalid');
    if (category !== undefined && (!category || category.length > 120))
      throw new HttpError(httpStatus.badRequest, 'Category is invalid');
    if (
      descriptionValue !== undefined &&
      descriptionValue !== null &&
      typeof descriptionValue !== 'string'
    )
      throw new HttpError(httpStatus.badRequest, 'Description is invalid');
    if (
      typeof priceValue !== 'undefined' &&
      (typeof priceValue !== 'number' || !Number.isFinite(priceValue) || priceValue < 0)
    )
      throw new HttpError(httpStatus.badRequest, 'Price must be a non-negative number');
    if (
      typeof stockValue !== 'undefined' &&
      (!Number.isInteger(stockValue) || (stockValue as number) < 0)
    )
      throw new HttpError(httpStatus.badRequest, 'Stock must be a non-negative integer');
    if (currency !== undefined && !/^[A-Z]{3}$/.test(currency))
      throw new HttpError(httpStatus.badRequest, 'Currency must be a 3-letter code');
    if (status !== undefined && !statuses.includes(status as (typeof statuses)[number]))
      throw new HttpError(httpStatus.badRequest, 'Status must be ACTIVE or INACTIVE');

    const result = {
      ...(name !== undefined ? { name } : {}),
      ...(descriptionValue !== undefined ? { description: descriptionValue as string | null } : {}),
      ...(category !== undefined ? { category } : {}),
      ...(priceValue !== undefined ? { price: Number(priceValue).toFixed(2) } : {}),
      ...(currency !== undefined ? { currency } : {}),
      ...(stockValue !== undefined ? { stock: stockValue as number } : {}),
      ...(imageUrl !== undefined ? { imageUrl: imageUrl || null } : {}),
      ...(status !== undefined ? { status } : {}),
      ...(input.attributes !== undefined ? { attributes: attributes(input.attributes) } : {}),
    };
    return result as CreateProductInput | UpdateProductInput;
  }

  async list(user: AuthenticatedUser) {
    return this.products.getProductsByMerchant(await this.merchantId(user));
  }
  async get(user: AuthenticatedUser, id: string) {
    const product = await this.products.getProductById(
      this.validateId(id),
      await this.merchantId(user),
    );
    if (!product) throw new HttpError(httpStatus.notFound, 'Product not found');
    return product;
  }
  async create(user: AuthenticatedUser, input: ProductInput) {
    return this.products.createProduct({
      ...(this.validate(input) as CreateProductInput),
      merchantId: await this.merchantId(user),
    });
  }
  async update(user: AuthenticatedUser, id: string, input: ProductInput) {
    const product = await this.products.updateProduct(
      this.validateId(id),
      await this.merchantId(user),
      this.validate(input, true) as UpdateProductInput,
    );
    if (!product) throw new HttpError(httpStatus.notFound, 'Product not found');
    return product;
  }
  async deactivate(user: AuthenticatedUser, id: string) {
    const product = await this.products.deactivateProduct(
      this.validateId(id),
      await this.merchantId(user),
    );
    if (!product) throw new HttpError(httpStatus.notFound, 'Product not found');
    return product;
  }
  async stock(user: AuthenticatedUser, id: string, input: ProductInput) {
    const stock = input.stock;
    if (!Number.isInteger(stock) || (stock as number) < 0)
      throw new HttpError(httpStatus.badRequest, 'Stock must be a non-negative integer');
    const product = await this.products.updateStock(
      this.validateId(id),
      await this.merchantId(user),
      stock as number,
    );
    if (!product) throw new HttpError(httpStatus.notFound, 'Product not found');
    return product;
  }
}
