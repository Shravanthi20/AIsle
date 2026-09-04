import type { AuthenticatedUser } from './auth.js';

export type PolicyAction = 'PURCHASE' | 'CHECKOUT' | 'PAYMENT';
export type PolicyDecision = 'ALLOW' | 'DENY' | 'REQUIRES_APPROVAL';

export interface Policy {
  id: string;
  buyerId: string;
  merchantId?: string | null;
  maxPurchaseAmount: number;
  approvalRequired: boolean;
  allowedActions: string[];
  blockedActions: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface PolicyEvaluation {
  decision: PolicyDecision;
  action: PolicyAction;
  amount: number;
  currency: string;
  policy: Policy;
  reason: string;
}

export interface PolicyInput {
  maxPurchaseAmount?: unknown;
  approvalRequired?: unknown;
  allowedActions?: unknown;
  blockedActions?: unknown;
  merchantId?: unknown;
}

export interface PolicyOwner {
  user: AuthenticatedUser;
  merchantId?: string;
}