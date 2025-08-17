const { db, run, get, all } = require('../config/database');

class Story {
  static async create(storyData) {
    const { author_id, title, content, excerpt, category, region } = storyData;
    
    const slug = title.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
    
    const sql = `
      INSERT INTO stories (author_id, title, slug, content, excerpt, category, region)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    
    const result = await run(sql, [author_id, title, slug, content, excerpt, category, region]);
    return { id: result.id, title, slug };
  }

  static async findBySlug(slug) {
    const sql = 'SELECT * FROM stories WHERE slug = ? AND is_published = 1 AND status = "published"';
    return await get(sql, [slug]);
  }

  static async findById(id) {
    const sql = 'SELECT * FROM stories WHERE id = ? AND is_published = 1';
    return await get(sql, [id]);
  }

  static async getAll(filters = {}) {
    let sql = 'SELECT * FROM stories WHERE is_published = 1 AND status = "published"';
    const params = [];
    
    if (filters.region) {
      sql += ' AND region = ?';
      params.push(filters.region);
    }
    
    if (filters.category) {
      sql += ' AND category = ?';
      params.push(filters.category);
    }
    
    sql += ' ORDER BY published_at DESC, created_at DESC';
    return await all(sql, params);
  }

  static async update(id, updateData) {
    const fields = Object.keys(updateData).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updateData);
    values.push(id);
    
    const sql = `UPDATE stories SET ${fields}, updated_at = datetime('now') WHERE id = ?`;
    return await run(sql, values);
  }

  static async delete(id) {
    const sql = 'UPDATE stories SET is_published = 0 WHERE id = ?';
    return await run(sql, [id]);
  }

  static async incrementViews(id) {
    const sql = 'UPDATE stories SET views = views + 1 WHERE id = ?';
    return await run(sql, [id]);
  }
}

module.exports = Story;
