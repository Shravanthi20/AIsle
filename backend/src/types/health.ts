export interface HealthStatus {
  status: 'ok' | 'degraded';
  service: string;
  database: {
    connected: boolean;
  };
  timestamp: string;
}
