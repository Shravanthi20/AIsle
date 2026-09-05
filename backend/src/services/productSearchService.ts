import { AgentCatalogService } from './agentCatalogService.js';
import type { AgentCatalogProduct } from '../types/agentCatalog.js';
import { HttpError, httpStatus } from '../utils/http.js';
import { eng, removeStopwords } from 'stopword';

type Sort = 'relevance' | 'price_asc' | 'price_desc';
export interface SearchInput {
  q?: unknown;
  category?: unknown;
  minPrice?: unknown;
  maxPrice?: unknown;
  inStock?: unknown;
  attributes?: unknown;
  page?: unknown;
  limit?: unknown;
  sort?: unknown;
}
export interface SearchResult extends AgentCatalogProduct {
  match_score: number;
  match_reasons: string[];
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ');
}
function terms(value: string): string[] {
  return [
    ...new Set(
      removeStopwords(normalize(value).split(' '), eng)
        .filter((term) => term.length > 2 && !/^\d+$/.test(term))
        .map((term) => (term.length > 3 && term.endsWith('s') ? term.slice(0, -1) : term)),
    ),
  ];
}
function tokenSet(value: string): Set<string> {
  return new Set(terms(value));
}
function matchesTerm(term: string, searchableTokens: Set<string>): boolean {
  if (searchableTokens.has(term)) return true;
  if (term.length < 5) return false;
  return [...searchableTokens].some((candidate) => oneEditAway(term, candidate));
}
function oneEditAway(left: string, right: string): boolean {
  if (left === right) return true;
  if (Math.abs(left.length - right.length) > 1) return false;
  if (left.length === right.length) {
    const differences = [...left].reduce((count, character, index) => count + (character === right[index] ? 0 : 1), 0);
    if (differences === 1) return true;
    const swapped = [...left];
    for (let index = 0; index < swapped.length - 1; index += 1) {
      [swapped[index], swapped[index + 1]] = [swapped[index + 1] as string, swapped[index] as string];
      if (swapped.join('') === right) return true;
      [swapped[index], swapped[index + 1]] = [swapped[index + 1] as string, swapped[index] as string];
    }
    return false;
  }
  const shorter = left.length < right.length ? left : right;
  const longer = left.length < right.length ? right : left;
  let shortIndex = 0;
  let longIndex = 0;
  let difference = 0;
  while (shortIndex < shorter.length && longIndex < longer.length) {
    if (shorter[shortIndex] === longer[longIndex]) {
      shortIndex += 1;
      longIndex += 1;
    } else {
      difference += 1;
      longIndex += 1;
      if (difference > 1) return false;
    }
  }
  return true;
}
function number(value: unknown, name: string): number | undefined {
  if (value === undefined) return undefined;
  const parsed = typeof value === 'string' && value.trim() ? Number(value) : NaN;
  if (!Number.isFinite(parsed) || parsed < 0)
    throw new HttpError(httpStatus.badRequest, `${name} must be a non-negative number`);
  return parsed;
}
function positiveInteger(value: unknown, fallback: number, name: string, max: number): number {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > max)
    throw new HttpError(httpStatus.badRequest, `${name} must be between 1 and ${max}`);
  return parsed;
}
function parseAttributes(value: unknown): Record<string, string> {
  if (value === undefined || value === '') return {};
  let candidate: unknown = value;
  if (typeof value === 'string') {
    try {
      candidate = JSON.parse(value);
    } catch {
      candidate = Object.fromEntries(
        value.split(',').flatMap((pair) => {
          const [key, item] = pair.split(':', 2);
          if (!key?.trim() || !item?.trim()) return [];
          return [[key.trim(), item.trim()]];
        }),
      );
    }
  }
  if (
    !candidate ||
    typeof candidate !== 'object' ||
    Array.isArray(candidate) ||
    Object.values(candidate).some((item) => typeof item !== 'string')
  )
    throw new HttpError(
      httpStatus.badRequest,
      'Attributes must be a JSON object or key:value pairs',
    );
  return Object.fromEntries(
    Object.entries(candidate as Record<string, string>).map(([key, item]) => [
      normalize(key),
      normalize(item),
    ]),
  );
}

export class ProductSearchService {
  constructor(private readonly catalog = new AgentCatalogService()) {}

  async search(input: SearchInput): Promise<{
    query: string;
    results: SearchResult[];
    total: number;
    page: number;
    limit: number;
  }> {
    const query = typeof input.q === 'string' ? input.q.trim() : '';
    if (input.q !== undefined && typeof input.q !== 'string')
      throw new HttpError(httpStatus.badRequest, 'Query must be text');
    const category = typeof input.category === 'string' ? normalize(input.category) : undefined;
    const minPrice = number(input.minPrice, 'minPrice');
    const maxPrice = number(input.maxPrice, 'maxPrice');
    if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice)
      throw new HttpError(httpStatus.badRequest, 'minPrice cannot exceed maxPrice');
    const inStock =
      input.inStock === undefined
        ? true
        : input.inStock === 'true'
          ? true
          : input.inStock === 'false'
            ? false
            : (() => {
                throw new HttpError(httpStatus.badRequest, 'inStock must be true or false');
              })();
    const attributes = parseAttributes(input.attributes);
    const page = positiveInteger(input.page, 1, 'page', 100000);
    const limit = positiveInteger(input.limit, 20, 'limit', 50);
    const sort: Sort =
      input.sort === undefined
        ? 'relevance'
        : input.sort === 'relevance' || input.sort === 'price_asc' || input.sort === 'price_desc'
          ? input.sort
          : (() => {
              throw new HttpError(
                httpStatus.badRequest,
                'sort must be relevance, price_asc, or price_desc',
              );
            })();
    const products = await this.catalog.list();
    const catalogTokens = new Set(products.flatMap((product) => [
      product.name,
      product.category,
      product.description ?? '',
      ...Object.entries(product.attributes).flatMap(([key, value]) => [key, value]),
    ].flatMap(terms)));
    const queryTerms = terms(query).filter((term) => matchesTerm(term, catalogTokens));
    const matches = products
      .filter((product) => {
        if (inStock && product.availability !== 'IN_STOCK') return false;
        if (category && !normalize(product.category).includes(category)) return false;
        if (minPrice !== undefined && product.price < minPrice) return false;
        if (maxPrice !== undefined && product.price > maxPrice) return false;
        const searchableText = [
          product.name,
          product.category,
          product.description ?? '',
          ...Object.entries(product.attributes).flatMap(([key, value]) => [key, value]),
        ].join(' ');
        const searchableTokens = tokenSet(searchableText);
        if (
          !Object.entries(attributes).every(([key, value]) =>
            Object.entries(product.attributes).some(
              ([attributeKey, attributeValue]) =>
                normalize(attributeKey) === key && normalize(attributeValue).includes(value),
            ),
          )
        )
          return false;
        return queryTerms.length === 0 || queryTerms.every((term) => matchesTerm(term, searchableTokens));
      })
      .map((product) => this.rank(product, queryTerms, category, minPrice, maxPrice, attributes));
    matches.sort((a, b) =>
      sort === 'price_asc'
        ? a.price - b.price
        : sort === 'price_desc'
          ? b.price - a.price
          : b.match_score - a.match_score || a.price - b.price || a.name.localeCompare(b.name),
    );
    return {
      query,
      results: matches.slice((page - 1) * limit, page * limit),
      total: matches.length,
      page,
      limit,
    };
  }

  async get(productId: string): Promise<AgentCatalogProduct> {
    return this.catalog.get(productId);
  }

  private rank(
    product: AgentCatalogProduct,
    queryTerms: string[],
    category: string | undefined,
    minPrice: number | undefined,
    maxPrice: number | undefined,
    requestedAttributes: Record<string, string>,
  ): SearchResult {
    const description = normalize(product.description ?? '');
    const attributeText = Object.values(product.attributes).map(normalize).join(' ');
    const nameTokens = tokenSet(product.name);
    const categoryTokens = tokenSet(product.category);
    const attributeTokens = tokenSet(attributeText);
    const descriptionTokens = tokenSet(description);
    let score = 0.15;
    const reasons: string[] = [];
    if (queryTerms.some((term) => matchesTerm(term, nameTokens))) {
      score += 0.35;
      reasons.push('Matches product name');
    }
    if (
      queryTerms.some((term) => matchesTerm(term, categoryTokens)) ||
      (category && categoryTokens.has(category))
    ) {
      score += 0.25;
      reasons.push(`Matches ${product.category} category`);
    }
    if (
      queryTerms.some((term) => matchesTerm(term, attributeTokens)) ||
      Object.keys(requestedAttributes).length
    ) {
      score += 0.2;
      reasons.push('Matches requested attributes');
    }
    if (queryTerms.some((term) => matchesTerm(term, descriptionTokens))) {
      score += 0.1;
      reasons.push('Matches product description');
    }
    if (minPrice !== undefined || maxPrice !== undefined)
      reasons.push('Within requested price range');
    if (product.availability === 'IN_STOCK') {
      score += 0.1;
      reasons.push('Currently in stock');
    }
    return {
      ...product,
      match_score: Number(Math.min(score, 1).toFixed(2)),
      match_reasons: reasons,
    };
  }
}
