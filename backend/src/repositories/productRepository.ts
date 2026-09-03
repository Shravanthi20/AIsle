import { pool } from '../database/db.js';
import type { Product, ProductAttribute } from '../models/product.js';
import type { ProductStatus } from '../types/database.js';

interface ProductRecord {
  id: string;
  merchant_id: string;
  name: string;
  description: string | null;
  category: string;
  price: string;
  currency: string;
  stock: number;
  image_url: string | null;
  status: ProductStatus;
  created_at: Date;
  updated_at: Date;
}

interface ProductAttributeRecord {
  id: string;
  product_id: string;
  key: string;
  value: string;
  created_at: Date;
  updated_at: Date;
}

interface CreateProductInput {
  merchantId: string;
  name: string;
  description?: string | null;
  category: string;
  price: string;
  currency?: string;
  stock?: number;
  imageUrl?: string | null;
  status?: ProductStatus;
  attributes?: Record<string, string>;
}

interface UpdateProductInput {
  name?: string;
  description?: string | null;
  category?: string;
  price?: string;
  currency?: string;
  stock?: number;
  imageUrl?: string | null;
  status?: ProductStatus;
}

function mapProduct(record: ProductRecord): Product {
  return {
    id: record.id,
    merchantId: record.merchant_id,
    name: record.name,
    description: record.description,
    category: record.category,
    price: record.price,
    currency: record.currency,
    stock: record.stock,
    imageUrl: record.image_url,
    status: record.status,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

function mapProductAttribute(record: ProductAttributeRecord): ProductAttribute {
  return {
    id: record.id,
    productId: record.product_id,
    key: record.key,
    value: record.value,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

export class ProductRepository {
  async createProduct(input: CreateProductInput): Promise<Product> {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      const result = await client.query<ProductRecord>(
        `
          INSERT INTO products (
            merchant_id, name, description, category, price, currency, stock, image_url, status
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING id, merchant_id, name, description, category, price, currency, stock, image_url, status, created_at, updated_at
        `,
        [
          input.merchantId,
          input.name,
          input.description ?? null,
          input.category,
          input.price,
          input.currency ?? 'INR',
          input.stock ?? 0,
          input.imageUrl ?? null,
          input.status ?? 'ACTIVE',
        ],
      );
      const product = result.rows[0] as ProductRecord;

      for (const [key, value] of Object.entries(input.attributes ?? {})) {
        await client.query(
          `
            INSERT INTO product_attributes (product_id, key, value)
            VALUES ($1, $2, $3)
          `,
          [product.id, key, value],
        );
      }

      await client.query('COMMIT');
      return mapProduct(product);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getProductById(id: string): Promise<Product | null> {
    const result = await pool.query<ProductRecord>(
      `
        SELECT id, merchant_id, name, description, category, price, currency, stock, image_url, status, created_at, updated_at
        FROM products
        WHERE id = $1
      `,
      [id],
    );

    return result.rows[0] ? mapProduct(result.rows[0]) : null;
  }

  async getProductsByMerchant(merchantId: string): Promise<Product[]> {
    const result = await pool.query<ProductRecord>(
      `
        SELECT id, merchant_id, name, description, category, price, currency, stock, image_url, status, created_at, updated_at
        FROM products
        WHERE merchant_id = $1
        ORDER BY created_at DESC
      `,
      [merchantId],
    );

    return result.rows.map(mapProduct);
  }

  async getProductAttributes(productId: string): Promise<ProductAttribute[]> {
    const result = await pool.query<ProductAttributeRecord>(
      `
        SELECT id, product_id, key, value, created_at, updated_at
        FROM product_attributes
        WHERE product_id = $1
        ORDER BY key ASC
      `,
      [productId],
    );

    return result.rows.map(mapProductAttribute);
  }

  async updateStock(id: string, stock: number): Promise<Product | null> {
    const result = await pool.query<ProductRecord>(
      `
        UPDATE products
        SET stock = $2
        WHERE id = $1
        RETURNING id, merchant_id, name, description, category, price, currency, stock, image_url, status, created_at, updated_at
      `,
      [id, stock],
    );

    return result.rows[0] ? mapProduct(result.rows[0]) : null;
  }

  async updateProduct(id: string, input: UpdateProductInput): Promise<Product | null> {
    const result = await pool.query<ProductRecord>(
      `
        UPDATE products
        SET
          name = COALESCE($2, name),
          description = COALESCE($3, description),
          category = COALESCE($4, category),
          price = COALESCE($5, price),
          currency = COALESCE($6, currency),
          stock = COALESCE($7, stock),
          image_url = COALESCE($8, image_url),
          status = COALESCE($9, status)
        WHERE id = $1
        RETURNING id, merchant_id, name, description, category, price, currency, stock, image_url, status, created_at, updated_at
      `,
      [
        id,
        input.name ?? null,
        input.description ?? null,
        input.category ?? null,
        input.price ?? null,
        input.currency ?? null,
        input.stock ?? null,
        input.imageUrl ?? null,
        input.status ?? null,
      ],
    );

    return result.rows[0] ? mapProduct(result.rows[0]) : null;
  }

  async searchProducts(query: string): Promise<Product[]> {
    const result = await pool.query<ProductRecord>(
      `
        SELECT DISTINCT p.id, p.merchant_id, p.name, p.description, p.category, p.price, p.currency, p.stock, p.image_url, p.status, p.created_at, p.updated_at
        FROM products p
        LEFT JOIN product_attributes pa ON pa.product_id = p.id
        WHERE p.status = 'ACTIVE'
          AND (
            p.name ILIKE $1
            OR p.description ILIKE $1
            OR p.category ILIKE $1
            OR pa.key ILIKE $1
            OR pa.value ILIKE $1
          )
        ORDER BY p.created_at DESC
      `,
      [`%${query}%`],
    );

    return result.rows.map(mapProduct);
  }

  async deleteProduct(id: string): Promise<boolean> {
    const result = await pool.query('DELETE FROM products WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }
}
