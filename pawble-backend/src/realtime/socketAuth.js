import { verifyToken } from '../utils/token.js';

export const socketAuth = (socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('UNAUTHENTICATED'));

  try {
    const payload = verifyToken(token);
    socket.data.user = {
      id: payload.sub,
      isAdmin: !!payload.isAdmin,
      isShelter: !!payload.isShelter,
    };
    next();
  } catch {
    next(new Error('INVALID_TOKEN'));
  }
};
