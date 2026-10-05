const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.warn('[db] DATABASE_URL not set – set it before production use');
}

const pool = new Pool({
  connectionString: connectionString || 'postgresql://localhost:5432/abuja',
  ...(process.env.DATABASE_URL && process.env.DATABASE_SSL !== 'false'
    ? { ssl: { rejectUnauthorized: false } }
    : process.env.DATABASE_SSL === 'false'
      ? { ssl: false }
      : {}),
  max: Number(process.env.PG_POOL_MAX || 20),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on('error', (err) => {
  console.error('[db] unexpected pool error', err.message);
});

async function migrate() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY,
      username VARCHAR(32) UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      email VARCHAR(255),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_login TIMESTAMPTZ
    );
    CREATE TABLE IF NOT EXISTS players (
      user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(32) NOT NULL,
      gender VARCHAR(16) NOT NULL,
      look_id VARCHAR(32) NOT NULL,
      look_emoji VARCHAR(16) NOT NULL,
      money DOUBLE PRECISION NOT NULL DEFAULT 2500,
      belly DOUBLE PRECISION NOT NULL DEFAULT 80,
      energy DOUBLE PRECISION NOT NULL DEFAULT 80,
      vibe DOUBLE PRECISION NOT NULL DEFAULT 60,
      fame INTEGER NOT NULL DEFAULT 0,
      location VARCHAR(32) NOT NULL DEFAULT 'wuse',
      inventory JSONB NOT NULL DEFAULT '[]'::jsonb,
      equipped JSONB NOT NULL DEFAULT '{}'::jsonb,
      last_hustle_at TIMESTAMPTZ,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_users_username_lower ON users (LOWER(username));
    CREATE INDEX IF NOT EXISTS idx_players_location ON players (location);
    CREATE INDEX IF NOT EXISTS idx_players_fame ON players (fame DESC);
    ALTER TABLE players ADD COLUMN IF NOT EXISTS inventory JSONB NOT NULL DEFAULT '[]'::jsonb;
    ALTER TABLE players ADD COLUMN IF NOT EXISTS equipped JSONB NOT NULL DEFAULT '{}'::jsonb;
    ALTER TABLE players ADD COLUMN IF NOT EXISTS last_hustle_at TIMESTAMPTZ;

    CREATE TABLE IF NOT EXISTS friendships (
      id UUID PRIMARY KEY,
      requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      addressee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status VARCHAR(16) NOT NULL DEFAULT 'pending',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (requester_id, addressee_id)
    );
    CREATE INDEX IF NOT EXISTS idx_friendships_requester ON friendships(requester_id);
    CREATE INDEX IF NOT EXISTS idx_friendships_addressee ON friendships(addressee_id);

    CREATE TABLE IF NOT EXISTS messages (
      id UUID PRIMARY KEY,
      sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      body TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      read_at TIMESTAMPTZ
    );
    CREATE INDEX IF NOT EXISTS idx_messages_pair ON messages(sender_id, recipient_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS event_sprays (
      id UUID PRIMARY KEY,
      event_id VARCHAR(64) NOT NULL,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      amount DOUBLE PRECISION NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_event_sprays_event ON event_sprays(event_id, amount DESC);
  `);
}

async function register(username, password, email = null) {
  username = String(username || '').trim();
  if (username.length < 3 || username.length > 20) throw new Error('Username must be 3–20 characters');
  if (!/^[a-zA-Z0-9_]+$/.test(username)) throw new Error('Username: letters, numbers, underscore only');
  if (!password || password.length < 6) throw new Error('Password must be at least 6 characters');

  const existing = await pool.query('SELECT id FROM users WHERE LOWER(username) = LOWER($1)', [username]);
  if (existing.rowCount > 0) throw new Error('Username already taken');

  const id = uuidv4();
  const password_hash = await bcrypt.hash(password, 12);
  await pool.query(
    `INSERT INTO users (id, username, password_hash, email, created_at) VALUES ($1, $2, $3, $4, NOW())`,
    [id, username, password_hash, email || null]
  );
  return { id, username };
}

async function login(username, password) {
  const res = await pool.query(
    'SELECT id, username, password_hash FROM users WHERE LOWER(username) = LOWER($1)',
    [String(username || '').trim()]
  );
  if (res.rowCount === 0) throw new Error('Invalid username or password');
  const user = res.rows[0];
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) throw new Error('Invalid username or password');
  await pool.query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);
  return { id: user.id, username: user.username };
}

async function getUser(id) {
  const res = await pool.query('SELECT id, username FROM users WHERE id = $1', [id]);
  return res.rows[0] || null;
}

function rowToPlayer(r) {
  if (!r) return null;
  return {
    user_id: r.user_id,
    name: r.name,
    gender: r.gender,
    look_id: r.look_id,
    look_emoji: r.look_emoji,
    money: Number(r.money),
    belly: Number(r.belly),
    energy: Number(r.energy),
    vibe: Number(r.vibe),
    fame: Number(r.fame) || 0,
    location: r.location,
    inventory: Array.isArray(r.inventory) ? r.inventory : (r.inventory || []),
    equipped: r.equipped && typeof r.equipped === 'object' ? r.equipped : {},
    last_hustle_at: r.last_hustle_at,
    updated_at: r.updated_at,
  };
}

async function getPlayer(userId) {
  const res = await pool.query('SELECT * FROM players WHERE user_id = $1', [userId]);
  return rowToPlayer(res.rows[0]);
}

async function getOrCreatePlayer(userId, defaults = {}) {
  let player = await getPlayer(userId);
  if (player) return player;

  const starts = [2500, 8000, 1500, 20000, 500];
  const money = starts[Math.floor(Math.random() * starts.length)];
  const belly = 70 + Math.floor(Math.random() * 20);
  const energy = 75 + Math.floor(Math.random() * 20);
  const vibe = 50 + Math.floor(Math.random() * 30);

  await pool.query(
    `INSERT INTO players (
      user_id, name, gender, look_id, look_emoji,
      money, belly, energy, vibe, fame, location, inventory, equipped, updated_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,0,'wuse','[]'::jsonb,'{}'::jsonb,NOW())
    ON CONFLICT (user_id) DO NOTHING`,
    [
      userId,
      defaults.name || 'Player',
      defaults.gender || 'male',
      defaults.look_id || 'tee',
      defaults.look_emoji || '👕',
      money, belly, energy, vibe,
    ]
  );
  return getPlayer(userId);
}

async function savePlayer(player) {
  await pool.query(
    `UPDATE players SET
      name = $2, gender = $3, look_id = $4, look_emoji = $5,
      money = $6, belly = $7, energy = $8, vibe = $9, fame = $10,
      location = $11, inventory = $12::jsonb, equipped = $13::jsonb,
      last_hustle_at = $14, updated_at = NOW()
     WHERE user_id = $1`,
    [
      player.user_id,
      player.name,
      player.gender,
      player.look_id,
      player.look_emoji,
      player.money,
      player.belly,
      player.energy,
      player.vibe,
      player.fame || 0,
      player.location || 'wuse',
      JSON.stringify(player.inventory || []),
      JSON.stringify(player.equipped || {}),
      player.last_hustle_at || null,
    ]
  );
}

/** Atomic money/stat updates inside a transaction where needed */
async function withPlayerLock(userId, fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const res = await client.query('SELECT * FROM players WHERE user_id = $1 FOR UPDATE', [userId]);
    if (res.rowCount === 0) {
      await client.query('ROLLBACK');
      throw new Error('Player not found');
    }
    const player = rowToPlayer(res.rows[0]);
    const result = await fn(player, client);
    await client.query(
      `UPDATE players SET
        money = $2, belly = $3, energy = $4, vibe = $5, fame = $6,
        location = $7, inventory = $8::jsonb, equipped = $9::jsonb,
        last_hustle_at = $10, look_emoji = $11, name = $12, updated_at = NOW()
       WHERE user_id = $1`,
      [
        player.user_id,
        player.money,
        player.belly,
        player.energy,
        player.vibe,
        player.fame || 0,
        player.location || 'wuse',
        JSON.stringify(player.inventory || []),
        JSON.stringify(player.equipped || {}),
        player.last_hustle_at || null,
        player.look_emoji,
        player.name,
      ]
    );
    await client.query('COMMIT');
    return result;
  } catch (e) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    throw e;
  } finally {
    client.release();
  }
}

async function userCount() {
  const res = await pool.query('SELECT COUNT(*)::int AS c FROM users');
  return res.rows[0].c;
}

async function topFame(limit = 10) {
  const res = await pool.query(
    `SELECT name, look_emoji, fame, money FROM players ORDER BY fame DESC, money DESC LIMIT $1`,
    [limit]
  );
  return res.rows.map((r) => ({
    name: r.name,
    look_emoji: r.look_emoji,
    fame: Number(r.fame),
    money: Number(r.money),
  }));
}

async function healthCheck() {
  await pool.query('SELECT 1');
  return true;
}

module.exports = {
  pool,
  migrate,
  register,
  login,
  getUser,
  getPlayer,
  getOrCreatePlayer,
  savePlayer,
  withPlayerLock,
  userCount,
  topFame,
  healthCheck,
};
