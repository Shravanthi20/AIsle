import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
dotenv.config({ path: path.join(repositoryRoot, '.env') });

const nodeEnv = process.env.NODE_ENV ?? 'development';
const jwtSecret = process.env.JWT_SECRET ?? (nodeEnv === 'production' ? '' : 'local-development-jwt-secret-change-me');
const databaseUrl = process.env.DATABASE_URL ?? (nodeEnv === 'production' ? '' : 'postgresql://aisle_user:aisle_password@localhost:5432/aisle_dev');

if (nodeEnv === 'production' && (jwtSecret.length < 32 || !databaseUrl)) {
  throw new Error('Required production environment configuration is missing');
}

export const env = {
  nodeEnv,
  port: Number(process.env.BACKEND_PORT ?? 4000),
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  jwtSecret,
  jwtExpiresInSeconds: Number(process.env.JWT_EXPIRES_IN_SECONDS ?? 60 * 60 * 24 * 7),
  databaseUrl,
  razorpayKeyId: process.env.RAZORPAY_KEY_ID ?? '',
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET ?? '',
  razorpayMode: process.env.RAZORPAY_MODE ?? 'test',
};
