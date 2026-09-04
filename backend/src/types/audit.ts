import type { AuthenticatedUser } from './auth.js';

export type AuditActorType = 'USER' | 'BUYER_AGENT' | 'MERCHANT_AGENT' | 'SYSTEM';

export interface AuditEvent {
  id: string;
  userId: string | null;
  buyerId: string | null;
  merchantId: string | null;
  actorType: AuditActorType;
  action: string;
  entityType: string;
  entityId: string | null;
  context: Record<string, unknown>;
  decision: string | null;
  explanation: string | null;
  createdAt: Date;
}

export interface AuditLogInput {
  user?: AuthenticatedUser;
  userId?: string | null;
  buyerId?: string | null;
  merchantId?: string | null;
  actorType: AuditActorType;
  action: string;
  entityType: string;
  entityId?: string | null;
  context?: Record<string, unknown>;
  decision?: string | null;
  explanation?: string | null;
}