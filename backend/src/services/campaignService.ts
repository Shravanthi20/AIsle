import type { AuthenticatedUser } from '../types/auth.js';
import type { Campaign, CampaignDelivery, CampaignDraftInput, CampaignEventType } from '../types/campaign.js';
import { CampaignRepository } from '../repositories/campaignRepository.js';
import { MerchantRepository } from '../repositories/merchantRepository.js';
import { ProductService } from './productService.js';
import { HttpError, httpStatus } from '../utils/http.js';
import { AuditService } from '../audit/auditService.js';

export class CampaignService {
  constructor(
    private readonly campaigns = new CampaignRepository(),
    private readonly products = new ProductService(),
    private readonly merchants = new MerchantRepository(),
    private readonly audits = new AuditService(),
  ) {}

  private async merchant(user: AuthenticatedUser): Promise<string> {
    if (user.role !== 'MERCHANT') throw new HttpError(httpStatus.forbidden, 'Merchant access required');
    const merchant = await this.merchants.getMerchantByUserId(user.id);
    if (!merchant) throw new HttpError(httpStatus.forbidden, 'Merchant profile not found');
    return merchant.id;
  }

  async create(user: AuthenticatedUser, input: CampaignDraftInput): Promise<Campaign> {
    const merchantId = await this.merchant(user);
    if (!input || typeof input.name !== 'string' || !input.name.trim()) throw new HttpError(httpStatus.badRequest, 'Campaign name is required');
    if (!['UPSELL', 'CROSS_SELL', 'REENGAGE'].includes(input.objective)) throw new HttpError(httpStatus.badRequest, 'Unsupported campaign objective');
    if (!Array.isArray(input.productIds) || !input.productIds.length) throw new HttpError(httpStatus.badRequest, 'At least one campaign product is required');
    const ownProducts = await this.products.list(user);
    const ownIds = new Set(ownProducts.filter((product) => product.status === 'ACTIVE' && product.stock > 0).map((product) => product.id));
    if (input.productIds.some((id) => !ownIds.has(id))) throw new HttpError(httpStatus.badRequest, 'Campaign products must be active, in-stock products owned by the merchant');
    const campaign = await this.campaigns.create(merchantId, { ...input, name: input.name.trim(), productIds: [...new Set(input.productIds)] });
    await this.audits.log({ user, merchantId, actorType: 'MERCHANT_AGENT', action: 'CAMPAIGN_DRAFT_CREATED', entityType: 'CAMPAIGN', entityId: campaign.id, context: { objective: campaign.objective, productIds: campaign.productIds, audience: campaign.audience }, decision: 'ALLOW', explanation: 'Campaign draft passed product ownership and availability validation.' });
    return campaign;
  }

  async list(user: AuthenticatedUser): Promise<Campaign[]> { return this.campaigns.list(await this.merchant(user)); }

  async approve(user: AuthenticatedUser, id: string): Promise<Campaign> {
    const merchantId = await this.merchant(user);
    const campaign = await this.campaigns.approve(id, merchantId);
    if (!campaign) throw new HttpError(httpStatus.conflict, 'Campaign cannot be approved from its current state');
    await this.audits.log({ user, merchantId, actorType: 'MERCHANT_AGENT', action: 'CAMPAIGN_APPROVAL', entityType: 'CAMPAIGN', entityId: id, decision: 'APPROVED', explanation: 'Merchant approved the validated campaign draft.' });
    return campaign;
  }

  async schedule(user: AuthenticatedUser, id: string): Promise<Campaign> {
    const merchantId = await this.merchant(user);
    const campaign = await this.campaigns.schedule(id, merchantId);
    if (!campaign) throw new HttpError(httpStatus.conflict, 'Only an approved campaign can be scheduled');
    await this.audits.log({ user, merchantId, actorType: 'MERCHANT_AGENT', action: 'CAMPAIGN_SCHEDULED', entityType: 'CAMPAIGN', entityId: id, decision: 'ALLOW', explanation: 'Campaign was scheduled after merchant approval.' });
    return campaign;
  }

  async run(user: AuthenticatedUser, id: string, recipients: string[]): Promise<{ runId: string; deliveries: CampaignDelivery[] }> {
    const merchantId = await this.merchant(user);
    const campaign = await this.campaigns.get(id, merchantId);
    if (!campaign || !['APPROVED', 'SCHEDULED'].includes(campaign.status)) throw new HttpError(httpStatus.conflict, 'Campaign must be approved or scheduled before execution');
    if (!Array.isArray(recipients) || recipients.length > 10000) throw new HttpError(httpStatus.badRequest, 'recipients must contain at most 10000 customer ids');
    const runId = await this.campaigns.createRun(id);
    const deliveries: CampaignDelivery[] = [];
    for (const recipientId of [...new Set(recipients)]) for (const productId of campaign.productIds) deliveries.push(await this.campaigns.queueDelivery(runId, recipientId, productId, `${id}:${recipientId}:${productId}:${runId}`));
    await this.audits.log({ user, merchantId, actorType: 'MERCHANT_AGENT', action: 'CAMPAIGN_RUN_CREATED', entityType: 'CAMPAIGN_RUN', entityId: runId, context: { campaignId: id, deliveryCount: deliveries.length }, decision: 'ALLOW', explanation: 'Campaign delivery jobs were queued with idempotency keys.' });
    return { runId, deliveries };
  }

  async event(user: AuthenticatedUser, id: string, eventType: CampaignEventType, input: { runId?: string; recipientId?: string; productId?: string; metadata?: Record<string, unknown> }): Promise<void> {
    const merchantId = await this.merchant(user);
    if (!['campaign_delivered', 'campaign_clicked', 'campaign_converted', 'recommendation_rejected', 'upsell_accepted', 'cross_sell_accepted'].includes(eventType)) throw new HttpError(httpStatus.badRequest, 'Unsupported campaign event');
    if (!await this.campaigns.get(id, merchantId)) throw new HttpError(httpStatus.notFound, 'Campaign not found');
    await this.campaigns.recordEvent(id, eventType, input);
  }
}
