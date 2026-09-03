import type { ProductStatus } from '../types/database.js';

export interface Product {
  id: string;
  merchantId: string;
  name: string;
  description: string | null;
  category: string;
  price: string;
  currency: string;
  stock: number;
  imageUrl: string | null;
  status: ProductStatus;
  attributes: ProductAttribute[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductAttribute {
  id: string;
  productId: string;
  key: string;
  value: string;
  createdAt: Date;
  updatedAt: Date;
}
