import { Router } from 'express';
import { MerchantAgentController } from '../controllers/merchantAgentController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';

const controller = new MerchantAgentController();
export const merchantAgentRoutes = Router();
merchantAgentRoutes.post('/agent/merchant/chat', requireAuth, requireRole('MERCHANT'), controller.chat);