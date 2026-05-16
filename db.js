const { Pool } = require('pg');
const crypto   = require('crypto');

const pool = new Pool({
  host:     process.env.PG_HOST     || 'localhost',
  port:     process.env.PG_PORT     || 5432,
  database: process.env.PG_DB       || 'calpfc',
  user:     process.env.PG_USER     || 'postgres',
  password: process.env.PG_PASSWORD || 'postgres',
});

async function init() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS foods (
      id         SERIAL PRIMARY KEY,
      name       TEXT    NOT NULL,
      calories   NUMERIC(8,2) NOT NULL DEFAULT 0,
      protein    NUMERIC(8,2) NOT NULL DEFAULT 0,
      fat        NUMERIC(8,2) NOT NULL DEFAULT 0,
      carbs      NUMERIC(8,2) NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS dishes (
      id         SERIAL PRIMARY KEY,
      name       TEXT    NOT NULL,
      calories   NUMERIC(8,2) NOT NULL DEFAULT 0,
      protein    NUMERIC(8,2) NOT NULL DEFAULT 0,
      fat        NUMERIC(8,2) NOT NULL DEFAULT 0,
      carbs      NUMERIC(8,2) NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS dish_ingredients (
      id       SERIAL PRIMARY KEY,
      dish_id  INTEGER NOT NULL REFERENCES dishes(id) ON DELETE CASCADE,
      food_id  INTEGER NOT NULL,
      percent  NUMERIC(6,2) NOT NULL DEFAULT 0
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS diary (
      id         SERIAL PRIMARY KEY,
      name       TEXT         NOT NULL,
      weight     NUMERIC(8,2) NOT NULL DEFAULT 100,
      calories   NUMERIC(8,2) NOT NULL DEFAULT 0,
      protein    NUMERIC(8,2) NOT NULL DEFAULT 0,
      fat        NUMERIC(8,2) NOT NULL DEFAULT 0,
      carbs      NUMERIC(8,2) NOT NULL DEFAULT 0,
      date       DATE         NOT NULL DEFAULT CURRENT_DATE,
      created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id            SERIAL PRIMARY KEY,
      username      TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      token         TEXT,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  const { rowCount } = await pool.query('SELECT 1 FROM users LIMIT 1');
  if (rowCount === 0) {
    const hash = crypto.createHash('sha256').update('admin123').digest('hex');
    await pool.query(
      `INSERT INTO users (username, password_hash) VALUES ('admin', $1)`,
      [hash]
    );
  }
}

module.exports = { pool, init };
