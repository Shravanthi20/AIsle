import { ApprovalRepository } from '../repositories/approvalRepository.js';
import { CartService } from '../services/cartService.js';
import type { AuthenticatedUser } from '../types/auth.js';
import type { Approval } from '../types/approval.js';
import type { PolicyAction } from '../types/policy.js';
import { HttpError, httpStatus } from '../utils/http.js';
import { PolicyService } from './policyService.js';
import { AuditService } from '../audit/auditService.js';

export class ApprovalService {
  constructor(private readonly approvals = new ApprovalRepository(), private readonly cart = new CartService(), private readonly policies = new PolicyService(), private readonly audits = new AuditService()) {}

  async create(user: AuthenticatedUser, action: PolicyAction = 'PURCHASE'): Promise<Approval> {
    this.buyer(user);
    const summary = await this.cart.get(user);
    if (!summary.items.length) throw new HttpError(httpStatus.conflict, 'Your cart is empty');
    const merchantIds = [...new Set(summary.items.map((item) => item.merchantId))];
    const evaluation = await this.policies.evaluate(user, action, Number(summary.subtotal), summary.currency, merchantIds.length === 1 ? merchantIds[0] : undefined);
    if (evaluation.decision === 'DENY') throw new HttpError(httpStatus.forbidden, evaluation.reason);
    if (evaluation.decision === 'ALLOW') throw new HttpError(httpStatus.conflict, 'This action does not require approval');
    const approval = await this.approvals.create({ buyerId: user.id, action, amount: Number(summary.subtotal), currency: summary.currency, cartSnapshot: summary, expiresAt: new Date(Date.now() + 15 * 60 * 1000) });
    await this.audits.log({ user, buyerId: user.id, actorType: 'USER', action: 'APPROVAL_REQUESTED', entityType: 'APPROVAL', entityId: approval.id, context: { amount: approval.amount, currency: approval.currency, action: approval.action }, decision: 'PENDING', explanation: 'Approval requested for the current backend cart total.' });
    return approval;
  }

  async list(user: AuthenticatedUser): Promise<Approval[]> { this.buyer(user); return this.approvals.listByBuyer(user.id); }

  async approve(user: AuthenticatedUser, id: string): Promise<Approval> { this.buyer(user); return this.decide(user, id, 'APPROVED'); }
  async reject(user: AuthenticatedUser, id: string): Promise<Approval> { this.buyer(user); return this.decide(user, id, 'REJECTED'); }

  async consumeForCheckout(user: AuthenticatedUser, id: string, amount: number, currency: string): Promise<void> {
    this.buyer(user);
    if (!(await this.approvals.consumeForCheckout(id, user.id, amount, currency))) throw new HttpError(httpStatus.conflict, 'Approval is invalid, expired, already used, or does not match the current total');
  }

  private async decide(user: AuthenticatedUser, id: string, status: 'APPROVED' | 'REJECTED') {
    const existing = await this.approvals.getById(id, user.id);
    if (!existing) throw new HttpError(httpStatus.notFound, 'Approval not found');
    if (existing.status !== 'PENDING') throw new HttpError(httpStatus.conflict, 'Approval has already been decided or expired');
    const result = await this.approvals.decide(id, user.id, status);
    if (!result) throw new HttpError(httpStatus.conflict, 'Approval has already been decided or expired');
    await this.audits.log({ user, buyerId: user.id, actorType: 'USER', action: status === 'APPROVED' ? 'APPROVAL_APPROVED' : 'APPROVAL_REJECTED', entityType: 'APPROVAL', entityId: result.id, context: { amount: result.amount, currency: result.currency }, decision: status, explanation: `Buyer ${status.toLowerCase()} the approval request.` });
    return result;
  }

  private buyer(user: AuthenticatedUser): void { if (user.role !== 'BUYER') throw new HttpError(httpStatus.forbidden, 'Buyer access required'); }
}