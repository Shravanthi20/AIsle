import { pool } from '../database/db.js';
import type { AuthenticatedUser } from '../types/auth.js';
import type { UserRole } from '../types/database.js';

interface UserRecord extends AuthenticatedUser {
  password_hash: string;
}

interface CreateUserInput {
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
}

export class AuthRepository {
  async findUserByEmail(email: string): Promise<UserRecord | null> {
    const result = await pool.query<UserRecord>(
      `
        SELECT id, name, email, password_hash, role
        FROM users
        WHERE email = $1
      `,
      [email],
    );

    return result.rows[0] ?? null;
  }

  async createUser(input: CreateUserInput, storeName?: string): Promise<AuthenticatedUser> {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const result = await client.query<AuthenticatedUser>(
        `
        INSERT INTO users (name, email, password_hash, role)
        VALUES ($1, $2, $3, $4)
        RETURNING id, name, email, role
      `,
        [input.name, input.email, input.passwordHash, input.role],
      );

      const user = result.rows[0] as AuthenticatedUser;

      if (storeName) {
        await client.query(
          `
            INSERT INTO merchants (user_id, store_name)
            VALUES ($1, $2)
          `,
          [user.id, storeName],
        );
      }

      await client.query('COMMIT');

      return user;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
