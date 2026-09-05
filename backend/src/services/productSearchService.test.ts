import assert from 'node:assert/strict';
import test from 'node:test';
import type { AgentCatalogProduct } from '../types/agentCatalog.js';
import { ProductSearchService } from './productSearchService.js';

const products: AgentCatalogProduct[] = [
  {
    product_id: '1',
    merchant_id: 'm1',
    name: 'Nike Black Running Shoes',
    description: 'Daily training shoes',
    category: 'Running Shoes',
    price: 6999,
    currency: 'INR',
    availability: 'IN_STOCK',
    stock: 8,
    status: 'ACTIVE',
    attributes: { color: 'Black', size: '9', brand: 'Nike' },
    use_cases: ['Daily Running'],
  },
  {
    product_id: '2',
    merchant_id: 'm1',
    name: 'Budget Running Shoes',
    description: 'Training footwear',
    category: 'Running Shoes',
    price: 3999,
    currency: 'INR',
    availability: 'IN_STOCK',
    stock: 3,
    status: 'ACTIVE',
    attributes: { color: 'Blue', size: '8' },
    use_cases: [],
  },
  {
    product_id: '3',
    merchant_id: 'm2',
    name: 'HomePulse Lifestyle 01',
    description: 'Lifestyle product for everyday living',
    category: 'Lifestyle products',
    price: 2400,
    currency: 'INR',
    availability: 'IN_STOCK',
    stock: 10,
    status: 'ACTIVE',
    attributes: { use_case: 'everyday living' },
    use_cases: ['everyday living'],
  },
];
const service = new ProductSearchService({
  list: async () => products,
  get: async (id: string) =>
    products.find((product) => product.product_id === id) as AgentCatalogProduct,
} as never);

test('filters attributes and prices, then ranks matching products', async () => {
  const result = await service.search({
    q: 'black running shoe size 9',
    maxPrice: '8000',
    attributes: 'color:black,size:9',
  });
  assert.equal(result.total, 1);
  assert.equal(result.results[0]?.product_id, '1');
  assert.ok((result.results[0]?.match_score ?? 0) > 0.5);
});

test('supports sorting and pagination', async () => {
  const result = await service.search({
    q: 'running shoes',
    sort: 'price_asc',
    page: '1',
    limit: '1',
  });
  assert.equal(result.total, 2);
  assert.equal(result.results[0]?.product_id, '2');
});

test('does not return unrelated products for conversational queries with product-type intent', async () => {
  const result = await service.search({
    q: 'I want to buy outdoor trainging shoes that are around Rs.6000',
    maxPrice: '6600',
  });
  assert.equal(result.total, 1);
  assert.equal(result.results[0]?.product_id, '2');
});

test('ignores list commands while matching a requested category', async () => {
  const result = await service.search({ q: 'list lifestyle products' });
  assert.equal(result.total, 1);
  assert.equal(result.results[0]?.product_id, '3');
});

test('ignores list commands while applying a requested budget', async () => {
  const result = await service.search({ q: 'list lifestyle products under Rs.10000', maxPrice: '10000' });
  assert.equal(result.total, 1);
  assert.equal(result.results[0]?.product_id, '3');
});

test('supports explicit price ordering for matching products', async () => {
  const ascending = await service.search({ q: 'running shoes', sort: 'price_asc' });
  const descending = await service.search({ q: 'running shoes', sort: 'price_desc' });
  assert.equal(ascending.results[0]?.price, 3999);
  assert.equal(descending.results[0]?.price, 6999);
});
