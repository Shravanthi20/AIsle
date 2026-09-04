import { Router } from 'express';
import { FailureRecoveryController } from './failureRecoveryController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';
import { sensitiveRateLimit } from '../middleware/rateLimiters.js';

const controller = new FailureRecoveryController();
export const failureRecoveryRoutes = Router();
failureRecoveryRoutes.use(requireAuth, requireRole('BUYER'), sensitiveRateLimit);
failureRecoveryRoutes.post('/payments/:id/retry', controller.retryPayment);
failureRecoveryRoutes.get('/orders/:id/status', controller.status);