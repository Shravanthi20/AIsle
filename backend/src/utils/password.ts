import crypto from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(crypto.scrypt);
const keyLength = 64;

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = (await scrypt(password, salt, keyLength)) as Buffer;

  return `scrypt:${salt}:${derivedKey.toString('hex')}`;
}

export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  const [algorithm, salt, storedHash] = passwordHash.split(':');

  if (algorithm !== 'scrypt' || !salt || !storedHash) {
    return false;
  }

  const derivedKey = (await scrypt(password, salt, keyLength)) as Buffer;
  const storedKey = Buffer.from(storedHash, 'hex');

  return storedKey.length === derivedKey.length && crypto.timingSafeEqual(storedKey, derivedKey);
}
