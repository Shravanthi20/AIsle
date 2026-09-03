import { Router } from 'express';
import { ProductController } from '../controllers/productController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';

const controller = new ProductController();
export const productRoutes = Router();
productRoutes.use('/products', requireAuth, requireRole('MERCHANT'));
productRoutes.get('/products', controller.list);
productRoutes.get('/products/:id', controller.get);
productRoutes.post('/products', controller.create);
productRoutes.put('/products/:id', controller.update);
productRoutes.patch('/products/:id/stock', controller.stock);
productRoutes.delete('/products/:id', controller.deactivate);
