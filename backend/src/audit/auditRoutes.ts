import { Router } from 'express';
import { AuditController } from './auditController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';

const controller = new AuditController();
export const auditRoutes = Router();
auditRoutes.get('/audit', requireAuth, requireRole('BUYER', 'MERCHANT'), controller.list);