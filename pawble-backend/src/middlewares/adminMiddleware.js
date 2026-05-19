import { AppError } from '../utils/AppError.js';

export const adminMiddleware = (req, _res, next) => {
  if (!req.user?.isAdmin) {
    return next(new AppError('Admin access required', 403, 'FORBIDDEN'));
  }
  next();
};
