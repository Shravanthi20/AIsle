import { Router } from 'express';

import { AuthController } from '../controllers/authController.js';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';

const authController = new AuthController();

export const authRoutes = Router();

authRoutes.post('/auth/register', authController.register);
authRoutes.post('/auth/login', authController.login);
authRoutes.post('/auth/logout', requireAuth, authController.logout);
authRoutes.get('/auth/me', requireAuth, authController.me);
authRoutes.get('/auth/merchant', requireAuth, requireRole('MERCHANT'), authController.me);
authRoutes.get('/auth/buyer', requireAuth, requireRole('BUYER'), authController.me);
