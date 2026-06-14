import { asyncHandler } from '../utils/asyncHandler.js';
import { chatService } from '../services/chatService.js';

export const chatController = {
  listConversations: asyncHandler(async (req, res) => {
    const conversations = await chatService.listConversations(req.user.id);
    res.json(conversations);
  }),

  listMessages: asyncHandler(async (req, res) => {
    const messages = await chatService.listMessages(req.user.id, req.params.otherId);
    res.json(messages);
  }),

  // Deprecated: new messages should be sent via the WebSocket `message:send` event.
  // Kept for clients that haven't migrated yet.
  send: asyncHandler(async (req, res) => {
    console.warn('[deprecated] POST /api/messages — use the WebSocket message:send event');
    const message = await chatService.sendMessage({
      senderId: req.user.id,
      receiverId: req.body.receiverId,
      content: req.body.content,
    });
    res.status(201).json(message);
  }),
};
