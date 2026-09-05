import { pool } from '../database/db.js';

export interface ProductRelationship {
  productId: string;
  relatedProductId: string;
  coPurchaseCount: number;
}

export class ProductRelationshipRepository {
  async frequentlyBoughtTogether(productId: string, limit = 20): Promise<ProductRelationship[]> {
    const result = await pool.query<{ related_product_id: string; co_purchase_count: string }>(
      `SELECT oi2.product_id AS related_product_id, COUNT(DISTINCT oi1.order_id)::text AS co_purchase_count
       FROM order_items oi1
       JOIN orders o ON o.id = oi1.order_id
       JOIN order_items oi2 ON oi2.order_id = oi1.order_id AND oi2.product_id <> oi1.product_id
       WHERE oi1.product_id = $1 AND o.payment_status = 'PAID' AND o.status IN ('CONFIRMED', 'COMPLETED')
       GROUP BY oi2.product_id ORDER BY COUNT(DISTINCT oi1.order_id) DESC LIMIT $2`,
      [productId, limit],
    );
    return result.rows.map((row) => ({ productId, relatedProductId: row.related_product_id, coPurchaseCount: Number(row.co_purchase_count) }));
  }
}
