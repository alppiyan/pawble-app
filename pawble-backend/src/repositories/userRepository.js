import pool from '../config/db.js';
import { rowToUser, rowToUserWithHash } from '../models/User.js';

export const userRepository = {
  async findById(id) {
    const [rows] = await pool.execute('SELECT * FROM users WHERE id = ?', [id]);
    return rowToUser(rows[0]);
  },

  async findByEmailWithHash(email) {
    const [rows] = await pool.execute('SELECT * FROM users WHERE email = ?', [email]);
    return rowToUserWithHash(rows[0]);
  },

  async insert({ name, surname, email, passwordHash, location }) {
    const [result] = await pool.execute(
      'INSERT INTO users (name, surname, email, password, location) VALUES (?, ?, ?, ?, ?)',
      [name, surname, email, passwordHash, location || ''],
    );
    return result.insertId;
  },

  async updateProfile(id, { name, surname, location }) {
    await pool.execute(
      'UPDATE users SET name = ?, surname = ?, location = ? WHERE id = ?',
      [name, surname, location, id],
    );
  },

  async listNonAdmins() {
    const [rows] = await pool.execute(
      'SELECT id, name, surname, email, is_shelter FROM users WHERE is_admin = 0',
    );
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      surname: r.surname,
      email: r.email,
      isShelter: r.is_shelter === 1,
    }));
  },

  async setShelterFlag(id, isShelter) {
    await pool.execute('UPDATE users SET is_shelter = ? WHERE id = ?', [isShelter ? 1 : 0, id]);
  },
};
