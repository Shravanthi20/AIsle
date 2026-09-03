import { Router } from 'express';
import { RecommendationController } from '../controllers/recommendationController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';
const controller = new RecommendationController();
export const recommendationRoutes = Router();
recommendationRoutes.post(
  '/recommendations',
  requireAuth,
  requireRole('BUYER'),
  controller.recommend,
);
