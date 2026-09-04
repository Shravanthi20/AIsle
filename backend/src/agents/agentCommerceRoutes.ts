import { Router } from 'express';
import { AgentCommerceController } from './agentCommerceController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';

const controller = new AgentCommerceController();
export const agentCommerceRoutes = Router();
agentCommerceRoutes.post('/agent/commerce/query', requireAuth, requireRole('BUYER'), controller.query);