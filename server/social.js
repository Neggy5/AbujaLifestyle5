const { v4: uuidv4 } = require('uuid');
const db = require('./db');

async function areFriends(userA, userB) {
  const res = await db.pool.query(
    `SELECT 1 FROM friendships
     WHERE status = 'accepted'
       AND ((requester_id = $1 AND addressee_id = $2) OR (requester_id = $2 AND addressee_id = $1))
     LIMIT 1`,
    [userA, userB]
  );
  return res.rowCount > 0;
}

async function sendRequest(fromId, toUsername) {
  const to = await db.pool.query(
    'SELECT id, username FROM users WHERE LOWER(username) = LOWER($1)',
    [String(toUsername || '').trim()]
  );
  if (to.rowCount === 0) throw new Error('User not found');
  const toId = to.rows[0].id;
  if (toId === fromId) throw new Error('Cannot friend yourself');

  const existing = await db.pool.query(
    `SELECT * FROM friendships
     WHERE (requester_id = $1 AND addressee_id = $2) OR (requester_id = $2 AND addressee_id = $1)`,
    [fromId, toId]
  );
  if (existing.rowCount > 0) {
    const row = existing.rows[0];
    if (row.status === 'accepted') throw new Error('Already friends');
    if (row.status === 'pending') throw new Error('Request already pending');
  }

  const id = uuidv4();
  await db.pool.query(
    `INSERT INTO friendships (id, requester_id, addressee_id, status, created_at)
     VALUES ($1, $2, $3, 'pending', NOW())`,
    [id, fromId, toId]
  );
  return { id, to: { id: toId, username: to.rows[0].username } };
}

async function respondRequest(userId, friendshipId, accept) {
  const res = await db.pool.query('SELECT * FROM friendships WHERE id = $1', [friendshipId]);
  if (res.rowCount === 0) throw new Error('Request not found');
  const row = res.rows[0];
  if (row.addressee_id !== userId) throw new Error('Not your request to answer');
  if (row.status !== 'pending') throw new Error('Already handled');
  const status = accept ? 'accepted' : 'rejected';
  await db.pool.query('UPDATE friendships SET status = $1 WHERE id = $2', [status, friendshipId]);
  return { status };
}

async function listFriends(userId) {
  const res = await db.pool.query(
    `SELECT f.id, f.status, f.created_at,
            CASE WHEN f.requester_id = $1 THEN u2.id ELSE u1.id END AS friend_id,
            CASE WHEN f.requester_id = $1 THEN u2.username ELSE u1.username END AS username,
            p.name, p.look_emoji, p.location, p.fame
     FROM friendships f
     JOIN users u1 ON u1.id = f.requester_id
     JOIN users u2 ON u2.id = f.addressee_id
     LEFT JOIN players p ON p.user_id = CASE WHEN f.requester_id = $1 THEN u2.id ELSE u1.id END
     WHERE f.status = 'accepted' AND (f.requester_id = $1 OR f.addressee_id = $1)
     ORDER BY username`,
    [userId]
  );
  return res.rows.map((r) => ({
    friendshipId: r.id,
    userId: r.friend_id,
    username: r.username,
    name: r.name,
    look_emoji: r.look_emoji,
    location: r.location,
    fame: Number(r.fame) || 0,
  }));
}

async function listPending(userId) {
  const incoming = await db.pool.query(
    `SELECT f.id, u.username, p.name, p.look_emoji, f.created_at
     FROM friendships f
     JOIN users u ON u.id = f.requester_id
     LEFT JOIN players p ON p.user_id = f.requester_id
     WHERE f.addressee_id = $1 AND f.status = 'pending'
     ORDER BY f.created_at DESC`,
    [userId]
  );
  const outgoing = await db.pool.query(
    `SELECT f.id, u.username, p.name, p.look_emoji, f.created_at
     FROM friendships f
     JOIN users u ON u.id = f.addressee_id
     LEFT JOIN players p ON p.user_id = f.addressee_id
     WHERE f.requester_id = $1 AND f.status = 'pending'
     ORDER BY f.created_at DESC`,
    [userId]
  );
  return {
    incoming: incoming.rows.map((r) => ({ id: r.id, username: r.username, name: r.name, look_emoji: r.look_emoji })),
    outgoing: outgoing.rows.map((r) => ({ id: r.id, username: r.username, name: r.name, look_emoji: r.look_emoji })),
  };
}

async function sendMessage(fromId, toUserId, body) {
  body = String(body || '').trim().slice(0, 500);
  if (!body) throw new Error('Empty message');
  if (/https?:|www\.|\.com|\.ng|\+?\d{7,}/i.test(body)) throw new Error('Links and numbers blocked');
  if (!(await areFriends(fromId, toUserId))) throw new Error('Only friends can message');
  const id = uuidv4();
  await db.pool.query(
    `INSERT INTO messages (id, sender_id, recipient_id, body, created_at) VALUES ($1,$2,$3,$4,NOW())`,
    [id, fromId, toUserId, body]
  );
  return { id, body, at: Date.now() };
}

async function getThread(userId, otherId, limit = 50) {
  if (!(await areFriends(userId, otherId))) throw new Error('Only friends can message');
  const res = await db.pool.query(
    `SELECT id, sender_id, recipient_id, body, created_at
     FROM messages
     WHERE (sender_id = $1 AND recipient_id = $2) OR (sender_id = $2 AND recipient_id = $1)
     ORDER BY created_at DESC LIMIT $3`,
    [userId, otherId, limit]
  );
  await db.pool.query(
    `UPDATE messages SET read_at = NOW()
     WHERE recipient_id = $1 AND sender_id = $2 AND read_at IS NULL`,
    [userId, otherId]
  );
  return res.rows.reverse().map((r) => ({
    id: r.id,
    fromMe: r.sender_id === userId,
    body: r.body,
    at: r.created_at,
  }));
}

async function findUserByUsername(username) {
  const res = await db.pool.query(
    `SELECT u.id, u.username, p.name, p.look_emoji, p.location, p.fame
     FROM users u LEFT JOIN players p ON p.user_id = u.id
     WHERE LOWER(u.username) = LOWER($1)`,
    [String(username || '').trim()]
  );
  return res.rows[0] || null;
}

module.exports = {
  areFriends,
  sendRequest,
  respondRequest,
  listFriends,
  listPending,
  sendMessage,
  getThread,
  findUserByUsername,
};
