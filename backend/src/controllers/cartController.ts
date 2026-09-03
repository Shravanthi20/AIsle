import type { NextFunction, Request, Response } from 'express';
import { CartService } from '../services/cartService.js';
import { HttpError, httpStatus } from '../utils/http.js';

export class CartController {
  constructor(private readonly service = new CartService()) {}
  private user(request: Request) {
    if (!request.user) throw new HttpError(httpStatus.unauthorized, 'Authentication required');
    return request.user;
  }
  get = async (request: Request, response: Response, next: NextFunction) => { try { response.json(await this.service.get(this.user(request))); } catch (error) { next(error); } };
  add = async (request: Request, response: Response, next: NextFunction) => { try { response.status(httpStatus.created).json(await this.service.add(this.user(request), request.body?.productId, request.body?.quantity)); } catch (error) { next(error); } };
  update = async (request: Request, response: Response, next: NextFunction) => { try { response.json(await this.service.update(this.user(request), request.params.productId ?? '', request.body?.quantity)); } catch (error) { next(error); } };
  remove = async (request: Request, response: Response, next: NextFunction) => { try { response.json(await this.service.remove(this.user(request), request.params.productId ?? '')); } catch (error) { next(error); } };
  clear = async (request: Request, response: Response, next: NextFunction) => { try { response.json(await this.service.clear(this.user(request))); } catch (error) { next(error); } };
}