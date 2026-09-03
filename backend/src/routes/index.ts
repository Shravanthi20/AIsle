import { Router } from 'express';

import { agentCatalogRoutes } from './agentCatalogRoutes.js';
import { authRoutes } from './authRoutes.js';
import { cartRoutes } from './cartRoutes.js';
import { healthRoutes } from './healthRoutes.js';
import { productRoutes } from './productRoutes.js';
import { productSearchRoutes } from './productSearchRoutes.js';
import { recommendationRoutes } from './recommendationRoutes.js';
import { orderRoutes } from './orderRoutes.js';
import { paymentRoutes } from './paymentRoutes.js';
import { buyerAgentRoutes } from './buyerAgentRoutes.js';
import { merchantAgentRoutes } from './merchantAgentRoutes.js';

export const apiRoutes = Router();

apiRoutes.use(authRoutes);
apiRoutes.use(agentCatalogRoutes);
apiRoutes.use(productSearchRoutes);
apiRoutes.use(recommendationRoutes);
apiRoutes.use(healthRoutes);
apiRoutes.use(productRoutes);
apiRoutes.use(cartRoutes);
apiRoutes.use(orderRoutes);
apiRoutes.use(paymentRoutes);
apiRoutes.use(buyerAgentRoutes);
apiRoutes.use(merchantAgentRoutes);
