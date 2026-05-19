import env from '../config/env.js';
import { AppError } from '../utils/AppError.js';

export const notFound = (req, res) => {
  res.status(404).json({
    error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.originalUrl} not found` },
  });
};

export const errorMiddleware = (err, req, res, _next) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: { code: err.code, message: err.message, details: err.details },
    });
  }

  if (err?.name === 'ValidationError' && err.details) {
    return res.status(422).json({
      error: { code: 'VALIDATION_ERROR', message: 'Invalid request', details: err.details },
    });
  }

  if (err?.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({
      error: { code: 'DUPLICATE', message: 'Resource already exists' },
    });
  }

  console.error('[unhandled]', err);
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: env.nodeEnv === 'production' ? 'Internal server error' : err.message,
    },
  });
};
