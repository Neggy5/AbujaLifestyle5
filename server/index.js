require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const { createClient } = require('redis');

const db = require('./db');
const { signToken, verifyToken, authMiddleware } = require('./auth');
const economy = require('./economy');
const presenceRedis = require('./presence');
const { LOCATIONS, HUSTLES, BOUTIQUE } = require('./catalog');
const social = require('./social');
const events = require('./events');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;
const PUBLIC = path.join(__dirname, '..', 'public');

app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '24kb' }));

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 40, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many attempts. Try again later.' } });
const apiLimiter = rateLimit({ windowMs: 60 * 1000, max: 180, standardHeaders: true, legacyHeaders: false });
const actionLimiter = rateLimit({ windowMs: 60 * 1000, max: 40, standardHeaders: true, legacyHeaders: false, message: { error: 'Slow down.' } });

app.use('/api/', apiLimiter);
app.use(express.static(PUBLIC, { maxAge: process.env.NODE_ENV === 'production' ? '1h' : 0 }));

const io = new Server(server, {
  cors: { origin: true, methods: ['GET', 'POST'] },
  pingTimeout: 30000,
  pingInterval: 25000,
  maxHttpBufferSize: 5e4,
  transports: ['websocket', 'polling'],
});

const localPresence = new Map();
let redisClient = null;

async function roomPeople(location) {
  if (redisClient) {
    try { return await presenceRedis.listLocation(redisClient, location); } catch (e) { console.error('[presence]', e.message); }
  }
  const list = [];
  for (const p of localPresence.values()) {
    if (p.location === location) list.push({ userId: p.userId, username: p.username, name: p.name, look_emoji: p.look_emoji, guest: !!p.guest });
  }
  return list;
}

async function onlineTotal() {
  if (redisClient) {
    try { return await presenceRedis.onlineCount(redisClient); } catch (_) {}
  }
  return localPresence.size;
}

async function setupRedis() {
  const url = process.env.REDIS_URL;
  if (!url) { console.warn('[redis] REDIS_URL not set – single-instance mode'); return; }
  try {
    const pubClient = createClient({ url });
    const subClient = pubClient.duplicate();
    pubClient.on('error', (e) => console.error('[redis pub]', e.message));
    subClient.on('error', (e) => console.error('[redis sub]', e.message));
    await Promise.all([pubClient.connect(), subClient.connect()]);
    io.adapter(createAdapter(pubClient, subClient));
    redisClient = pubClient;
    console.log('[redis] adapter + presence ready');
  } catch (e) {
    console.error('[redis] connect failed:', e.message);
  }
}

app.get('/api/catalog', (req, res) => {
  res.json({ locations: LOCATIONS, hustles: Object.values(HUSTLES), boutique: Object.values(BOUTIQUE) });
});

app.get('/api/leaderboard', async (req, res) => {
  try { res.json({ top: await db.topFame(15) }); } catch { res.json({ top: [] }); }
});

app.get('/api/health', async (req, res) => {
  try {
    await db.healthCheck();
    res.json({ status: 'ok', game: 'Abuja Lifestyle', version: '5.0.0', online: await onlineTotal() });
  } catch {
    res.status(503).json({ status: 'degraded', error: 'database unavailable' });
  }
});

app.get('/api/stats', async (req, res) => {
  try {
    res.json({ registeredUsers: await db.userCount(), online: await onlineTotal(), city: 'Abuja' });
  } catch {
    res.json({ registeredUsers: 0, online: await onlineTotal(), city: 'Abuja' });
  }
});

app.post('/api/register', authLimiter, async (req, res) => {
  try {
    const { username, password, email } = req.body || {};
    const user = await db.register(username, password, email);
    const token = signToken({ userId: user.id, username: user.username });
    res.status(201).json({ token, user: { id: user.id, username: user.username } });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

app.post('/api/login', authLimiter, async (req, res) => {
  try {
    const { username, password } = req.body || {};
    const user = await db.login(username, password);
    const token = signToken({ userId: user.id, username: user.username });
    res.json({ token, user: { id: user.id, username: user.username } });
  } catch (e) { res.status(401).json({ error: e.message }); }
});

app.get('/api/me', authMiddleware, async (req, res) => {
  try {
    const user = await db.getUser(req.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const player = await db.getOrCreatePlayer(req.userId);
    res.json({ user, player });
  } catch { res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/player', authMiddleware, async (req, res) => {
  try {
    const body = req.body || {};
    let player = await db.getOrCreatePlayer(req.userId, {
      name: body.name, gender: body.gender, look_id: body.look_id, look_emoji: body.look_emoji,
    });
    if (body.name) player.name = String(body.name).slice(0, 18);
    if (body.gender) player.gender = body.gender;
    if (body.look_id) player.look_id = body.look_id;
    if (body.look_emoji) player.look_emoji = body.look_emoji;
    await db.savePlayer(player);
    res.json({ player });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

app.post('/api/action/hustle', authMiddleware, actionLimiter, async (req, res) => {
  try { res.json(await economy.doHustle(req.userId, req.body && req.body.hustleId)); }
  catch (e) { res.status(400).json({ error: e.message }); }
});
app.post('/api/action/travel', authMiddleware, actionLimiter, async (req, res) => {
  try { res.json(await economy.doTravel(req.userId, req.body && req.body.locationId)); }
  catch (e) { res.status(400).json({ error: e.message }); }
});
app.post('/api/action/food', authMiddleware, actionLimiter, async (req, res) => {
  try { res.json(await economy.doFood(req.userId)); }
  catch (e) { res.status(400).json({ error: e.message }); }
});
app.post('/api/action/rest', authMiddleware, actionLimiter, async (req, res) => {
  try { res.json(await economy.doRest(req.userId)); }
  catch (e) { res.status(400).json({ error: e.message }); }
});
app.post('/api/action/spray', authMiddleware, actionLimiter, async (req, res) => {
  try {
    const result = await economy.doSpray(req.userId, req.body && req.body.amount);
    const active = events.getActiveEvent();
    if (result.player && result.player.location === active.location) {
      try { await events.recordEventSpray(active.id, req.userId, result.amount); } catch (_) {}
    }
    res.json(Object.assign({}, result, { eventId: active.id, eventName: active.name }));
  } catch (e) { res.status(400).json({ error: e.message }); }
});
app.post('/api/action/buy', authMiddleware, actionLimiter, async (req, res) => {
  try { res.json(await economy.buyItem(req.userId, req.body && req.body.itemId)); }
  catch (e) { res.status(400).json({ error: e.message }); }
});
app.post('/api/action/equip', authMiddleware, actionLimiter, async (req, res) => {
  try { res.json(await economy.equipItem(req.userId, req.body && req.body.itemId)); }
  catch (e) { res.status(400).json({ error: e.message }); }
});


// ---------- Social ----------
app.get('/api/friends', authMiddleware, async (req, res) => {
  try {
    const friends = await social.listFriends(req.userId);
    const pending = await social.listPending(req.userId);
    res.json({ friends, pending });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

app.post('/api/friends/request', authMiddleware, actionLimiter, async (req, res) => {
  try {
    const result = await social.sendRequest(req.userId, req.body && req.body.username);
    res.json(result);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

app.post('/api/friends/respond', authMiddleware, actionLimiter, async (req, res) => {
  try {
    const accept = !!(req.body && req.body.accept);
    const result = await social.respondRequest(req.userId, req.body && req.body.friendshipId, accept);
    res.json(result);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

app.get('/api/messages/:otherId', authMiddleware, async (req, res) => {
  try {
    const thread = await social.getThread(req.userId, req.params.otherId);
    res.json({ messages: thread });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

app.post('/api/messages', authMiddleware, actionLimiter, async (req, res) => {
  try {
    const toUserId = req.body && req.body.toUserId;
    const body = req.body && req.body.body;
    const msg = await social.sendMessage(req.userId, toUserId, body);
    // realtime notify if online
    io.to('user:' + toUserId).emit('dm', { from: req.userId, body: msg.body, at: msg.at });
    res.json(msg);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

app.get('/api/users/lookup', authMiddleware, async (req, res) => {
  try {
    const u = await social.findUserByUsername(req.query.username);
    if (!u) return res.status(404).json({ error: 'Not found' });
    res.json({ user: u });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// ---------- Events ----------
app.get('/api/events', async (req, res) => {
  const list = events.listEvents();
  const active = events.getActiveEvent();
  let board = [];
  try { board = await events.eventLeaderboard(active.id); } catch (_) {}
  res.json({ events: list, active, board });
});

app.get('/api/events/:id/board', async (req, res) => {
  try {
    res.json({ board: await events.eventLeaderboard(req.params.id) });
  } catch (e) { res.json({ board: [] }); }
});

app.get('*', (req, res) => { res.sendFile(path.join(PUBLIC, 'index.html')); });

io.use((socket, next) => {
  const token = (socket.handshake.auth && socket.handshake.auth.token) || (socket.handshake.query && socket.handshake.query.token);
  if (!token) { socket.data.guest = true; return next(); }
  const decoded = verifyToken(token);
  if (!decoded || !decoded.userId) return next(new Error('Invalid token'));
  socket.data.userId = decoded.userId;
  socket.data.username = decoded.username;
  socket.data.guest = false;
  next();
});

io.on('connection', (socket) => {
  if (socket.data.userId) socket.join('user:' + socket.data.userId);

  (async () => { socket.emit('hello', { online: await onlineTotal(), guest: !!socket.data.guest }); })();

  socket.on('join', async (payload) => {
    payload = payload || {};
    const location = String(payload.location || 'wuse').slice(0, 32);
    const name = String(payload.name || socket.data.username || 'Guest').slice(0, 18);
    const look_emoji = String(payload.look_emoji || '👤').slice(0, 8);
    const fromLoc = socket.data.location;
    if (fromLoc) socket.leave('loc:' + fromLoc);
    socket.data.location = location;
    socket.data.name = name;
    socket.data.look_emoji = look_emoji;
    socket.join('loc:' + location);
    const member = {
      userId: socket.data.userId || null,
      username: socket.data.username || null,
      name: socket.data.guest ? name + ' (guest)' : name,
      look_emoji: look_emoji, location: location, guest: !!socket.data.guest,
    };
    localPresence.set(socket.id, member);
    if (redisClient) {
      try {
        if (fromLoc) await presenceRedis.moveMember(redisClient, socket.id, fromLoc, member);
        else await presenceRedis.setMember(redisClient, socket.id, member);
      } catch (e) { console.error('[presence set]', e.message); }
    }
    if (fromLoc && fromLoc !== location) {
      io.to('loc:' + fromLoc).emit('presence', { location: fromLoc, people: await roomPeople(fromLoc), online: await onlineTotal() });
    }
    const out = { location: location, people: await roomPeople(location), online: await onlineTotal() };
    io.to('loc:' + location).emit('presence', out);
    socket.emit('joined', out);
  });

  socket.on('chat', (payload) => {
    payload = payload || {};
    const text = String(payload.text || '').trim().slice(0, 120);
    if (!text) return;
    if (/https?:|www\.|\.com|\.ng|@|\+?\d{7,}/i.test(text)) {
      socket.emit('chat_error', { error: 'Links and phone numbers are blocked' });
      return;
    }
    const location = socket.data.location;
    if (!location) return;
    io.to('loc:' + location).emit('chat', {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name: socket.data.name || 'Someone', look_emoji: socket.data.look_emoji || '👤',
      text: text, guest: !!socket.data.guest, at: Date.now(),
    });
  });

  socket.on('spray_broadcast', (payload) => {
    payload = payload || {};
    const location = socket.data.location;
    if (!location || socket.data.guest) return;
    io.to('loc:' + location).emit('spray', { from: socket.data.name, fromEmoji: socket.data.look_emoji, amount: payload.amount || 200, at: Date.now() });
  });

  socket.on('react', (payload) => {
    payload = payload || {};
    const emoji = String(payload.emoji || '').slice(0, 4);
    const location = socket.data.location;
    if (!location || !emoji) return;
    io.to('loc:' + location).emit('react', { name: socket.data.name, emoji: emoji, at: Date.now() });
  });

  socket.on('disconnect', async () => {
    const location = socket.data.location;
    localPresence.delete(socket.id);
    if (redisClient) { try { await presenceRedis.removeMember(redisClient, socket.id, location); } catch (_) {} }
    if (location) {
      io.to('loc:' + location).emit('presence', { location: location, people: await roomPeople(location), online: await onlineTotal() });
    }
  });
});

setInterval(async () => { io.emit('online', { online: await onlineTotal() }); }, 15000);

async function boot() {
  try { await db.migrate(); console.log('[db] migrations applied (v4)'); }
  catch (e) { console.error('[db] migrate failed:', e.message); }
  await setupRedis();
  server.listen(PORT, '0.0.0.0', () => { console.log('Abuja Lifestyle v5 on :' + PORT); });
}

boot().catch((e) => { console.error('Fatal', e); process.exit(1); });
