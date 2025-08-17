const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Database file path
const dbPath = path.join(__dirname, '../database/sabores_lusitanos.db');

// Create database directory if it doesn't exist
const dbDir = path.dirname(dbPath);
const fs = require('fs');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Create database connection
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('📦 SQLite Database connected successfully');
    createTables();
  }
});

// Create tables function
const createTables = () => {
  // Users table
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    avatar TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Restaurants table
  db.run(`CREATE TABLE IF NOT EXISTS restaurants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    owner_id INTEGER,
    address TEXT,
    city TEXT,
    region TEXT,
    postal_code TEXT,
    country TEXT DEFAULT 'Portugal',
    latitude REAL,
    longitude REAL,
    cuisine TEXT,
    price_range TEXT,
    rating REAL DEFAULT 0,
    review_count INTEGER DEFAULT 0,
    authenticity_score REAL DEFAULT 0,
    features TEXT,
    opening_hours TEXT,
    images TEXT,
    menu TEXT,
    awards TEXT,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES users (id)
  )`);

  // Reviews table
  db.run(`CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    restaurant_id INTEGER NOT NULL,
    rating INTEGER NOT NULL,
    title TEXT,
    content TEXT,
    food_rating INTEGER,
    service_rating INTEGER,
    atmosphere_rating INTEGER,
    value_rating INTEGER,
    images TEXT,
    tags TEXT,
    helpful_count INTEGER DEFAULT 0,
    unhelpful_count INTEGER DEFAULT 0,
    response TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id),
    FOREIGN KEY (restaurant_id) REFERENCES restaurants (id),
    UNIQUE(user_id, restaurant_id)
  )`);

  // Events table
  db.run(`CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    type TEXT,
    category TEXT,
    organizer_id INTEGER,
    restaurant_id INTEGER,
    address TEXT,
    city TEXT,
    region TEXT,
    start_date DATETIME,
    end_date DATETIME,
    capacity INTEGER,
    price REAL,
    images TEXT,
    highlights TEXT,
    requirements TEXT,
    target_audience TEXT,
    difficulty TEXT,
    languages TEXT,
    tags TEXT,
    is_featured BOOLEAN DEFAULT 0,
    is_active BOOLEAN DEFAULT 1,
    is_verified BOOLEAN DEFAULT 0,
    rating REAL DEFAULT 0,
    review_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organizer_id) REFERENCES users (id),
    FOREIGN KEY (restaurant_id) REFERENCES restaurants (id)
  )`);

  // Stories table
  db.run(`CREATE TABLE IF NOT EXISTS stories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    author_id INTEGER,
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    content TEXT,
    excerpt TEXT,
    category TEXT,
    tags TEXT,
    images TEXT,
    related_restaurants TEXT,
    related_events TEXT,
    region TEXT,
    reading_time INTEGER,
    is_published BOOLEAN DEFAULT 1,
    is_featured BOOLEAN DEFAULT 0,
    is_verified BOOLEAN DEFAULT 0,
    status TEXT DEFAULT 'published',
    published_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    views INTEGER DEFAULT 0,
    likes INTEGER DEFAULT 0,
    comments INTEGER DEFAULT 0,
    seo_title TEXT,
    seo_description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (author_id) REFERENCES users (id)
  )`);

  // Reservations table
  db.run(`CREATE TABLE IF NOT EXISTS reservations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    restaurant_id INTEGER NOT NULL,
    date DATE NOT NULL,
    time TEXT NOT NULL,
    party_size INTEGER NOT NULL,
    special_requests TEXT,
    dietary_restrictions TEXT,
    occasion TEXT,
    contact_name TEXT NOT NULL,
    contact_phone TEXT NOT NULL,
    contact_email TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    confirmation_code TEXT UNIQUE,
    confirmed_at DATETIME,
    cancelled_at DATETIME,
    cancelled_by TEXT,
    cancellation_reason TEXT,
    notes TEXT,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id),
    FOREIGN KEY (restaurant_id) REFERENCES restaurants (id)
  )`);

  // User favorites table
  db.run(`CREATE TABLE IF NOT EXISTS user_favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    restaurant_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id),
    FOREIGN KEY (restaurant_id) REFERENCES restaurants (id),
    UNIQUE(user_id, restaurant_id)
  )`);

  // Story likes table
  db.run(`CREATE TABLE IF NOT EXISTS story_likes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    story_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id),
    FOREIGN KEY (story_id) REFERENCES stories (id),
    UNIQUE(user_id, story_id)
  )`);

  // Story comments table
  db.run(`CREATE TABLE IF NOT EXISTS story_comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    story_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    parent_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id),
    FOREIGN KEY (story_id) REFERENCES stories (id),
    FOREIGN KEY (parent_id) REFERENCES story_comments (id)
  )`);

  console.log('📋 Database tables created successfully');
};

// Database helper functions
const run = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ id: this.lastID, changes: this.changes });
      }
    });
  });
};

const get = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
};

const all = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
};

// Close database connection
const closeDB = () => {
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err.message);
    } else {
      console.log('Database connection closed');
    }
  });
};

module.exports = {
  db,
  run,
  get,
  all,
  closeDB
};
