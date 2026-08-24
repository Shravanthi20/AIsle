import type { Request, Response } from 'express';

import { HealthService } from '../services/healthService.js';

export class HealthController {
  constructor(private readonly healthService = new HealthService()) {}

  getHealth = async (_request: Request, response: Response): Promise<void> => {
    const health = await this.healthService.getHealthStatus();
    response.status(200).json(health);
  };
}
