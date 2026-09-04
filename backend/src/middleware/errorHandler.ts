import type { ErrorRequestHandler } from 'express';

import { HttpError, httpStatus } from '../utils/http.js';

export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  if (error instanceof HttpError) {
    response.status(error.statusCode).json({
      status: 'error',
      message: error.message,
    });
    return;
  }

  if (error instanceof SyntaxError && 'body' in error) {
    response.status(httpStatus.badRequest).json({
      status: 'error',
      message: 'Malformed JSON body',
    });
    return;
  }

  console.error(error);

  response.status(httpStatus.internalServerError).json({
    status: 'error',
    message: 'Internal server error',
  });
};
