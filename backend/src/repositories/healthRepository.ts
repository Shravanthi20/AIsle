import { checkDatabaseConnection } from '../config/database.js';

export class HealthRepository {
  async isDatabaseConnected(): Promise<boolean> {
    try {
      return await checkDatabaseConnection();
    } catch {
      return false;
    }
  }
}
