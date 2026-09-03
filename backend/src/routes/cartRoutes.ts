import { Router } from 'express';
import { CartController } from '../controllers/cartController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';

const controller = new CartController();
export const cartRoutes = Router();
cartRoutes.use('/cart', requireAuth, requireRole('BUYER'));
cartRoutes.get('/cart', controller.get);
cartRoutes.post('/cart/items', controller.add);
cartRoutes.put('/cart/items/:productId', controller.update);
cartRoutes.delete('/cart/items/:productId', controller.remove);
cartRoutes.delete('/cart', controller.clear);