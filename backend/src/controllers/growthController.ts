import type { NextFunction, Request, Response } from 'express';
import type { CampaignDraftInput, CampaignEventType } from '../types/campaign.js';
import { CampaignService } from '../services/campaignService.js';
import { GrowthOpportunityService } from '../services/growthOpportunityService.js';
import { HttpError, httpStatus } from '../utils/http.js';

export class GrowthController {
  constructor(private readonly opportunities = new GrowthOpportunityService(), private readonly campaigns = new CampaignService()) {}
  private user(request: Request) { if (!request.user) throw new HttpError(httpStatus.unauthorized, 'Authentication required'); return request.user; }
  private campaignId(request: Request): string { if (!request.params.id) throw new HttpError(httpStatus.badRequest, 'Campaign id is required'); return request.params.id; }
  opportunitiesList = async (request: Request, response: Response, next: NextFunction) => { try { response.json({ opportunities: await this.opportunities.list(this.user(request), typeof request.query.productId === 'string' ? request.query.productId : undefined) }); } catch (error) { next(error); } };
  campaignsList = async (request: Request, response: Response, next: NextFunction) => { try { response.json({ campaigns: await this.campaigns.list(this.user(request)) }); } catch (error) { next(error); } };
  createCampaign = async (request: Request, response: Response, next: NextFunction) => { try { response.status(201).json({ campaign: await this.campaigns.create(this.user(request), request.body as CampaignDraftInput) }); } catch (error) { next(error); } };
  approveCampaign = async (request: Request, response: Response, next: NextFunction) => { try { response.json({ campaign: await this.campaigns.approve(this.user(request), this.campaignId(request)) }); } catch (error) { next(error); } };
  scheduleCampaign = async (request: Request, response: Response, next: NextFunction) => { try { response.json({ campaign: await this.campaigns.schedule(this.user(request), this.campaignId(request)) }); } catch (error) { next(error); } };
  runCampaign = async (request: Request, response: Response, next: NextFunction) => { try { response.status(202).json(await this.campaigns.run(this.user(request), this.campaignId(request), request.body?.recipients)); } catch (error) { next(error); } };
  event = async (request: Request, response: Response, next: NextFunction) => { try { await this.campaigns.event(this.user(request), this.campaignId(request), request.body?.eventType as CampaignEventType, request.body); response.status(204).send(); } catch (error) { next(error); } };
}
