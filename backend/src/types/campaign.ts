export type CampaignObjective = 'UPSELL' | 'CROSS_SELL' | 'REENGAGE';
export type CampaignStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'SCHEDULED' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
export type CampaignEventType = 'campaign_delivered' | 'campaign_clicked' | 'campaign_converted' | 'recommendation_rejected' | 'upsell_accepted' | 'cross_sell_accepted';

export interface CampaignDraftInput {
  name: string;
  objective: CampaignObjective;
  audience: Record<string, unknown>;
  productIds: string[];
  content?: Record<string, unknown>;
  scheduleAt?: string;
}

export interface Campaign {
  id: string;
  merchantId: string;
  name: string;
  objective: CampaignObjective;
  status: CampaignStatus;
  audience: Record<string, unknown>;
  productIds: string[];
  content: Record<string, unknown>;
  scheduleAt: Date | null;
  approvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CampaignDelivery {
  id: string;
  runId: string;
  recipientId: string;
  productId: string;
  idempotencyKey: string;
  status: 'PENDING' | 'SENT' | 'FAILED' | 'SKIPPED';
  attempts: number;
  providerReference: string | null;
  lastError: string | null;
}
