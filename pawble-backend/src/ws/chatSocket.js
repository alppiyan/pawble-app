import { Server } from 'socket.io';
import env from '../config/env.js';
import { verifyToken } from '../utils/token.js';
import { chatService } from '../services/chatService.js';

const userRoom = (userId) => `user:${userId}`;

export function attachChatSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: env.corsOrigin === '*' ? true : env.corsOrigin.split(',').map((s) => s.trim()),
      credentials: true,
    },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) return next(new Error('UNAUTHENTICATED'));
    try {
      const payload = verifyToken(token);
      socket.data.userId = Number(payload.sub);
      next();
    } catch {
      next(new Error('INVALID_TOKEN'));
    }
  });

  io.on('connection', (socket) => {
    const { userId } = socket.data;
    socket.join(userRoom(userId));

    socket.on('message:send', async (payload, ack) => {
      try {
        const receiverId = Number(payload?.receiverId);
        const content = String(payload?.content ?? '').trim();
        if (!receiverId || !content) {
          return ack?.({ ok: false, error: 'INVALID_PAYLOAD' });
        }
        if (content.length > 2000) {
          return ack?.({ ok: false, error: 'CONTENT_TOO_LONG' });
        }

        const message = await chatService.sendMessage({
          senderId: userId,
          receiverId,
          content,
        });

        io.to(userRoom(userId)).to(userRoom(receiverId)).emit('message:new', message);
        ack?.({ ok: true, message });
      } catch (err) {
        ack?.({ ok: false, error: err.code || 'SEND_FAILED', message: err.message });
      }
    });
  });

  return io;
}
