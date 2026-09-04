import { Router } from 'express';
import { AnalyticsController } from './analyticsController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';

const controller = new AnalyticsController();
export const analyticsRoutes = Router();
analyticsRoutes.get('/analytics/merchant', requireAuth, requireRole('MERCHANT'), controller.merchant);
analyticsRoutes.get('/analytics/merchant/products', requireAuth, requireRole('MERCHANT'), controller.merchantProducts);
analyticsRoutes.get('/analytics/merchant/orders', requireAuth, requireRole('MERCHANT'), controller.merchantOrders);
analyticsRoutes.get('/analytics/buyer', requireAuth, requireRole('BUYER'), controller.buyer);
analyticsRoutes.get('/analytics/buyer/orders', requireAuth, requireRole('BUYER'), controller.buyerOrders);