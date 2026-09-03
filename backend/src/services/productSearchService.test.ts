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
