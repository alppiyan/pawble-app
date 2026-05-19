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
};
