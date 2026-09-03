import { MerchantAnalyticsService } from '../../services/merchantAnalyticsService.js';
import type { AuthenticatedUser } from '../../types/auth.js';

export class MerchantAnalyticsTool {
  constructor(private readonly analytics = new MerchantAnalyticsService()) {}

  execute(user: AuthenticatedUser) {
    return this.analytics.get(user);
  }
}