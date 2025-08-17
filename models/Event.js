const { db, run, get, all } = require('../config/database');

class Event {
  static async create(eventData) {
    const { title, description, type, category, organizer_id, restaurant_id, address, city, region, start_date, end_date, capacity, price } = eventData;
    
    const slug = title.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
    
    const sql = `
      INSERT INTO events (title, slug, description, type, category, organizer_id, restaurant_id, address, city, region, start_date, end_date, capacity, price, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `;
    
    const result = await run(sql, [title, slug, description, type, category, organizer_id, restaurant_id, address, city, region, start_date, end_date, capacity, price]);
    return { id: result.id, title, slug };
  }

  static async findBySlug(slug) {
    const sql = 'SELECT * FROM events WHERE slug = ? AND is_active = 1';
    return await get(sql, [slug]);
  }

  static async findById(id) {
    const sql = 'SELECT * FROM events WHERE id = ? AND is_active = 1';
    return await get(sql, [id]);
  }

  static async getAll(filters = {}) {
    let sql = 'SELECT * FROM events WHERE is_active = 1';
    const params = [];
    
    if (filters.region) {
      sql += ' AND region = ?';
      params.push(filters.region);
    }
    
    if (filters.type) {
      sql += ' AND type = ?';
      params.push(filters.type);
    }
    
    sql += ' ORDER BY start_date ASC';
    return await all(sql, params);
  }

  static async update(id, updateData) {
    const fields = Object.keys(updateData).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updateData);
    values.push(id);
    
    const sql = `UPDATE events SET ${fields}, updated_at = datetime('now') WHERE id = ?`;
    return await run(sql, values);
  }

  static async delete(id) {
    const sql = 'UPDATE events SET is_active = 0 WHERE id = ?';
    return await run(sql, [id]);
  }
}

module.exports = Event;
