const { db, run, get, all } = require('../config/database');

class Review {
  static async create(reviewData) {
    const { user_id, restaurant_id, rating, title, content, food_rating, service_rating, atmosphere_rating, value_rating } = reviewData;
    
    const sql = `
      INSERT INTO reviews (user_id, restaurant_id, rating, title, content, food_rating, service_rating, atmosphere_rating, value_rating, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `;
    
    const result = await run(sql, [user_id, restaurant_id, rating, title, content, food_rating, service_rating, atmosphere_rating, value_rating]);
    return { id: result.id };
  }

  static async findById(id) {
    const sql = 'SELECT * FROM reviews WHERE id = ?';
    return await get(sql, [id]);
  }

  static async findByRestaurant(restaurant_id) {
    const sql = 'SELECT * FROM reviews WHERE restaurant_id = ? ORDER BY created_at DESC';
    return await all(sql, [restaurant_id]);
  }

  static async update(id, updateData) {
    const fields = Object.keys(updateData).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updateData);
    values.push(id);
    
    const sql = `UPDATE reviews SET ${fields}, updated_at = datetime('now') WHERE id = ?`;
    return await run(sql, values);
  }

  static async delete(id) {
    const sql = 'DELETE FROM reviews WHERE id = ?';
    return await run(sql, [id]);
  }
}

module.exports = Review;
