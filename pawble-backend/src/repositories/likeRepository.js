import pool from '../config/db.js';

export const likeRepository = {
  async insert({ likerPetId, likedPetId, status }) {
    await pool.execute(
      'INSERT INTO likes (liker_pet_id, liked_pet_id, status) VALUES (?, ?, ?)',
      [likerPetId, likedPetId, status],
    );
  },

  async findActiveBetween(likerPetId, likedPetId) {
    const [rows] = await pool.execute(
      `SELECT id, status FROM likes
       WHERE liker_pet_id = ? AND liked_pet_id = ?
         AND status IN ('pending','super','matched')`,
      [likerPetId, likedPetId],
    );
    return rows[0] || null;
  },

  async markMatched(petAId, petBId) {
    await pool.execute(
      `UPDATE likes SET status = 'matched'
       WHERE (liker_pet_id = ? AND liked_pet_id = ?)
          OR (liker_pet_id = ? AND liked_pet_id = ?)`,
      [petAId, petBId, petBId, petAId],
    );
  },

  async listMatchPartners(userId) {
    const [rows] = await pool.execute(
      `SELECT DISTINCT
         CASE WHEN p_liker.user_id = ? THEN p_liked.user_id ELSE p_liker.user_id END AS otherUserId,
         MAX(l.created_at) AS matchedAt
       FROM likes l
       JOIN pets p_liker ON p_liker.id = l.liker_pet_id
       JOIN pets p_liked ON p_liked.id = l.liked_pet_id
       WHERE l.status = 'matched'
         AND (p_liker.user_id = ? OR p_liked.user_id = ?)
       GROUP BY otherUserId`,
      [userId, userId, userId],
    );
    return rows.map((r) => ({ otherUserId: r.otherUserId, matchedAt: r.matchedAt }));
  },

  async findInteractionHistory({ myPetId, type }) {
    const statusCond =
      type === 'super'
        ? "l.status = 'super'"
        : "l.status IN ('matched','pending')";

    const [rows] = await pool.execute(
      `SELECT p.id, p.username AS name, p.image_path AS image, p.description,
              p.gender, p.age, p.vaccinated,
              b.name AS breed_name, p.user_id AS ownerId, u.location,
              CONCAT(u.name, ' ', u.surname) AS ownerName
       FROM likes l
       JOIN pets   p ON l.liked_pet_id = p.id
       JOIN breeds b ON p.breed_id     = b.id
       JOIN users  u ON p.user_id      = u.id
       WHERE l.liker_pet_id = ? AND ${statusCond}`,
      [myPetId],
    );
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      image: r.image,
      description: r.description,
      gender: r.gender,
      age: r.age,
      vaccinated: r.vaccinated === 1,
      breed: r.breed_name,
      ownerId: r.ownerId,
      location: r.location,
      ownerName: r.ownerName,
    }));
  },
};
