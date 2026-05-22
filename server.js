require('dotenv').config();
const express = require('express');
const path    = require('path');
const crypto  = require('crypto');
const { pool, init } = require('./db');

function sha256(str) {
  return crypto.createHash('sha256').update(str).digest('hex');
}

function getToken(req) {
  return (req.headers.authorization || '').replace('Bearer ', '') || null;
}

async function getUserFromToken(req) {
  const token = getToken(req);
  if (!token) return null;
  try {
    const { rows } = await pool.query('SELECT id, username FROM users WHERE token=$1', [token]);
    return rows[0] || null;
  } catch { return null; }
}

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use((req, res, next) => {
  if (req.path.endsWith('.js') || req.path.endsWith('.css')) {
    res.setHeader('Cache-Control', 'no-store');
  }
  next();
});
app.use(express.static(path.join(__dirname, 'public')));

// GET /api/foods — все продукты из справочника
app.get('/api/foods', async (req, res) => {
  try {
    const user = await getUserFromToken(req);
    let rows;
    if (user?.username === 'admin') {
      const r = await pool.query(
        `SELECT f.*, u.username AS created_by_username FROM foods f LEFT JOIN users u ON u.id = f.created_by ORDER BY f.name`
      );
      rows = r.rows;
    } else if (user) {
      const r = await pool.query(
        `SELECT f.*, u.username AS created_by_username FROM foods f LEFT JOIN users u ON u.id = f.created_by WHERE f.created_by IS NULL OR f.created_by = $1 ORDER BY f.name`,
        [user.id]
      );
      rows = r.rows;
    } else {
      const r = await pool.query(
        `SELECT f.*, u.username AS created_by_username FROM foods f LEFT JOIN users u ON u.id = f.created_by WHERE f.created_by IS NULL ORDER BY f.name`
      );
      rows = r.rows;
    }
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/foods — сохранить новый продукт
app.post('/api/foods', async (req, res) => {
  const user = await getUserFromToken(req);
  const { name, calories, protein, fat, carbs } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO foods (name, calories, protein, fat, carbs, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [name, calories || 0, protein || 0, fat || 0, carbs || 0, user?.id || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/foods/:id — обновить продукт
app.put('/api/foods/:id', async (req, res) => {
  const { name, calories, protein, fat, carbs } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  try {
    const { rows } = await pool.query(
      `UPDATE foods SET name=$1, calories=$2, protein=$3, fat=$4, carbs=$5 WHERE id=$6 RETURNING *`,
      [name, calories || 0, protein || 0, fat || 0, carbs || 0, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/foods/:id — удалить продукт из справочника
app.delete('/api/foods/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM foods WHERE id = $1', [req.params.id]);
    res.sendStatus(204);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== /api/diary =====
app.get('/api/diary', async (req, res) => {
  const user = await getUserFromToken(req);
  if (!user) return res.status(401).json({ error: 'unauthorized' });
  const date = req.query.date || new Date().toISOString().slice(0, 10);
  try {
    let rows;
    if (user.username === 'admin') {
      const r = await pool.query(
        `SELECT d.*, u.username AS created_by_username
         FROM diary d LEFT JOIN users u ON u.id = d.user_id
         WHERE d.date = $1 ORDER BY d.created_at`,
        [date]
      );
      rows = r.rows;
    } else {
      const r = await pool.query(
        `SELECT d.*, u.username AS created_by_username
         FROM diary d LEFT JOIN users u ON u.id = d.user_id
         WHERE d.date = $1 AND d.user_id = $2 ORDER BY d.created_at`,
        [date, user.id]
      );
      rows = r.rows;
    }
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/diary', async (req, res) => {
  const user = await getUserFromToken(req);
  if (!user) return res.status(401).json({ error: 'unauthorized' });
  const { name, weight, calories, protein, fat, carbs } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO diary (name, weight, calories, protein, fat, carbs, user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [name, weight || 100, calories || 0, protein || 0, fat || 0, carbs || 0, user.id]
    );
    res.status(201).json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/diary/:id', async (req, res) => {
  const user = await getUserFromToken(req);
  if (!user) return res.status(401).json({ error: 'unauthorized' });
  try {
    await pool.query('DELETE FROM diary WHERE id = $1 AND user_id = $2', [req.params.id, user.id]);
    res.sendStatus(204);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ===== /api/dishes =====
app.get('/api/dishes', async (req, res) => {
  try {
    const user = await getUserFromToken(req);
    let rows;
    if (user?.username === 'admin') {
      const r = await pool.query(
        `SELECT d.*, u.username AS created_by_username FROM dishes d LEFT JOIN users u ON u.id = d.user_id ORDER BY d.name`
      );
      rows = r.rows;
    } else if (user) {
      const r = await pool.query(
        `SELECT d.*, u.username AS created_by_username FROM dishes d LEFT JOIN users u ON u.id = d.user_id WHERE d.user_id IS NULL OR d.user_id = $1 ORDER BY d.name`,
        [user.id]
      );
      rows = r.rows;
    } else {
      const r = await pool.query(
        `SELECT d.*, u.username AS created_by_username FROM dishes d LEFT JOIN users u ON u.id = d.user_id WHERE d.user_id IS NULL ORDER BY d.name`
      );
      rows = r.rows;
    }
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/dishes/:id/ingredients
app.get('/api/dishes/:id/ingredients', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT di.food_id, f.name AS food_name, di.percent,
              f.calories, f.protein, f.fat, f.carbs
       FROM dish_ingredients di
       JOIN foods f ON f.id = di.food_id
       WHERE di.dish_id = $1
       ORDER BY di.id`,
      [req.params.id]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/dishes', async (req, res) => {
  const user = await getUserFromToken(req);
  if (!user) return res.status(401).json({ error: 'unauthorized' });
  const { name, calories, protein, fat, carbs, ingredients = [] } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const dishUserId = user.username === 'admin' ? null : user.id;
  console.log(`[POST /api/dishes] user=${user.username}(id=${user.id}) name="${name}" → user_id=${dishUserId}`);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `INSERT INTO dishes (name, calories, protein, fat, carbs, user_id) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [name, calories || 0, protein || 0, fat || 0, carbs || 0, dishUserId]
    );
    const dishId = rows[0].id;
    for (const ing of ingredients) {
      await client.query(
        `INSERT INTO dish_ingredients (dish_id, food_id, percent) VALUES ($1,$2,$3)`,
        [dishId, ing.food_id, ing.percent || 0]
      );
    }
    await client.query('COMMIT');
    res.status(201).json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally { client.release(); }
});

app.put('/api/dishes/:id', async (req, res) => {
  const user = await getUserFromToken(req);
  if (!user) return res.status(401).json({ error: 'unauthorized' });
  const { name, calories, protein, fat, carbs, ingredients = [] } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const existing = await client.query('SELECT user_id FROM dishes WHERE id=$1', [req.params.id]);
    if (!existing.rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'not found' }); }
    const dish = existing.rows[0];
    if (user.username !== 'admin' && dish.user_id !== user.id) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'forbidden' });
    }
    const { rows } = await client.query(
      `UPDATE dishes SET name=$1, calories=$2, protein=$3, fat=$4, carbs=$5 WHERE id=$6 RETURNING *`,
      [name, calories || 0, protein || 0, fat || 0, carbs || 0, req.params.id]
    );
    await client.query('DELETE FROM dish_ingredients WHERE dish_id = $1', [req.params.id]);
    for (const ing of ingredients) {
      await client.query(
        `INSERT INTO dish_ingredients (dish_id, food_id, percent) VALUES ($1,$2,$3)`,
        [req.params.id, ing.food_id, ing.percent || 0]
      );
    }
    await client.query('COMMIT');
    res.json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally { client.release(); }
});

app.delete('/api/dishes/:id', async (req, res) => {
  const user = await getUserFromToken(req);
  if (!user) return res.status(401).json({ error: 'unauthorized' });
  try {
    const existing = await pool.query('SELECT user_id FROM dishes WHERE id=$1', [req.params.id]);
    if (!existing.rows.length) return res.sendStatus(404);
    const dish = existing.rows[0];
    if (user.username !== 'admin' && dish.user_id !== user.id) {
      return res.status(403).json({ error: 'forbidden' });
    }
    await pool.query('DELETE FROM dishes WHERE id = $1', [req.params.id]);
    res.sendStatus(204);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ===== /api/auth =====
app.post('/api/auth/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Заполните все поля' });
  if (username.trim().length < 3) return res.status(400).json({ error: 'Логин минимум 3 символа' });
  if (password.length < 6) return res.status(400).json({ error: 'Пароль минимум 6 символов' });
  try {
    const existing = await pool.query('SELECT id FROM users WHERE username=$1', [username.trim()]);
    if (existing.rows.length) return res.status(409).json({ error: 'Логин уже занят' });
    const hash  = sha256(password);
    const token = crypto.randomBytes(32).toString('hex');
    const { rows } = await pool.query(
      `INSERT INTO users (username, password_hash, token) VALUES ($1,$2,$3) RETURNING id, username`,
      [username.trim(), hash, token]
    );
    res.status(201).json({ token, username: rows[0].username, user_id: rows[0].id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Заполните все поля' });
  try {
    const { rows } = await pool.query(
      'SELECT * FROM users WHERE username=$1 AND password_hash=$2',
      [username, sha256(password)]
    );
    if (!rows.length) return res.status(401).json({ error: 'Неверный логин или пароль' });
    const token = crypto.randomBytes(32).toString('hex');
    await pool.query('UPDATE users SET token=$1 WHERE id=$2', [token, rows[0].id]);
    res.json({ token, username: rows[0].username, user_id: rows[0].id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/auth/me', async (req, res) => {
  const token = getToken(req);
  if (!token) return res.status(401).json({ error: 'no token' });
  try {
    const { rows } = await pool.query('SELECT id, username FROM users WHERE token=$1', [token]);
    if (!rows.length) return res.status(401).json({ error: 'invalid token' });
    res.json({ id: rows[0].id, username: rows[0].username });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/auth/logout', async (req, res) => {
  const token = getToken(req);
  if (token) await pool.query('UPDATE users SET token=NULL WHERE token=$1', [token]);
  res.sendStatus(204);
});

init()
  .then(() => {
    app.listen(PORT, () => console.log(`CalPFC запущен → http://localhost:${PORT}`));
  })
  .catch(err => {
    console.error('Ошибка подключения к БД:', err.message);
    process.exit(1);
  });
