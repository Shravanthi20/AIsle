import assert from 'node:assert/strict';
import test from 'node:test';

import type { Product } from '../models/product.js';
import { getAvailability, toAgentCatalogProduct } from './agentCatalogService.js';

const product: Product = {
  id: '0ecf51b2-7ca9-4e35-85b7-b5be690da7b4',
  merchantId: '79f18806-4cfa-45e2-92b2-f75049253b76',
  name: 'Nike Running Shoes',
  description: 'Lightweight shoes',
  category: 'Running Shoes',
  price: '6999.00',
  currency: 'INR',
  stock: 25,
  imageUrl: null,
  status: 'ACTIVE',
  attributes: [
    {
      id: 'a1',
      productId: '0ecf51b2-7ca9-4e35-85b7-b5be690da7b4',
      key: 'brand',
      value: 'Nike',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'a2',
      productId: '0ecf51b2-7ca9-4e35-85b7-b5be690da7b4',
      key: 'use_case',
      value: 'Daily Running; Training',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
  createdAt: new Date(),
  updatedAt: new Date(),
};

test('derives availability from status and stock', () => {
  assert.equal(getAvailability({ status: 'ACTIVE', stock: 1 }), 'IN_STOCK');
  assert.equal(getAvailability({ status: 'ACTIVE', stock: 0 }), 'OUT_OF_STOCK');
  assert.equal(getAvailability({ status: 'INACTIVE', stock: 10 }), 'UNAVAILABLE');
});

test('transforms product attributes into deterministic catalog fields', () => {
  const catalogProduct = toAgentCatalogProduct(product);
  assert.equal(catalogProduct.product_id, product.id);
  assert.equal(catalogProduct.merchant_id, product.merchantId);
  assert.equal(catalogProduct.price, 6999);
  assert.equal(catalogProduct.currency, 'INR');
  assert.deepEqual(catalogProduct.attributes, {
    brand: 'Nike',
    use_case: 'Daily Running; Training',
  });
  assert.deepEqual(catalogProduct.use_cases, ['Daily Running', 'Training']);
});
