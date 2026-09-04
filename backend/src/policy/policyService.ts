import { PolicyRepository } from '../repositories/policyRepository.js';
import type { AuthenticatedUser } from '../types/auth.js';
import type { PolicyAction, Policy, PolicyEvaluation, PolicyInput } from '../types/policy.js';
import { HttpError, httpStatus } from '../utils/http.js';
import { AuditService } from '../audit/auditService.js';

const actions: PolicyAction[] = ['PURCHASE', 'CHECKOUT', 'PAYMENT'];
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class PolicyService {
  constructor(private readonly policies = new PolicyRepository(), private readonly audits = new AuditService()) {}

  async list(user: AuthenticatedUser): Promise<Policy[]> {
    this.buyer(user);
    return this.policies.listByBuyer(user.id);
  }

  async create(user: AuthenticatedUser, input: PolicyInput): Promise<Policy> {
    this.buyer(user);
    return this.policies.create(user.id, this.validate(input));
  }

  async update(user: AuthenticatedUser, id: string, input: PolicyInput): Promise<Policy> {
    this.buyer(user);
    const policy = await this.policies.update(id, user.id, this.validate(input));
    if (!policy) throw new HttpError(httpStatus.notFound, 'Policy not found');
    return policy;
  }

  async evaluate(user: AuthenticatedUser, action: PolicyAction, amount: number, currency: string, merchantId?: string): Promise<PolicyEvaluation> {
    this.buyer(user);
    if (!actions.includes(action)) throw new HttpError(httpStatus.badRequest, 'Unsupported policy action');
    if (!Number.isFinite(amount) || amount < 0) throw new HttpError(httpStatus.badRequest, 'Amount must be a non-negative number');
    const policy = await this.policies.getByBuyer(user.id, merchantId) ?? await this.policies.create(user.id, this.defaultInput());
    if (policy.blockedActions.includes(action)) return this.result(user, { decision: 'DENY', action, amount, currency, policy, reason: 'This action is blocked by your policy.' });
    if (policy.allowedActions.length && !policy.allowedActions.includes(action)) return this.result(user, { decision: 'DENY', action, amount, currency, policy, reason: 'This action is not allowed by your policy.' });
    if (amount > policy.maxPurchaseAmount) {
      const decision = policy.approvalRequired ? 'REQUIRES_APPROVAL' : 'DENY';
      return this.result(user, { decision, action, amount, currency, policy, reason: decision === 'DENY' ? 'The amount exceeds your automatic purchase limit.' : `Approval required because the amount ${currency} ${amount.toLocaleString('en-IN')} exceeds your automatic purchase limit of ${currency} ${policy.maxPurchaseAmount.toLocaleString('en-IN')}.` });
    }
    return this.result(user, { decision: 'ALLOW', action, amount, currency, policy, reason: 'The action is within your configured policy.' });
  }

  private async result(user: AuthenticatedUser, evaluation: PolicyEvaluation): Promise<PolicyEvaluation> {
    await this.audits.log({ user, buyerId: user.id, actorType: 'SYSTEM', action: 'POLICY_DECISION', entityType: 'POLICY', entityId: evaluation.policy.id, context: { action: evaluation.action, amount: evaluation.amount, currency: evaluation.currency }, decision: evaluation.decision, explanation: evaluation.reason });
    return evaluation;
  }

  private buyer(user: AuthenticatedUser): void { if (user.role !== 'BUYER') throw new HttpError(httpStatus.forbidden, 'Buyer access required'); }

  private validate(input: PolicyInput) {
    const max = input.maxPurchaseAmount === undefined ? 5000 : Number(input.maxPurchaseAmount);
    if (!Number.isFinite(max) || max < 0) throw new HttpError(httpStatus.badRequest, 'maxPurchaseAmount must be non-negative');
    const approvalRequired = input.approvalRequired === undefined ? true : input.approvalRequired;
    if (typeof approvalRequired !== 'boolean') throw new HttpError(httpStatus.badRequest, 'approvalRequired must be boolean');
    const parse = (value: unknown, name: string, fallback: string[]) => {
      if (value === undefined) return fallback;
      if (!Array.isArray(value) || value.some((item) => typeof item !== 'string' || !actions.includes(item as PolicyAction))) throw new HttpError(httpStatus.badRequest, `${name} contains an unsupported action`);
      return [...new Set(value)];
    };
    const allowedActions = parse(input.allowedActions, 'allowedActions', ['PURCHASE']);
    const blockedActions = parse(input.blockedActions, 'blockedActions', []);
    if (blockedActions.includes('PURCHASE') && allowedActions.includes('PURCHASE')) throw new HttpError(httpStatus.badRequest, 'PURCHASE cannot be both allowed and blocked');
    const merchantId = input.merchantId === undefined || input.merchantId === null || input.merchantId === '' ? null : String(input.merchantId);
    if (merchantId !== null && !uuid.test(merchantId)) throw new HttpError(httpStatus.badRequest, 'merchantId is invalid');
    return { maxPurchaseAmount: max, approvalRequired, allowedActions, blockedActions, merchantId };
  }

  private defaultInput() { return { maxPurchaseAmount: 5000, approvalRequired: true, allowedActions: ['PURCHASE'], blockedActions: [], merchantId: null }; }
}