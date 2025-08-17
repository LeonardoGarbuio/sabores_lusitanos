const { db, run, get, all } = require('../config/database');

class Restaurant {
  static async create(restaurantData) {
    const { name, description, owner_id, address, city, region, cuisine, price_range } = restaurantData;
    
    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
    
    const sql = `
      INSERT INTO restaurants (name, slug, description, owner_id, address, city, region, cuisine, price_range, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `;
    
    const result = await run(sql, [name, slug, description, owner_id, address, city, region, cuisine, price_range]);
    return { id: result.id, name, slug };
  }

  static async findBySlug(slug) {
    const sql = 'SELECT * FROM restaurants WHERE slug = ? AND is_active = 1';
    return await get(sql, [slug]);
  }

  static async findById(id) {
    const sql = 'SELECT * FROM restaurants WHERE id = ? AND is_active = 1';
    return await get(sql, [id]);
  }

  static async getAll(filters = {}) {
    let sql = 'SELECT * FROM restaurants WHERE is_active = 1';
    const params = [];
    
    if (filters.region) {
      sql += ' AND region = ?';
      params.push(filters.region);
    }
    
    if (filters.cuisine) {
      sql += ' AND cuisine = ?';
      params.push(filters.cuisine);
    }
    
    sql += ' ORDER BY rating DESC, created_at DESC';
    return await all(sql, params);
  }

  static async update(id, updateData) {
    const fields = Object.keys(updateData).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updateData);
    values.push(id);
    
    const sql = `UPDATE restaurants SET ${fields}, updated_at = datetime('now') WHERE id = ?`;
    return await run(sql, values);
  }

  static async delete(id) {
    const sql = 'UPDATE restaurants SET is_active = 0 WHERE id = ?';
    return await run(sql, [id]);
  }

  static async updateRating(id) {
    const sql = `
      UPDATE restaurants 
      SET rating = (
        SELECT AVG(rating) 
        FROM reviews 
        WHERE restaurant_id = ? AND restaurant_id IS NOT NULL
      ),
      review_count = (
        SELECT COUNT(*) 
        FROM reviews 
        WHERE restaurant_id = ?
      )
      WHERE id = ?
    `;
    return await run(sql, [id, id, id]);
  }
}

module.exports = Restaurant;
