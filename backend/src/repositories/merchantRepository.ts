import { pool } from '../database/db.js';
import type { Merchant } from '../models/merchant.js';

interface MerchantRecord {
  id: string;
  user_id: string;
  store_name: string;
  description: string | null;
  created_at: Date;
  updated_at: Date;
}

interface CreateMerchantInput {
  userId: string;
  storeName: string;
  description?: string | null;
}

interface UpdateMerchantInput {
  storeName?: string;
  description?: string | null;
}

function mapMerchant(record: MerchantRecord): Merchant {
  return {
    id: record.id,
    userId: record.user_id,
    storeName: record.store_name,
    description: record.description,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

export class MerchantRepository {
  async createMerchant(input: CreateMerchantInput): Promise<Merchant> {
    const result = await pool.query<MerchantRecord>(
      `
        INSERT INTO merchants (user_id, store_name, description)
        VALUES ($1, $2, $3)
        RETURNING id, user_id, store_name, description, created_at, updated_at
      `,
      [input.userId, input.storeName, input.description ?? null],
    );

    return mapMerchant(result.rows[0] as MerchantRecord);
  }

  async getMerchantById(id: string): Promise<Merchant | null> {
    const result = await pool.query<MerchantRecord>(
      `
        SELECT id, user_id, store_name, description, created_at, updated_at
        FROM merchants
        WHERE id = $1
      `,
      [id],
    );

    return result.rows[0] ? mapMerchant(result.rows[0]) : null;
  }

  async getMerchantByUserId(userId: string): Promise<Merchant | null> {
    const result = await pool.query<MerchantRecord>(
      `
        SELECT id, user_id, store_name, description, created_at, updated_at
        FROM merchants
        WHERE user_id = $1
      `,
      [userId],
    );

    return result.rows[0] ? mapMerchant(result.rows[0]) : null;
  }

  async updateMerchant(id: string, input: UpdateMerchantInput): Promise<Merchant | null> {
    const result = await pool.query<MerchantRecord>(
      `
        UPDATE merchants
        SET
          store_name = COALESCE($2, store_name),
          description = COALESCE($3, description)
        WHERE id = $1
        RETURNING id, user_id, store_name, description, created_at, updated_at
      `,
      [id, input.storeName ?? null, input.description ?? null],
    );

    return result.rows[0] ? mapMerchant(result.rows[0]) : null;
  }
}
