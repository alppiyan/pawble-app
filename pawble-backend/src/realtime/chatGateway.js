import { chatService } from '../services/chatService.js';
import { sendMessage as sendMessageSchema } from '../validators/chatValidators.js';

export function registerChatGateway(io, socket) {
  const userId = socket.data.user.id;

  socket.on('message:send', async (payload, ack) => {
    try {
      const { value, error } = sendMessageSchema.body.validate(payload ?? {});
      if (error) {
        return ack?.({ ok: false, error: { code: 'VALIDATION_ERROR', message: error.message } });
      }

      const message = await chatService.sendMessage({
        senderId: userId,
        receiverId: value.receiverId,
        content: value.content,
      });

      io.to(`user:${message.senderId}`).to(`user:${message.receiverId}`).emit('message:new', message);
      ack?.({ ok: true, message });
    } catch (err) {
      ack?.({ ok: false, error: { code: err.code || 'INTERNAL_ERROR', message: err.message } });
    }
  });

  socket.on('typing:start', (payload) => {
    const otherUserId = Number(payload?.otherUserId);
    if (!otherUserId) return;
    io.to(`user:${otherUserId}`).emit('typing:peer', { userId, isTyping: true });
  });

  socket.on('typing:stop', (payload) => {
    const otherUserId = Number(payload?.otherUserId);
    if (!otherUserId) return;
    io.to(`user:${otherUserId}`).emit('typing:peer', { userId, isTyping: false });
  });
}
