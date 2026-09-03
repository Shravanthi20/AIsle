import type { NextFunction, Request, Response } from 'express';
import { PaymentService } from '../services/paymentService.js';
import { HttpError, httpStatus } from '../utils/http.js';

export class PaymentController {
  constructor(private readonly service = new PaymentService()) {}
  private buyer(request: Request) {
    if (!request.user) throw new HttpError(httpStatus.unauthorized, 'Authentication required');
    return request.user;
  }
  createOrder = async (request: Request, response: Response, next: NextFunction) => {
    try { response.status(httpStatus.created).json(await this.service.createOrder(this.buyer(request), request.body)); } catch (error) { next(error); }
  };
  verify = async (request: Request, response: Response, next: NextFunction) => {
    try { response.json(await this.service.verify(this.buyer(request), request.body)); } catch (error) { next(error); }
  };
  failure = async (request: Request, response: Response, next: NextFunction) => {
    try { response.json(await this.service.failure(this.buyer(request), request.body)); } catch (error) { next(error); }
  };
}