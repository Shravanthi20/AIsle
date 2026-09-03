import { pool } from '../database/db.js';
import type { Cart, CartItem } from '../models/cart.js';

interface CartRecord {
  id: string;
  buyer_id: string;
  created_at: Date;
  updated_at: Date;
}

interface CartItemRecord {
  id: string;
  cart_id: string;
  product_id: string;
  quantity: number;
  created_at: Date;
  updated_at: Date;
}

function mapCart(record: CartRecord): Cart {
  return {
    id: record.id,
    buyerId: record.buyer_id,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

function mapCartItem(record: CartItemRecord): CartItem {
  return {
    id: record.id,
    cartId: record.cart_id,
    productId: record.product_id,
    quantity: record.quantity,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

export class CartRepository {
  async getCart(buyerId: string): Promise<Cart | null> {
    const result = await pool.query<CartRecord>(
      `
        SELECT id, buyer_id, created_at, updated_at
        FROM carts
        WHERE buyer_id = $1
      `,
      [buyerId],
    );

    return result.rows[0] ? mapCart(result.rows[0]) : null;
  }

  async createCart(buyerId: string): Promise<Cart> {
    const result = await pool.query<CartRecord>(
      `
        INSERT INTO carts (buyer_id)
        VALUES ($1)
        ON CONFLICT (buyer_id) DO UPDATE SET buyer_id = EXCLUDED.buyer_id
        RETURNING id, buyer_id, created_at, updated_at
      `,
      [buyerId],
    );

    return mapCart(result.rows[0] as CartRecord);
  }

  async addItem(cartId: string, productId: string, quantity: number): Promise<CartItem> {
    const result = await pool.query<CartItemRecord>(
      `
        INSERT INTO cart_items (cart_id, product_id, quantity)
        VALUES ($1, $2, $3)
        ON CONFLICT (cart_id, product_id)
        DO UPDATE SET quantity = cart_items.quantity + EXCLUDED.quantity
        RETURNING id, cart_id, product_id, quantity, created_at, updated_at
      `,
      [cartId, productId, quantity],
    );

    return mapCartItem(result.rows[0] as CartItemRecord);
  }

  async updateItemQuantity(
    cartId: string,
    productId: string,
    quantity: number,
  ): Promise<CartItem | null> {
    const result = await pool.query<CartItemRecord>(
      `
        UPDATE cart_items
        SET quantity = $3
        WHERE cart_id = $1 AND product_id = $2
        RETURNING id, cart_id, product_id, quantity, created_at, updated_at
      `,
      [cartId, productId, quantity],
    );

    return result.rows[0] ? mapCartItem(result.rows[0]) : null;
  }

  async removeItem(cartId: string, productId: string): Promise<boolean> {
    const result = await pool.query(
      'DELETE FROM cart_items WHERE cart_id = $1 AND product_id = $2',
      [cartId, productId],
    );

    return (result.rowCount ?? 0) > 0;
  }

  async clearCart(cartId: string): Promise<void> {
    await pool.query('DELETE FROM cart_items WHERE cart_id = $1', [cartId]);
  }
}
