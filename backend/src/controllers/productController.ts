import type { NextFunction, Request, Response } from 'express';
import { ProductService } from '../services/productService.js';
import { HttpError, httpStatus } from '../utils/http.js';

export class ProductController {
  constructor(private readonly service = new ProductService()) {}
  private user(request: Request) {
    if (!request.user) throw new HttpError(httpStatus.unauthorized, 'Authentication required');
    return request.user;
  }
  list = async (request: Request, response: Response, next: NextFunction) => {
    try {
      response.json({ products: await this.service.list(this.user(request)) });
    } catch (error) {
      next(error);
    }
  };
  get = async (request: Request, response: Response, next: NextFunction) => {
    try {
      response.json({
        product: await this.service.get(this.user(request), request.params.id ?? ''),
      });
    } catch (error) {
      next(error);
    }
  };
  create = async (request: Request, response: Response, next: NextFunction) => {
    try {
      response
        .status(httpStatus.created)
        .json({ product: await this.service.create(this.user(request), request.body) });
    } catch (error) {
      next(error);
    }
  };
  update = async (request: Request, response: Response, next: NextFunction) => {
    try {
      response.json({
        product: await this.service.update(
          this.user(request),
          request.params.id ?? '',
          request.body,
        ),
      });
    } catch (error) {
      next(error);
    }
  };
  deactivate = async (request: Request, response: Response, next: NextFunction) => {
    try {
      response.json({
        product: await this.service.deactivate(this.user(request), request.params.id ?? ''),
      });
    } catch (error) {
      next(error);
    }
  };
  stock = async (request: Request, response: Response, next: NextFunction) => {
    try {
      response.json({
        product: await this.service.stock(
          this.user(request),
          request.params.id ?? '',
          request.body,
        ),
      });
    } catch (error) {
      next(error);
    }
  };
}
