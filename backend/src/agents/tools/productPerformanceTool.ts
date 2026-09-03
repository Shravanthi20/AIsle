import { MerchantAnalyticsService } from '../../services/merchantAnalyticsService.js';
import type { AuthenticatedUser } from '../../types/auth.js';

export class ProductPerformanceTool {
  constructor(private readonly analytics = new MerchantAnalyticsService()) {}

  async execute(user: AuthenticatedUser) {
    return (await this.analytics.get(user)).productPerformance;
  }
}