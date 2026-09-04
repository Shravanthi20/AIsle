import { Router } from 'express';
import { PolicyController } from './policyController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';

const controller = new PolicyController();
export const policyRoutes = Router();
policyRoutes.use('/policies', requireAuth, requireRole('BUYER'));
policyRoutes.post('/policies', controller.create);
policyRoutes.get('/policies', controller.list);
policyRoutes.put('/policies/:id', controller.update);