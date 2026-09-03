import { Router } from 'express';

import { authRoutes } from './authRoutes.js';
import { healthRoutes } from './healthRoutes.js';

export const apiRoutes = Router();

apiRoutes.use(authRoutes);
apiRoutes.use(healthRoutes);
