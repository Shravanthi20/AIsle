import type { NextFunction, Request, Response } from 'express';
import { OrderService } from '../services/orderService.js';
import { HttpError, httpStatus } from '../utils/http.js';

export class OrderController {
  constructor(private readonly service = new OrderService()) {}
  private user(request: Request) {
    if (!request.user) throw new HttpError(httpStatus.unauthorized, 'Authentication required');
    return request.user;
  }
  checkout = async (request: Request, response: Response, next: NextFunction) => { try { response.status(httpStatus.created).json({ order: await this.service.checkout(this.user(request), request.body?.approvalId) }); } catch (error) { next(error); } };
  list = async (request: Request, response: Response, next: NextFunction) => { try { response.json({ orders: await this.service.list(this.user(request)) }); } catch (error) { next(error); } };
  get = async (request: Request, response: Response, next: NextFunction) => { try { response.json({ order: await this.service.get(this.user(request), request.params.id ?? '') }); } catch (error) { next(error); } };
}