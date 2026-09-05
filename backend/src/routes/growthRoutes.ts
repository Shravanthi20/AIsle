import { Router } from 'express';
import { GrowthController } from '../controllers/growthController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';

const controller = new GrowthController();
export const growthRoutes = Router();
growthRoutes.get('/growth/opportunities', requireAuth, requireRole('MERCHANT'), controller.opportunitiesList);
growthRoutes.get('/growth/campaigns', requireAuth, requireRole('MERCHANT'), controller.campaignsList);
growthRoutes.post('/growth/campaigns', requireAuth, requireRole('MERCHANT'), controller.createCampaign);
growthRoutes.post('/growth/campaigns/:id/approve', requireAuth, requireRole('MERCHANT'), controller.approveCampaign);
growthRoutes.post('/growth/campaigns/:id/schedule', requireAuth, requireRole('MERCHANT'), controller.scheduleCampaign);
growthRoutes.post('/growth/campaigns/:id/run', requireAuth, requireRole('MERCHANT'), controller.runCampaign);
growthRoutes.post('/growth/campaigns/:id/events', requireAuth, requireRole('MERCHANT'), controller.event);
