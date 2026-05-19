import { verifyToken } from '../utils/token.js';
import { AppError } from '../utils/AppError.js';

export const authMiddleware = (req, _res, next) => {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(new AppError('Missing or malformed Authorization header', 401, 'UNAUTHENTICATED'));
  }

  try {
    const payload = verifyToken(token);
    req.user = {
      id: payload.sub,
      isAdmin: !!payload.isAdmin,
      isShelter: !!payload.isShelter,
    };
    next();
  } catch (err) {
    next(new AppError('Invalid or expired token', 401, 'INVALID_TOKEN'));
  }
};
