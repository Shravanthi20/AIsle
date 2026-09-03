import type { Product } from '../models/product.js';

export interface ProductPerformance {
  productId: string;
  name: string;
  category: string;
  status: Product['status'];
  stock: number;
  currency: string;
  unitsSold: number;
  revenue: number;
  orderCount: number;
}

export interface MerchantAnalytics {
  totalOrders: number;
  paidOrders: number;
  revenue: number;
  currency: string | null;
  topSellingProducts: ProductPerformance[];
  lowStockProducts: Product[];
  inactiveProducts: Product[];
  underperformingProducts: ProductPerformance[];
  productPerformance: ProductPerformance[];
}