import { AddToCartTool } from './tools/addToCartTool.js';
import { CheckoutTool } from './tools/checkoutTool.js';
import { ProductDetailsTool } from './tools/productDetailsTool.js';
import { RecommendProductsTool } from './tools/recommendProductsTool.js';
import { SearchProductsTool } from './tools/searchProductsTool.js';
import { ViewCartTool } from './tools/viewCartTool.js';
import type { AgentCatalogProduct } from '../types/agentCatalog.js';
import type { AuthenticatedUser } from '../types/auth.js';
import { HttpError, httpStatus } from '../utils/http.js';
import type { BuyerAgentAction } from './buyerAgent.js';
import { RuleBasedIntentProvider, type IntentProvider } from './intentProvider.js';
import type { Recommendation } from '../types/recommendation.js';

interface AgentContext {
  products: AgentCatalogProduct[];
  query?: string;
  selectedProductId?: string;
}

export interface BuyerAgentResponse {
  message: string;
  state: 'SEARCHING' | 'RECOMMENDING' | 'WAITING_FOR_SELECTION' | 'ADDING_TO_CART' | 'READY_FOR_CHECKOUT' | 'WAITING_FOR_APPROVAL' | 'ERROR';
  products: AgentCatalogProduct[];
  actions: Array<{ type: string; productId?: string; label: string }>;
  cart?: Awaited<ReturnType<ViewCartTool['execute']>>;
}

const contexts = new Map<string, AgentContext>();

function productActions(products: AgentCatalogProduct[]) {
  return products.slice(0, 3).map((product) => ({
    type: 'add_to_cart',
    productId: product.product_id,
    label: `Add ${product.name} to cart`,
  }));
}

export class BuyerAgentService {
  constructor(
    private readonly search = new SearchProductsTool(),
    private readonly recommend = new RecommendProductsTool(),
    private readonly details = new ProductDetailsTool(),
    private readonly add = new AddToCartTool(),
    private readonly viewCart = new ViewCartTool(),
    private readonly checkout = new CheckoutTool(),
    private readonly intentProvider: IntentProvider = new RuleBasedIntentProvider(),
  ) {}

  async chat(user: AuthenticatedUser, message: string, action?: BuyerAgentAction): Promise<BuyerAgentResponse> {
    if (user.role !== 'BUYER') throw new HttpError(httpStatus.forbidden, 'Buyer access required');
    if (typeof message !== 'string' || !message.trim()) throw new HttpError(httpStatus.badRequest, 'Message is required');
    const text = message.trim();
    const context = contexts.get(user.id) ?? { products: [] };

    if (action?.type === 'view_cart' || /\b(show|view)\s+(my\s+)?cart\b/i.test(text)) {
      const cart = await this.viewCart.execute(user);
      return { message: cart.items.length ? `Your cart total is ${cart.currency} ${Number(cart.subtotal).toLocaleString('en-IN')}.` : 'Your cart is empty.', state: 'READY_FOR_CHECKOUT', products: context.products, actions: cart.items.length ? [{ type: 'prepare_checkout', label: 'Prepare checkout' }] : [], cart };
    }

    if (action?.type === 'prepare_checkout' || /\b(checkout|buy now)\b/i.test(text)) {
      const checkout = await this.checkout.execute(user);
      return { message: checkout.message, state: checkout.items.length ? 'WAITING_FOR_APPROVAL' : 'ERROR', products: context.products, actions: checkout.items.length ? [{ type: 'prepare_checkout', label: 'Review checkout' }] : [], cart: checkout };
    }

    const productId = action?.productId ?? this.selectedProduct(text, context.products);
    if (!action && context.products.length && /\b(best|recommend|recommendation|travel|compare)\b/i.test(text)) {
      const recommendations = await this.recommend.execute(`${context.query ?? ''} ${text}`.trim());
      const recommendedProducts = context.products.filter((product) =>
        recommendations.some((recommendation) => recommendation.product_id === product.product_id),
      );
      if (recommendedProducts.length) {
        context.products = recommendedProducts;
        contexts.set(user.id, context);
        const best = recommendedProducts[0];
        return {
          message: `Based on your follow-up, ${best?.name ?? 'the first option'} is the strongest match from the available catalog.`,
          state: 'WAITING_FOR_SELECTION',
          products: recommendedProducts,
          actions: productActions(recommendedProducts),
        };
      }
    }
    if (action?.type === 'add_to_cart' || productId && /\b(add|put)\b.*\bcart\b/i.test(text)) {
      if (!productId) return this.selectionResponse(context.products);
      const cart = await this.add.execute(user, productId, action?.quantity ?? 1);
      const product = await this.details.execute(productId);
      return { message: `${product.name} was added to your cart.`, state: 'READY_FOR_CHECKOUT', products: context.products, actions: [{ type: 'prepare_checkout', label: 'Prepare checkout' }], cart };
    }

    if (action?.type === 'select_product' || /\b(details|tell me more|show)\b/i.test(text) && productId) {
      if (!productId) return this.selectionResponse(context.products);
      const product = await this.details.execute(productId);
      context.selectedProductId = product.product_id;
      contexts.set(user.id, context);
      return { message: `${product.name} costs ${product.currency} ${product.price.toLocaleString('en-IN')} and is ${product.availability === 'IN_STOCK' ? 'in stock' : product.availability.toLowerCase().replace('_', ' ')}.`, state: 'WAITING_FOR_SELECTION', products: [product], actions: [{ type: 'add_to_cart', productId: product.product_id, label: `Add ${product.name} to cart` }] };
    }

    const intent = this.intentProvider.understand(text);
    const found = await this.search.execute({ query: text, maxPrice: intent.maxPrice, attributes: intent.attributes });
    const recommendations = await this.recommend.execute(text);
    const products = this.rankSearchResults(found, recommendations);
    context.products = products;
    context.query = text;
    contexts.set(user.id, context);
    if (!products.length) return { message: 'I could not find a currently available product matching those requirements.', state: 'WAITING_FOR_SELECTION', products: [], actions: [] };
    const best = products[0];
    if (!best) return { message: 'I could not find a currently available product matching those requirements.', state: 'WAITING_FOR_SELECTION', products: [], actions: [] };
    const bestRecommendation = recommendations.find((recommendation) => recommendation.product_id === best.product_id);
    const explanation = bestRecommendation?.reason ?? `it is ${best.currency} ${best.price.toLocaleString('en-IN')}`;
    return { message: `I found ${products.length} suitable option${products.length === 1 ? '' : 's'}. Best match: ${best.name} because ${explanation.toLowerCase()}.`, state: 'WAITING_FOR_SELECTION', products, actions: productActions(products) };
  }

  private rankSearchResults(products: AgentCatalogProduct[], recommendations: Recommendation[]): AgentCatalogProduct[] {
    if (!recommendations.length) return products;
    const rank = new Map(recommendations.map((recommendation, index) => [recommendation.product_id, index]));
    const rankedProducts = products
      .filter((product) => rank.has(product.product_id))
      .sort((left, right) => (rank.get(left.product_id) ?? Number.MAX_SAFE_INTEGER) - (rank.get(right.product_id) ?? Number.MAX_SAFE_INTEGER));
    return rankedProducts.length ? rankedProducts : products;
  }

  private selectedProduct(message: string, products: AgentCatalogProduct[]): string | undefined {
    const ordinal = message.match(/\b(first|second|third)\b/i)?.[1]?.toLowerCase();
    if (ordinal) return products[{ first: 0, second: 1, third: 2 }[ordinal] ?? 0]?.product_id;
    return products.find((product) => message.toLowerCase().includes(product.name.toLowerCase()))?.product_id;
  }

  private selectionResponse(products: AgentCatalogProduct[]): BuyerAgentResponse {
    return { message: 'Please select one of the products before adding it to your cart.', state: 'WAITING_FOR_SELECTION', products, actions: productActions(products) };
  }
}