import crypto from 'node:crypto';

import { env } from '../config/env.js';
import type { AuthenticatedUser } from '../types/auth.js';
import { HttpError, httpStatus } from './http.js';

interface JwtPayload extends AuthenticatedUser {
  exp: number;
}

function base64UrlEncode(value: Buffer | string): string {
  return Buffer.from(value).toString('base64url');
}

function base64UrlDecode(value: string): string {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function sign(value: string): string {
  return crypto.createHmac('sha256', env.jwtSecret).update(value).digest('base64url');
}

export function createAuthToken(user: AuthenticatedUser): string {
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = base64UrlEncode(
    JSON.stringify({
      ...user,
      exp: Math.floor(Date.now() / 1000) + env.jwtExpiresInSeconds,
    } satisfies JwtPayload),
  );
  const unsignedToken = `${header}.${payload}`;

  return `${unsignedToken}.${sign(unsignedToken)}`;
}

export function verifyAuthToken(token: string): AuthenticatedUser {
  const [header, payload, signature] = token.split('.');

  if (!header || !payload || !signature) {
    throw new HttpError(httpStatus.unauthorized, 'Invalid authentication token');
  }

  try {
    const decodedHeader = JSON.parse(base64UrlDecode(header)) as { alg?: string; typ?: string };
    if (decodedHeader.alg !== 'HS256' || decodedHeader.typ !== 'JWT') {
      throw new Error('Unsupported token');
    }
  } catch {
    throw new HttpError(httpStatus.unauthorized, 'Invalid authentication token');
  }

  const expectedSignature = sign(`${header}.${payload}`);
  const signatureBuffer = Buffer.from(signature);
  const expectedSignatureBuffer = Buffer.from(expectedSignature);

  if (
    signatureBuffer.length !== expectedSignatureBuffer.length ||
    !crypto.timingSafeEqual(signatureBuffer, expectedSignatureBuffer)
  ) {
    throw new HttpError(httpStatus.unauthorized, 'Invalid authentication token');
  }

  let decodedPayload: JwtPayload;

  try {
    decodedPayload = JSON.parse(base64UrlDecode(payload)) as JwtPayload;
  } catch {
    throw new HttpError(httpStatus.unauthorized, 'Invalid authentication token');
  }

  if (
    !decodedPayload.id ||
    !decodedPayload.name ||
    !decodedPayload.email ||
    (decodedPayload.role !== 'MERCHANT' && decodedPayload.role !== 'BUYER') ||
    !Number.isFinite(decodedPayload.exp)
  ) {
    throw new HttpError(httpStatus.unauthorized, 'Invalid authentication token');
  }

  if (decodedPayload.exp < Math.floor(Date.now() / 1000)) {
    throw new HttpError(httpStatus.unauthorized, 'Authentication token expired');
  }

  return {
    id: decodedPayload.id,
    name: decodedPayload.name,
    email: decodedPayload.email,
    role: decodedPayload.role,
  };
}
