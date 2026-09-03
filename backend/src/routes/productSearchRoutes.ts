import { Router } from 'express';
import { ProductSearchController } from '../controllers/productSearchController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';
const controller = new ProductSearchController();
export const productSearchRoutes = Router();
productSearchRoutes.use('/products/search', requireAuth, requireRole('BUYER'));
productSearchRoutes.get('/products/search', controller.list);
productSearchRoutes.get('/products/search/:productId', controller.get);
