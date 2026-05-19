import pool from '../config/db.js';
import { rowToPet, rowToCandidate } from '../models/Pet.js';

export const petRepository = {
  async findById(id) {
    const [rows] = await pool.execute('SELECT * FROM pets WHERE id = ?', [id]);
    return rowToPet(rows[0]);
  },

  async findByOwner(userId) {
    const [rows] = await pool.execute(
      `SELECT p.*, s.name AS species_name, b.name AS breed_name
       FROM pets p
       JOIN species s ON p.species_id = s.id
       JOIN breeds  b ON p.breed_id   = b.id
       WHERE p.user_id = ?
       ORDER BY p.id DESC`,
      [userId],
    );
    return rows.map((r) => ({
      ...rowToPet(r),
      speciesName: r.species_name,
      breedName: r.breed_name,
    }));
  },

  async insert(pet) {
    const [result] = await pool.execute(
      `INSERT INTO pets
         (user_id, username, species_id, breed_id, gender, age, vaccinated, description, image_path, video_path, goal)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        pet.ownerId,
        pet.name,
        pet.speciesId,
        pet.breedId,
        pet.gender,
        pet.age,
        pet.vaccinated ? 1 : 0,
        pet.description || null,
        pet.imagePath || '',
        pet.videoPath || null,
        pet.goal,
      ],
    );
    return result.insertId;
  },

  async update(id, patch) {
    const fields = [];
    const values = [];
    const map = {
      name: 'username',
      speciesId: 'species_id',
      breedId: 'breed_id',
      gender: 'gender',
      age: 'age',
      vaccinated: 'vaccinated',
      description: 'description',
      goal: 'goal',
      imagePath: 'image_path',
      videoPath: 'video_path',
    };
    for (const [k, col] of Object.entries(map)) {
      if (patch[k] === undefined) continue;
      fields.push(`${col} = ?`);
      values.push(k === 'vaccinated' ? (patch[k] ? 1 : 0) : patch[k]);
    }
    if (!fields.length) return;
    values.push(id);
    await pool.execute(`UPDATE pets SET ${fields.join(', ')} WHERE id = ?`, values);
  },

  async deleteById(id) {
    await pool.execute('DELETE FROM pets WHERE id = ?', [id]);
  },

  async findMediaPaths(id) {
    const [rows] = await pool.execute(
      'SELECT image_path, video_path FROM pets WHERE id = ?',
      [id],
    );
    if (!rows[0]) return null;
    return { imagePath: rows[0].image_path, videoPath: rows[0].video_path };
  },

  async transferOwnership(petId, newOwnerId) {
    await pool.execute(
      "UPDATE pets SET user_id = ?, goal = 'mating' WHERE id = ?",
      [newOwnerId, petId],
    );
  },

  async findCandidates({ mode, myPetId, species, gender, ageMin, ageMax, shelterOnly }) {
    let sql = `
      SELECT p.id, p.username AS name, p.gender, p.age, p.vaccinated, p.description,
             p.image_path AS image, p.video_path,
             s.name AS species_name, b.name AS breed_name, u.location, p.goal,
             p.user_id AS ownerId, CONCAT(u.name, ' ', u.surname) AS ownerName,
             u.is_shelter
      FROM pets p
      JOIN species s ON p.species_id = s.id
      JOIN breeds  b ON p.breed_id   = b.id
      JOIN users   u ON p.user_id    = u.id
      WHERE p.goal = ?
    `;
    const params = [mode];

    if (myPetId) {
      sql += ' AND p.id != ?';
      params.push(myPetId);
      sql += ' AND p.id NOT IN (SELECT liked_pet_id FROM likes WHERE liker_pet_id = ?)';
      params.push(myPetId);
    }
    if (species) { sql += ' AND s.name = ?'; params.push(species); }
    if (gender)  { sql += ' AND p.gender = ?'; params.push(gender); }
    if (ageMin != null) { sql += ' AND p.age >= ?'; params.push(ageMin); }
    if (ageMax != null) { sql += ' AND p.age <= ?'; params.push(ageMax); }
    if (shelterOnly)    { sql += ' AND u.is_shelter = 1'; }

    sql += ' ORDER BY RAND() LIMIT 100';

    const [rows] = await pool.execute(sql, params);
    return rows.map(rowToCandidate);
  },

  async computeStats(petId) {
    const [rows] = await pool.execute(
      `SELECT
         SUM(CASE WHEN status IN ('matched','pending') THEN 1 ELSE 0 END) AS likeCount,
         SUM(CASE WHEN status = 'super'    THEN 1 ELSE 0 END) AS superCount,
         SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) AS dislikeCount,
         SUM(CASE WHEN status = 'matched'  THEN 1 ELSE 0 END) AS matchCount
       FROM likes
       WHERE liked_pet_id = ?`,
      [petId],
    );
    const r = rows[0] || {};
    return {
      likeCount: Number(r.likeCount || 0),
      superCount: Number(r.superCount || 0),
      dislikeCount: Number(r.dislikeCount || 0),
      matchCount: Number(r.matchCount || 0),
    };
  },
};
