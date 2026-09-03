import { Router } from 'express';

import { BuyerAgentController } from '../controllers/buyerAgentController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';

const controller = new BuyerAgentController();
export const buyerAgentRoutes = Router();
buyerAgentRoutes.post('/agent/buyer/chat', requireAuth, requireRole('BUYER'), controller.chat);