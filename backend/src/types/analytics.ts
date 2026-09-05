import type { OrderStatus, PaymentStatus, ProductStatus } from './database.js';

export interface AnalyticsDateFilter {
  startDate?: string;
  endDate?: string;
}

export interface TrendPoint {
  date: string;
  orders: number;
  revenue: string;
}

export interface ProductSales {
  productId: string;
  name: string;
  category: string;
  status: ProductStatus;
  stock: number;
  price: string;
  currency: string;
  quantitySold: number;
  revenue: string;
}

export interface MerchantAnalytics {
  totalOrders: number;
  confirmedCompletedOrders: number;
  revenue: string;
  averageOrderValue: string;
  currency: string | null;
  topSellingProducts: ProductSales[];
  lowStockProducts: ProductSales[];
  inactiveProducts: ProductSales[];
  trends: TrendPoint[];
  forecast: TrendPoint[];
}

export interface MerchantOrderAnalytics {
  id: string;
  buyerId: string;
  totalAmount: string;
  currency: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  createdAt: Date;
}

export interface BuyerProductPurchase {
  productId: string;
  name: string;
  quantityPurchased: number;
  spending: string;
  currency: string;
}

export interface BuyerAnalytics {
  totalOrders: number;
  totalSpending: string;
  currency: string | null;
  mostPurchasedProducts: BuyerProductPurchase[];
  trends: TrendPoint[];
}

export interface BuyerOrderAnalytics {
  id: string;
  merchantId: string;
  totalAmount: string;
  currency: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  createdAt: Date;
}