import { HealthRepository } from '../repositories/healthRepository.js';
import type { HealthStatus } from '../types/health.js';

export class HealthService {
  constructor(private readonly healthRepository = new HealthRepository()) {}

  async getHealthStatus(): Promise<HealthStatus> {
    const databaseConnected = await this.healthRepository.isDatabaseConnected();

    return {
      status: databaseConnected ? 'ok' : 'degraded',
      service: 'aisle-backend',
      database: {
        connected: databaseConnected,
      },
      timestamp: new Date().toISOString(),
    };
  }
}
