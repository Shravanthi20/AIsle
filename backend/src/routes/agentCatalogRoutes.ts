import { Router } from 'express';
import { AgentCatalogController } from '../controllers/agentCatalogController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const controller = new AgentCatalogController();
export const agentCatalogRoutes = Router();

agentCatalogRoutes.use('/agent/catalog', requireAuth);
agentCatalogRoutes.get('/agent/catalog', controller.list);
agentCatalogRoutes.get('/agent/catalog/:productId', controller.get);
