import { pool } from '../database/db.js';
import type { AuditEvent, AuditLogInput } from '../types/audit.js';

interface AuditRecord { id: string; user_id: string | null; buyer_id: string | null; merchant_id: string | null; actor_type: AuditEvent['actorType']; action: string; entity_type: string; entity_id: string | null; context: Record<string, unknown>; decision: string | null; explanation: string | null; created_at: Date }
function map(row: AuditRecord): AuditEvent { return { id: row.id, userId: row.user_id, buyerId: row.buyer_id, merchantId: row.merchant_id, actorType: row.actor_type, action: row.action, entityType: row.entity_type, entityId: row.entity_id, context: row.context, decision: row.decision, explanation: row.explanation, createdAt: row.created_at }; }
const fields = 'id, user_id, buyer_id, merchant_id, actor_type, action, entity_type, entity_id, context, decision, explanation, created_at';

export class AuditRepository {
  async create(input: Required<Pick<AuditLogInput, 'actorType' | 'action' | 'entityType'>> & AuditLogInput): Promise<AuditEvent> {
    const result = await pool.query<AuditRecord>(`INSERT INTO audit_logs (user_id, buyer_id, merchant_id, actor_type, action, entity_type, entity_id, context, decision, explanation) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING ${fields}`, [input.userId ?? input.user?.id ?? null, input.buyerId ?? (input.user?.role === 'BUYER' ? input.user.id : null), input.merchantId ?? null, input.actorType, input.action, input.entityType, input.entityId ?? null, JSON.stringify(input.context ?? {}), input.decision ?? null, input.explanation ?? null]);
    return map(result.rows[0] as AuditRecord);
  }

  async listForBuyer(buyerId: string, limit: number): Promise<AuditEvent[]> { const result = await pool.query<AuditRecord>(`SELECT ${fields} FROM audit_logs WHERE buyer_id = $1 OR user_id = $1 ORDER BY created_at DESC LIMIT $2`, [buyerId, limit]); return result.rows.map(map); }
  async listForMerchant(merchantId: string, userId: string, limit: number): Promise<AuditEvent[]> { const result = await pool.query<AuditRecord>(`SELECT ${fields} FROM audit_logs WHERE merchant_id = $1 OR (user_id = $2 AND merchant_id IS NULL) ORDER BY created_at DESC LIMIT $3`, [merchantId, userId, limit]); return result.rows.map(map); }
}