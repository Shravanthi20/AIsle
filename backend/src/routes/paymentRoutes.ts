import { Router } from 'express';
import { PaymentController } from '../controllers/paymentController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';
import { sensitiveRateLimit } from '../middleware/rateLimiters.js';

const controller = new PaymentController();
export const paymentRoutes = Router();
paymentRoutes.use('/payments', requireAuth, requireRole('BUYER'), sensitiveRateLimit);
paymentRoutes.post('/payments/create-order', controller.createOrder);
paymentRoutes.post('/payments/verify', controller.verify);
paymentRoutes.post('/payments/failure', controller.failure);