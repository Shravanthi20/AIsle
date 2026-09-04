import type { PolicyAction } from './policy.js';

export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CONSUMED' | 'EXPIRED';

export interface Approval {
  id: string;
  buyerId: string;
  action: PolicyAction;
  amount: number;
  currency: string;
  cartSnapshot: unknown;
  status: ApprovalStatus;
  expiresAt: Date;
  approvedAt?: Date | null;
  rejectedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}