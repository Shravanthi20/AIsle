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
import { LlmIntentProvider, type IntentProvider } from './intentProvider.js';
import type { Recommendation } from '../types/recommendation.js';
import { AuditService } from '../audit/auditService.js';
import { GetUpsellRecommendationsTool } from './tools/getUpsellRecommendationsTool.js';
import { GetCrossSellRecommendationsTool } from './tools/getCrossSellRecommendationsTool.js';

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
    private readonly intentProvider: IntentProvider = new LlmIntentProvider(),
    private readonly audits = new AuditService(),
    private readonly upsells = new GetUpsellRecommendationsTool(),
    private readonly crossSells = new GetCrossSellRecommendationsTool(),
  ) {}

  async chat(user: AuthenticatedUser, message: string, action?: BuyerAgentAction): Promise<BuyerAgentResponse> {
    if (user.role !== 'BUYER') throw new HttpError(httpStatus.forbidden, 'Buyer access required');
    if (typeof message !== 'string' || !message.trim()) throw new HttpError(httpStatus.badRequest, 'Message is required');
    const text = message.trim();
    await this.audits.log({ user, buyerId: user.id, actorType: 'BUYER_AGENT', action: 'AGENT_REQUEST', entityType: 'BUYER_AGENT', context: { message: text }, explanation: 'Buyer agent received a request.' });
    const context = contexts.get(user.id) ?? { products: [] };

    if (action?.type === 'view_cart' || /\b(show|view)\s+(my\s+)?cart\b/i.test(text)) {
      try {
        const cart = await this.viewCart.execute(user);
        return { message: cart.items.length ? `Your cart total is ${cart.currency} ${Number(cart.subtotal).toLocaleString('en-IN')}.` : 'Your cart is empty.', state: 'READY_FOR_CHECKOUT', products: context.products, actions: cart.items.length ? [{ type: 'prepare_checkout', label: 'Prepare checkout' }] : [], cart };
      } catch (error) { return this.failureResponse(context, error, 'cart'); }
    }

    if (action?.type === 'prepare_checkout' || /\b(checkout|buy now)\b/i.test(text)) {
      try {
        const checkout = await this.checkout.execute(user);
        return { message: checkout.message, state: checkout.items.length ? checkout.decision === 'DENY' ? 'ERROR' : checkout.decision === 'REQUIRES_APPROVAL' ? 'WAITING_FOR_APPROVAL' : 'READY_FOR_CHECKOUT' : 'ERROR', products: context.products, actions: checkout.items.length && checkout.decision !== 'DENY' ? [{ type: 'prepare_checkout', label: 'Review checkout' }] : [], cart: checkout };
      } catch (error) { return this.failureResponse(context, error, 'checkout'); }
    }

    const productId = action?.productId ?? this.selectedProduct(text, context.products);
    if (!action && productId && /\b(upgrade|better|premium|accessor(?:y|ies)|complete|complement)\b/i.test(text)) {
      const selected = context.products.find((product) => product.product_id === productId);
      if (selected) {
        const recommendations = /accessor|complete|complement/i.test(text)
          ? await this.crossSells.execute(selected)
          : await this.upsells.execute(selected);
        const products = recommendations.map((recommendation) => recommendation.product);
        if (products.length) {
          context.products = products;
          contexts.set(user.id, context);
          const label = recommendations[0]?.type === 'cross_sell' ? 'complementary products' : 'upgrade options';
          return { message: `Here are ${label}: ${recommendations.map((recommendation) => `${recommendation.product.name} - ${recommendation.reason}`).join(' ')}`, state: 'WAITING_FOR_SELECTION', products, actions: productActions(products) };
        }
      }
    }
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
      try {
        const cart = await this.add.execute(user, productId, action?.quantity ?? 1);
        const product = await this.details.execute(productId);
        return { message: `${product.name} was added to your cart.`, state: 'READY_FOR_CHECKOUT', products: context.products, actions: [{ type: 'prepare_checkout', label: 'Prepare checkout' }], cart };
      } catch (error) { 
        console.error("ADD TO CART ERROR:", error);
        return this.failureResponse(context, error, 'product'); 
      }
    }

    if (action?.type === 'select_product' || /\b(details|tell me more|show)\b/i.test(text) && productId) {
      if (!productId) return this.selectionResponse(context.products);
      const product = await this.details.execute(productId);
      context.selectedProductId = product.product_id;
      contexts.set(user.id, context);
      return { message: `${product.name} costs ${product.currency} ${product.price.toLocaleString('en-IN')} and is ${product.availability === 'IN_STOCK' ? 'in stock' : product.availability.toLowerCase().replace('_', ' ')}.`, state: 'WAITING_FOR_SELECTION', products: [product], actions: [{ type: 'add_to_cart', productId: product.product_id, label: `Add ${product.name} to cart` }] };
    }

    const intent = await this.intentProvider.understand(text);
    let found: AgentCatalogProduct[];
    let recommendations: Recommendation[];
    try {
      found = await this.search.execute({ query: intent.searchTerms.join(' '), minPrice: intent.minPrice, maxPrice: intent.maxPrice, attributes: intent.attributes });
      if (intent.maxPrice !== undefined && found.length < 5) {
        const expanded = await this.search.execute({ query: intent.searchTerms.join(' '), minPrice: intent.minPrice, maxPrice: intent.maxPrice * 1.1, attributes: intent.attributes });
        found = [...new Map([...found, ...expanded].map((product) => [product.product_id, product])).values()];
      }
      recommendations = await this.recommend.execute(text);
    } catch (error) { return this.failureResponse(context, error, 'catalog'); }
    await this.audits.log({ user, buyerId: user.id, actorType: 'BUYER_AGENT', action: 'PRODUCT_RECOMMENDATIONS', entityType: 'PRODUCT', context: { productIds: recommendations.map((recommendation) => recommendation.product_id) }, decision: 'RECOMMENDED', explanation: recommendations.map((recommendation) => recommendation.reason).join(' ') || 'No matching recommendations were returned.' });
    const products = this.rankSearchResults(found, recommendations).slice(0, 5);
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
    const exactMatch = products.find((product) => message.toLowerCase().includes(product.name.toLowerCase()))?.product_id;
    if (exactMatch) return exactMatch;
    // Fallback: If they use "this", "that", "the", or "it" and mention parts of a product category or just generally, assume the first product.
    if (/\b(this|that|the|it)\b/i.test(message) && products.length > 0) return products[0]?.product_id;
    return undefined;
  }

  private selectionResponse(products: AgentCatalogProduct[]): BuyerAgentResponse {
    return { message: 'Please select one of the products before adding it to your cart.', state: 'WAITING_FOR_SELECTION', products, actions: productActions(products) };
  }

  private failureResponse(context: AgentContext, error: unknown, operation: 'cart' | 'checkout' | 'product' | 'catalog'): BuyerAgentResponse {
    const detail = error instanceof Error ? error.message : '';
    const message = operation === 'checkout' && /stock|active|available/i.test(detail)
      ? 'Checkout could not continue because a product is no longer available or has insufficient stock. Please review your cart.'
      : operation === 'checkout'
        ? 'Checkout could not be completed. Please review your cart and try again.'
        : operation === 'product'
          ? 'That product could not be added because its availability changed. Please choose another available product.'
          : operation === 'catalog'
            ? 'The catalog is temporarily unavailable. Please try again shortly.'
            : 'I could not load your cart right now. Please try again shortly.';
    return { message, state: 'ERROR', products: context.products, actions: [] };
  }
}