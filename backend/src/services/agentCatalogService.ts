import type { Product } from '../models/product.js';
import { ProductRepository } from '../repositories/productRepository.js';
import type { AgentCatalogProduct, ProductAvailability } from '../types/agentCatalog.js';
import { HttpError, httpStatus } from '../utils/http.js';

export function getAvailability(product: Pick<Product, 'status' | 'stock'>): ProductAvailability {
  if (product.status !== 'ACTIVE') return 'UNAVAILABLE';
  return product.stock > 0 ? 'IN_STOCK' : 'OUT_OF_STOCK';
}

export function toAgentCatalogProduct(product: Product): AgentCatalogProduct {
  const attributes = Object.fromEntries(
    product.attributes.map((attribute) => [attribute.key, attribute.value]),
  );
  const useCase = attributes.use_case;

  return {
    product_id: product.id,
    merchant_id: product.merchantId,
    name: product.name,
    description: product.description,
    category: product.category,
    price: Number(product.price),
    currency: product.currency,
    availability: getAvailability(product),
    stock: product.stock,
    status: product.status,
    attributes,
    use_cases: useCase
      ? useCase
          .split(/[;,]/)
          .map((value) => value.trim())
          .filter(Boolean)
      : [],
  };
}

export class AgentCatalogService {
  constructor(private readonly products = new ProductRepository()) {}

  async list(): Promise<AgentCatalogProduct[]> {
    return (await this.products.getDiscoverableProducts()).map(toAgentCatalogProduct);
  }

  async get(productId: string): Promise<AgentCatalogProduct> {
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(productId)
    ) {
      throw new HttpError(httpStatus.notFound, 'Product not found');
    }

    const product = await this.products.getDiscoverableProductById(productId);
    if (!product) throw new HttpError(httpStatus.notFound, 'Product not found');
    return toAgentCatalogProduct(product);
  }
}
