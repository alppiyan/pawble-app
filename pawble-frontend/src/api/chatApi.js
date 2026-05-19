import { request } from './client.js';

export const chatApi = {
  listConversations: () => request('/conversations'),
  listMessages: (otherId) => request(`/conversations/${otherId}/messages`),
};
