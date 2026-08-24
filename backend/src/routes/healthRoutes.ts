import { Router } from 'express';

import { HealthController } from '../controllers/healthController.js';

const healthController = new HealthController();

export const healthRoutes = Router();

healthRoutes.get('/health', healthController.getHealth);
