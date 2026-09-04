import { Router } from 'express';
import { ApprovalController } from './approvalController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';

const controller = new ApprovalController();
export const approvalRoutes = Router();
approvalRoutes.use('/approvals', requireAuth, requireRole('BUYER'));
approvalRoutes.post('/approvals', controller.create);
approvalRoutes.get('/approvals', controller.list);
approvalRoutes.post('/approvals/:id/approve', controller.approve);
approvalRoutes.post('/approvals/:id/reject', controller.reject);