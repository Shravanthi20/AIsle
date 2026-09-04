import { Router } from 'express';

import { AuthController } from '../controllers/authController.js';
import { requireAuth } from '../middleware/authMiddleware.js';
import { requireRole } from '../middleware/roleMiddleware.js';
import { authRateLimit } from '../middleware/rateLimiters.js';

const authController = new AuthController();

export const authRoutes = Router();

authRoutes.post('/auth/register', authRateLimit, authController.register);
authRoutes.post('/auth/login', authRateLimit, authController.login);
authRoutes.post('/auth/logout', requireAuth, authController.logout);
authRoutes.get('/auth/me', requireAuth, authController.me);
authRoutes.get('/auth/merchant', requireAuth, requireRole('MERCHANT'), authController.me);
authRoutes.get('/auth/buyer', requireAuth, requireRole('BUYER'), authController.me);
