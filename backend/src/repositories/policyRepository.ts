import { pool } from '../database/db.js';
import type { Policy, PolicyInput } from '../types/policy.js';

interface PolicyRecord { id: string; buyer_id: string; merchant_id: string | null; max_purchase_amount: string; approval_required: boolean; allowed_actions: string[]; blocked_actions: string[]; created_at: Date; updated_at: Date }
function map(record: PolicyRecord): Policy { return { id: record.id, buyerId: record.buyer_id, merchantId: record.merchant_id, maxPurchaseAmount: Number(record.max_purchase_amount), approvalRequired: record.approval_required, allowedActions: record.allowed_actions, blockedActions: record.blocked_actions, createdAt: record.created_at, updatedAt: record.updated_at }; }
const fields = 'id, buyer_id, merchant_id, max_purchase_amount, approval_required, allowed_actions, blocked_actions, created_at, updated_at';

export class PolicyRepository {
  async getByBuyer(buyerId: string, merchantId?: string): Promise<Policy | null> { const result = await pool.query<PolicyRecord>(`SELECT ${fields} FROM policies WHERE buyer_id = $1 AND (merchant_id = $2 OR merchant_id IS NULL) ORDER BY CASE WHEN merchant_id = $2 THEN 0 ELSE 1 END LIMIT 1`, [buyerId, merchantId ?? null]); return result.rows[0] ? map(result.rows[0]) : null; }
  async listByBuyer(buyerId: string): Promise<Policy[]> { const result = await pool.query<PolicyRecord>(`SELECT ${fields} FROM policies WHERE buyer_id = $1 ORDER BY created_at DESC`, [buyerId]); return result.rows.map(map); }
  async create(buyerId: string, input: Required<Pick<PolicyInput, 'maxPurchaseAmount' | 'approvalRequired' | 'allowedActions' | 'blockedActions'>> & { merchantId: string | null }): Promise<Policy> {
    const result = await pool.query<PolicyRecord>(`INSERT INTO policies (buyer_id, merchant_id, max_purchase_amount, approval_required, allowed_actions, blocked_actions) VALUES ($1, $2, $3, $4, $5, $6) RETURNING ${fields}`, [buyerId, input.merchantId, input.maxPurchaseAmount, input.approvalRequired, input.allowedActions, input.blockedActions]); return map(result.rows[0] as PolicyRecord);
  }
  async update(id: string, buyerId: string, input: Required<Pick<PolicyInput, 'maxPurchaseAmount' | 'approvalRequired' | 'allowedActions' | 'blockedActions'>> & { merchantId: string | null }): Promise<Policy | null> {
    const result = await pool.query<PolicyRecord>(`UPDATE policies SET merchant_id = $3, max_purchase_amount = $4, approval_required = $5, allowed_actions = $6, blocked_actions = $7 WHERE id = $1 AND buyer_id = $2 RETURNING ${fields}`, [id, buyerId, input.merchantId, input.maxPurchaseAmount, input.approvalRequired, input.allowedActions, input.blockedActions]); return result.rows[0] ? map(result.rows[0]) : null;
  }
}