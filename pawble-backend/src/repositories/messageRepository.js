import pool from '../config/db.js';
import { rowToMessage } from '../models/Message.js';

export const messageRepository = {
  async insert({ senderId, receiverId, content }) {
    const [result] = await pool.execute(
      'INSERT INTO messages (sender_id, receiver_id, content) VALUES (?, ?, ?)',
      [senderId, receiverId, content],
    );
    return result.insertId;
  },

  async findById(id) {
    const [rows] = await pool.execute('SELECT * FROM messages WHERE id = ?', [id]);
    return rowToMessage(rows[0]);
  },

  async findBetweenUsers(userAId, userBId) {
    const [rows] = await pool.execute(
      `SELECT * FROM messages
       WHERE (sender_id = ? AND receiver_id = ?)
          OR (sender_id = ? AND receiver_id = ?)
       ORDER BY sent_at ASC`,
      [userAId, userBId, userBId, userAId],
    );
    return rows.map(rowToMessage);
  },

  async listConversationPartners(userId) {
    const [rows] = await pool.execute(
      `SELECT
         CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END AS otherUserId,
         MAX(sent_at) AS lastMessageTime
       FROM messages
       WHERE sender_id = ? OR receiver_id = ?
       GROUP BY otherUserId
       ORDER BY lastMessageTime DESC`,
      [userId, userId, userId],
    );
    return rows.map((r) => ({
      otherUserId: r.otherUserId,
      lastMessageTime: r.lastMessageTime,
    }));
  },

  async findLastMessageBetween(userAId, userBId) {
    const [rows] = await pool.execute(
      `SELECT content, sent_at FROM messages
       WHERE (sender_id = ? AND receiver_id = ?)
          OR (sender_id = ? AND receiver_id = ?)
       ORDER BY sent_at DESC
       LIMIT 1`,
      [userAId, userBId, userBId, userAId],
    );
    return rows[0] ? { content: rows[0].content, sentAt: rows[0].sent_at } : null;
  },

  async findMatchContext(userAId, userBId) {
    const [rows] = await pool.execute(
      `SELECT p.id AS petId, p.user_id AS petOwnerId, p.goal,
              p.username AS petName, p.image_path AS petImage
       FROM likes l
       JOIN pets p  ON p.id = l.liked_pet_id
       JOIN pets p2 ON p2.id = l.liker_pet_id
       WHERE (p.user_id = ? AND p2.user_id = ?)
          OR (p.user_id = ? AND p2.user_id = ?)
       LIMIT 1`,
      [userAId, userBId, userBId, userAId],
    );
    return rows[0] || null;
  },

  async findAdoptionContext(ownerId) {
    const [rows] = await pool.execute(
      `SELECT id AS petId, user_id AS petOwnerId, goal,
              username AS petName, image_path AS petImage
       FROM pets
       WHERE user_id = ? AND goal = 'adoption'
       LIMIT 1`,
      [ownerId],
    );
    return rows[0] || null;
  },

  async findUserName(userId) {
    const [rows] = await pool.execute(
      'SELECT name, surname FROM users WHERE id = ?',
      [userId],
    );
    return rows[0] ? `${rows[0].name} ${rows[0].surname}` : null;
  },
};
