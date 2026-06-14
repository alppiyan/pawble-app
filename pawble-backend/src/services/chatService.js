import { messageRepository } from '../repositories/messageRepository.js';
import { AppError } from '../utils/AppError.js';

const formatTime = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

export const chatService = {
  async listConversations(userId) {
    const partners = await messageRepository.listConversationPartners(userId);
    if (!partners.length) return [];

    const enriched = await Promise.all(
      partners.map(async (p) => {
        const [userName, lastMsg, match, adoption] = await Promise.all([
          messageRepository.findUserName(p.otherUserId),
          messageRepository.findLastMessageBetween(userId, p.otherUserId),
          messageRepository.findMatchContext(userId, p.otherUserId),
          messageRepository.findAdoptionContext(p.otherUserId),
        ]);

        if (!userName) return null;

        const context = match
          ? { goal: match.goal, petName: match.petName, petImage: match.petImage }
          : adoption
            ? { goal: 'adoption', petName: adoption.petName, petImage: adoption.petImage }
            : { goal: 'adoption', petName: 'Dostumuz', petImage: null };

        return {
          otherUserId: p.otherUserId,
          userName,
          image: context.petImage || null,
          petName: context.petName,
          goal: context.goal,
          lastMessage: lastMsg?.content || '',
          time: formatTime(p.lastMessageTime),
        };
      }),
    );

    return enriched.filter(Boolean);
  },

  async listMessages(userId, otherId) {
    if (userId === otherId) {
      throw new AppError('Cannot fetch messages with self', 400, 'SELF_CHAT');
    }
    return messageRepository.findBetweenUsers(userId, otherId);
  },

  async sendMessage({ senderId, receiverId, content }) {
    if (senderId === receiverId) {
      throw new AppError('Cannot message self', 400, 'SELF_MESSAGE');
    }
    const id = await messageRepository.insert({ senderId, receiverId, content });
    return messageRepository.findById(id);
  },
};
