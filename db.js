const { Pool } = require('pg');

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
}

module.exports = { pool, init };
