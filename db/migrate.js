require('dotenv').config();
const { Pool } = require('pg');
const connectionString = process.env.DATABASE_URL;
if (!connectionString) { console.error('DATABASE_URL required'); process.exit(1); }
const pool = new Pool({
  connectionString,
  ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false },
});
const SQL = `
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
ALTER TABLE players ADD COLUMN IF NOT EXISTS inventory JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE players ADD COLUMN IF NOT EXISTS equipped JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE players ADD COLUMN IF NOT EXISTS last_hustle_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS friendships (
  id UUID PRIMARY KEY,
  requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  addressee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(16) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (requester_id, addressee_id),
  CHECK (requester_id <> addressee_id)
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
CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipient_id, created_at DESC);

CREATE TABLE IF NOT EXISTS event_sprays (
  id UUID PRIMARY KEY,
  event_id VARCHAR(64) NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_event_sprays_event ON event_sprays(event_id, amount DESC);

CREATE INDEX IF NOT EXISTS idx_users_username_lower ON users (LOWER(username));
CREATE INDEX IF NOT EXISTS idx_players_location ON players (location);
CREATE INDEX IF NOT EXISTS idx_players_fame ON players (fame DESC);
`;
async function main() {
  const c = await pool.connect();
  try { await c.query(SQL); console.log('Migrations OK v5'); }
  finally { c.release(); await pool.end(); }
}
main().catch(e => { console.error(e); process.exit(1); });
