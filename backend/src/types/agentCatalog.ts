import type { ProductStatus } from './database.js';

export type ProductAvailability = 'IN_STOCK' | 'OUT_OF_STOCK' | 'UNAVAILABLE';

export interface AgentCatalogProduct {
  product_id: string;
  merchant_id: string;
  name: string;
  description: string | null;
  category: string;
  price: number;
  currency: string;
  availability: ProductAvailability;
  stock: number;
  status: ProductStatus;
  attributes: Record<string, string>;
  use_cases: string[];
}
