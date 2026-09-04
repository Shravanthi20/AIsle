import type { NextFunction, Request, Response } from 'express';
import { AnalyticsService } from './analyticsService.js';
import { HttpError, httpStatus } from '../utils/http.js';

export class AnalyticsController {
  constructor(private readonly service = new AnalyticsService()) {}
  private user(request: Request) { if (!request.user) throw new HttpError(httpStatus.unauthorized, 'Authentication required'); return request.user; }
  private filter(request: Request) { return { startDate: typeof request.query.startDate === 'string' ? request.query.startDate : undefined, endDate: typeof request.query.endDate === 'string' ? request.query.endDate : undefined }; }
  merchant = async (request: Request, response: Response, next: NextFunction) => { try { response.json({ analytics: await this.service.merchant(this.user(request), this.filter(request)) }); } catch (error) { next(error); } };
  merchantProducts = async (request: Request, response: Response, next: NextFunction) => { try { response.json({ products: await this.service.merchantProducts(this.user(request), this.filter(request)) }); } catch (error) { next(error); } };
  merchantOrders = async (request: Request, response: Response, next: NextFunction) => { try { response.json({ orders: await this.service.merchantOrders(this.user(request), this.filter(request)) }); } catch (error) { next(error); } };
  buyer = async (request: Request, response: Response, next: NextFunction) => { try { response.json({ analytics: await this.service.buyer(this.user(request), this.filter(request)) }); } catch (error) { next(error); } };
  buyerOrders = async (request: Request, response: Response, next: NextFunction) => { try { response.json({ orders: await this.service.buyerOrders(this.user(request), this.filter(request)) }); } catch (error) { next(error); } };
}