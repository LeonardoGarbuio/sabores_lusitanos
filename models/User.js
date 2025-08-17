const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { db, run, get, all } = require('../config/database');

class User {
  static async create(userData) {
    const { name, email, password, role = 'user' } = userData;
    
    // Hash password
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    const sql = `
      INSERT INTO users (name, email, password, role, created_at, updated_at)
      VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
    `;
    
    const result = await run(sql, [name, email, hashedPassword, role]);
    return { id: result.id, name, email, role };
  }

  static async findByEmail(email) {
    const sql = 'SELECT * FROM users WHERE email = ?';
    return await get(sql, [email]);
  }

  static async findById(id) {
    const sql = 'SELECT * FROM users WHERE id = ?';
    return await get(sql, [id]);
  }

  static async update(id, updateData) {
    const fields = Object.keys(updateData).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updateData);
    values.push(id);
    
    const sql = `UPDATE users SET ${fields}, updated_at = datetime('now') WHERE id = ?`;
    return await run(sql, values);
  }

  static async matchPassword(enteredPassword, hashedPassword) {
    return await bcrypt.compare(enteredPassword, hashedPassword);
  }

  static async generateVerificationToken() {
    const token = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    return { token, hashedToken, expires };
  }

  static async generatePasswordResetToken() {
    const token = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    return { token, hashedToken, expires };
  }

  static async search(query) {
    const sql = `
      SELECT * FROM users 
      WHERE name LIKE ? OR email LIKE ?
      ORDER BY created_at DESC
    `;
    const searchTerm = `%${query}%`;
    return await all(sql, [searchTerm, searchTerm]);
  }

  static async getAll() {
    const sql = 'SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC';
    return await all(sql);
  }

  static async delete(id) {
    const sql = 'DELETE FROM users WHERE id = ?';
    return await run(sql, [id]);
  }
}

module.exports = User;
