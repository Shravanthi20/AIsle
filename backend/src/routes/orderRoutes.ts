import { Router } from 'express';
import { OrderController } from '../controllers/orderController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';

const controller = new OrderController();
export const orderRoutes = Router();
orderRoutes.use('/orders', requireAuth, requireRole('BUYER', 'MERCHANT'));
orderRoutes.post('/orders/checkout', requireRole('BUYER'), controller.checkout);
orderRoutes.get('/orders', controller.list);
orderRoutes.get('/orders/:id', controller.get);