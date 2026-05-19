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
