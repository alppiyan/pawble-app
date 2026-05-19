import pool from '../config/db.js';

export const metadataRepository = {
  async listSpecies() {
    const [rows] = await pool.execute('SELECT id, name FROM species ORDER BY name');
    return rows;
  },

  async listBreeds() {
    const [rows] = await pool.execute(
      'SELECT id, species_id, name FROM breeds ORDER BY name',
    );
    return rows.map((r) => ({ id: r.id, speciesId: r.species_id, name: r.name }));
  },
};
