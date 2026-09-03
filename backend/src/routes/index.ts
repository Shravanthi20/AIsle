import { Router } from 'express';

import { authRoutes } from './authRoutes.js';
import { healthRoutes } from './healthRoutes.js';
import { productRoutes } from './productRoutes.js';

export const apiRoutes = Router();

apiRoutes.use(authRoutes);
apiRoutes.use(healthRoutes);
apiRoutes.use(productRoutes);
