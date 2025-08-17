const { db, run, get, all } = require('../config/database');

class Reservation {
  static async create(reservationData) {
    const { user_id, restaurant_id, date, time, party_size, special_requests, dietary_restrictions, occasion, contact_name, contact_phone, contact_email } = reservationData;
    
    const confirmationCode = this.generateConfirmationCode();
    
    const sql = `
      INSERT INTO reservations (user_id, restaurant_id, date, time, party_size, special_requests, dietary_restrictions, occasion, contact_name, contact_phone, contact_email, confirmation_code, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `;
    
    const result = await run(sql, [user_id, restaurant_id, date, time, party_size, special_requests, dietary_restrictions, occasion, contact_name, contact_phone, contact_email, confirmationCode]);
    return { id: result.id, confirmation_code: confirmationCode };
  }

  static async findById(id) {
    const sql = 'SELECT * FROM reservations WHERE id = ? AND is_active = 1';
    return await get(sql, [id]);
  }

  static async findByConfirmationCode(code) {
    const sql = 'SELECT * FROM reservations WHERE confirmation_code = ? AND is_active = 1';
    return await get(sql, [code]);
  }

  static async findByUser(user_id) {
    const sql = 'SELECT * FROM reservations WHERE user_id = ? AND is_active = 1 ORDER BY date DESC, time DESC';
    return await all(sql, [user_id]);
  }

  static async findByRestaurant(restaurant_id) {
    const sql = 'SELECT * FROM reservations WHERE restaurant_id = ? AND is_active = 1 ORDER BY date DESC, time DESC';
    return await all(sql, [restaurant_id]);
  }

  static async update(id, updateData) {
    const fields = Object.keys(updateData).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updateData);
    values.push(id);
    
    const sql = `UPDATE reservations SET ${fields}, updated_at = datetime('now') WHERE id = ?`;
    return await run(sql, values);
  }

  static async confirm(id) {
    const sql = 'UPDATE reservations SET status = "confirmed", confirmed_at = datetime("now"), updated_at = datetime("now") WHERE id = ?';
    return await run(sql, [id]);
  }

  static async cancel(id, reason, cancelled_by) {
    const sql = 'UPDATE reservations SET status = "cancelled", cancelled_at = datetime("now"), cancelled_by = ?, cancellation_reason = ?, updated_at = datetime("now") WHERE id = ?';
    return await run(sql, [cancelled_by, reason, id]);
  }

  static async complete(id) {
    const sql = 'UPDATE reservations SET status = "completed", updated_at = datetime("now") WHERE id = ?';
    return await run(sql, [id]);
  }

  static async markNoShow(id) {
    const sql = 'UPDATE reservations SET status = "no_show", updated_at = datetime("now") WHERE id = ?';
    return await run(sql, [id]);
  }

  static async delete(id) {
    const sql = 'UPDATE reservations SET is_active = 0 WHERE id = ?';
    return await run(sql, [id]);
  }

  static generateConfirmationCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}

module.exports = Reservation;
