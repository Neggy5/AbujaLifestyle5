const { v4: uuidv4 } = require('uuid');
const db = require('./db');

/**
 * Rolling lounge events by time-of-day (WAT-ish, server local UTC+1 approximate).
 * Active event depends on hour so there's always something on.
 */
const EVENT_DEFS = [
  { id: 'jabi-lounge', name: 'Jabi Lounge Night', location: 'jabi', emoji: '🎧', hours: [18, 19, 20, 21, 22, 23], desc: 'DJ spinning. Spray the room. Top spenders get fame.' },
  { id: 'wuse-suya', name: 'Wuse Suya Festival', location: 'wuse', emoji: '🔥', hours: [12, 13, 14, 15, 16, 17], desc: 'Smoke in the air. Hustle and flex at the market.' },
  { id: 'maitama-power', name: 'Maitama Power Breakfast', location: 'maitama', emoji: '☕', hours: [7, 8, 9, 10, 11], desc: 'Big men energy. Quiet flex only.' },
  { id: 'gwarinpa-block', name: 'Gwarinpa Block Party', location: 'gwarinpa', emoji: '🎉', hours: [0, 1, 2, 3, 4, 5, 6], desc: 'Estate night. Dance till light.' },
];

function currentHour() {
  // Approximate WAT = UTC+1
  const d = new Date();
  return (d.getUTCHours() + 1) % 24;
}

function getActiveEvent() {
  const h = currentHour();
  return EVENT_DEFS.find((e) => e.hours.includes(h)) || EVENT_DEFS[0];
}

function listEvents() {
  const active = getActiveEvent();
  return EVENT_DEFS.map((e) => ({
    ...e,
    active: e.id === active.id,
  }));
}

async function recordEventSpray(eventId, userId, amount) {
  const id = uuidv4();
  await db.pool.query(
    `INSERT INTO event_sprays (id, event_id, user_id, amount, created_at) VALUES ($1,$2,$3,$4,NOW())`,
    [id, eventId, userId, amount]
  );
}

async function eventLeaderboard(eventId, limit = 15) {
  const res = await db.pool.query(
    `SELECT es.user_id, SUM(es.amount)::float AS total, p.name, p.look_emoji
     FROM event_sprays es
     JOIN players p ON p.user_id = es.user_id
     WHERE es.event_id = $1
       AND es.created_at > NOW() - INTERVAL '24 hours'
     GROUP BY es.user_id, p.name, p.look_emoji
     ORDER BY total DESC
     LIMIT $2`,
    [eventId, limit]
  );
  return res.rows.map((r, i) => ({
    rank: i + 1,
    userId: r.user_id,
    name: r.name,
    look_emoji: r.look_emoji,
    total: Number(r.total),
  }));
}

module.exports = {
  EVENT_DEFS,
  getActiveEvent,
  listEvents,
  recordEventSpray,
  eventLeaderboard,
};
