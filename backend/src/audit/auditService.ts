import { AuditRepository } from '../repositories/auditRepository.js';
import { MerchantRepository } from '../repositories/merchantRepository.js';
import type { AuthenticatedUser } from '../types/auth.js';
import type { AuditEvent, AuditLogInput } from '../types/audit.js';
import { HttpError, httpStatus } from '../utils/http.js';

const sensitive = /password|secret|token|signature|credential|api[_-]?key/i;
function clean(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(clean);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).filter(([key]) => !sensitive.test(key)).map(([key, item]) => [key, clean(item)]));
}

export class AuditService {
  constructor(private readonly audits = new AuditRepository(), private readonly merchants = new MerchantRepository()) {}

  async log(input: AuditLogInput): Promise<AuditEvent | null> {
    try { return await this.audits.create({ ...input, context: clean(input.context ?? {}) as Record<string, unknown> }); } catch (error) { console.error('Audit log failed', error instanceof Error ? error.message : 'unknown error'); return null; }
  }

  async list(user: AuthenticatedUser, limitInput?: unknown): Promise<AuditEvent[]> {
    const limit = limitInput === undefined ? 50 : Number(limitInput);
    if (!Number.isInteger(limit) || limit < 1 || limit > 200) throw new HttpError(httpStatus.badRequest, 'limit must be between 1 and 200');
    if (user.role === 'BUYER') return this.audits.listForBuyer(user.id, limit);
    if (user.role === 'MERCHANT') {
      const merchant = await this.merchants.getMerchantByUserId(user.id);
      if (!merchant) throw new HttpError(httpStatus.forbidden, 'Merchant profile not found');
      return this.audits.listForMerchant(merchant.id, user.id, limit);
    }
    throw new HttpError(httpStatus.forbidden, 'You do not have access to audit records');
  }
}