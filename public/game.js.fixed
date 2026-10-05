/* Abuja Lifestyle v2 – auth + realtime rooms */

const LOCATIONS = [
  { id: 'wuse', name: 'Wuse Market', desc: 'Busy, loud, everything dey for sale.', emoji: '🛍️' },
  { id: 'garki', name: 'Garki Area 10', desc: 'Old school Abuja. Offices & mama put.', emoji: '🏢' },
  { id: 'maitama', name: 'Maitama', desc: 'Big men, embassies, quiet roads.', emoji: '🏛️' },
  { id: 'asokoro', name: 'Asokoro', desc: 'Presidential vibe. Security everywhere.', emoji: '🦁' },
  { id: 'jabi', name: 'Jabi Lake', desc: 'Mall, lake, evening breeze.', emoji: '🌅' },
  { id: 'gwarinpa', name: 'Gwarinpa', desc: 'Biggest estate. Hustle & neighbours.', emoji: '🏠' },
  { id: 'kubwa', name: 'Kubwa', desc: 'Satellite town. Long bus ride.', emoji: '🚌' },
  { id: 'lugbe', name: 'Lugbe', desc: 'Near the airport. Young blood.', emoji: '✈️' },
  { id: 'cbd', name: 'Central Business District', desc: 'NNPC, banks, National Mosque.', emoji: '🏙️' },
  { id: 'utako', name: 'Utako', desc: 'Park and ride. Buses & keke.', emoji: '🚏' },
  { id: 'life-camp', name: 'Life Camp', desc: 'Quiet residential.', emoji: '🌳' },
  { id: 'apo', name: 'Apo', desc: 'Between power and people.', emoji: '🍲' },
];

const LOOKS = {
  male: [
    { id: 'tee', label: 'Plain Tee', emoji: '👕' },
    { id: 'agbada', label: 'Agbada', emoji: '🥋' },
    { id: 'senator', label: 'Senator', emoji: '👔' },
    { id: 'jersey', label: 'Jersey', emoji: '⚽' },
    { id: 'kaftan', label: 'Kaftan', emoji: '👘' },
    { id: 'suit', label: 'Suit', emoji: '🤵' },
  ],
  female: [
    { id: 'gown', label: 'Gown', emoji: '👗' },
    { id: 'ankara', label: 'Ankara', emoji: '🧣' },
    { id: 'gele', label: 'Gele Queen', emoji: '👑' },
    { id: 'native', label: 'Native', emoji: '💃' },
    { id: 'casual', label: 'Casual', emoji: '👚' },
    { id: 'power', label: 'Power Dress', emoji: '💼' },
  ],
};

const NPCS = [
  { name: 'Mallam Sani', tag: 'NPC · Taxi', emoji: '🚕' },
  { name: 'Aunty Ngozi', tag: 'NPC · Mama Put', emoji: '🍛' },
  { name: 'DJ Zico', tag: 'NPC · Lounge', emoji: '🎧' },
  { name: 'Officer Bala', tag: 'NPC · Checkpoint', emoji: '👮' },
  { name: 'Alhaji Musa', tag: 'NPC · Big Man', emoji: '🦁' },
  { name: 'Iya Basira', tag: 'NPC · Market', emoji: '🛒' },
];

const HUSTLES = [
  { id: 'suya', name: 'Sell Suya', pay: [800, 2200], energy: 18, belly: -8, desc: 'Roadside stick. Smoke and money.' },
  { id: 'keke', name: 'Keke Napep', pay: [1200, 3500], energy: 22, belly: -12, desc: 'Utako to Gwarinpa runs.' },
  { id: 'office', name: 'Contract Work', pay: [2500, 6000], energy: 15, belly: -5, desc: 'Paperwork for a big man.' },
  { id: 'market', name: 'Market Load', pay: [600, 1800], energy: 25, belly: -15, desc: 'Carry bags at Wuse.' },
  { id: 'content', name: 'Phone Content', pay: [400, 2500], energy: 10, belly: -3, desc: 'Skits. Algorithm decides.' },
];

const STATE = {
  token: localStorage.getItem('abuja_token') || null,
  user: null,
  player: null,
  guest: false,
  location: 'wuse',
  socket: null,
  roomPeople: [],
};

function $(s) { return document.querySelector(s); }
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  $('#' + id).classList.add('active');
}
function toast(msg) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  $('#app').appendChild(t);
  setTimeout(() => t.remove(), 2300);
}
function openModal(html) {
  $('#modal-content').innerHTML = html;
  $('#modal-overlay').classList.remove('hidden');
}
function closeModal() {
  $('#modal-overlay').classList.add('hidden');
}
window.closeModal = closeModal;
$('#modal-overlay').addEventListener('click', e => {
  if (e.target === $('#modal-overlay')) closeModal();
});

async function api(path, opts) {
  opts = opts || {};
  const headers = Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {});
  if (STATE.token) headers.Authorization = 'Bearer ' + STATE.token;
  const res = await fetch(path, Object.assign({}, opts, { headers: headers }));
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

async function refreshStats() {
  try {
    const d = await api('/api/stats');
    $('#online-count').textContent = d.online != null ? d.online : '—';
    $('#user-count').textContent = d.registeredUsers != null ? d.registeredUsers : '—';
  } catch (e) {
    $('#online-count').textContent = '—';
  }
}
refreshStats();
setInterval(refreshStats, 20000);

let authMode = 'login';
document.querySelectorAll('.auth-tabs .tab').forEach(tab => {
  tab.onclick = () => {
    document.querySelectorAll('.auth-tabs .tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    authMode = tab.dataset.tab;
    $('#auth-submit').textContent = authMode === 'login' ? 'Login' : 'Create account';
    $('#auth-email').style.display = authMode === 'register' ? 'block' : 'none';
    $('#auth-error').textContent = '';
  };
});

$('#auth-form').onsubmit = async (e) => {
  e.preventDefault();
  $('#auth-error').textContent = '';
  const username = $('#auth-username').value.trim();
  const password = $('#auth-password').value;
  const email = $('#auth-email').value.trim() || undefined;
  try {
    const endpoint = authMode === 'login' ? '/api/login' : '/api/register';
    const body = authMode === 'login' ? { username: username, password: password } : { username: username, password: password, email: email };
    const data = await api(endpoint, { method: 'POST', body: JSON.stringify(body) });
    STATE.token = data.token;
    STATE.user = data.user;
    STATE.guest = false;
    localStorage.setItem('abuja_token', data.token);
    await afterAuth();
  } catch (err) {
    $('#auth-error').textContent = err.message;
  }
};

$('#btn-guest').onclick = () => {
  STATE.guest = true;
  STATE.token = null;
  STATE.user = null;
  localStorage.removeItem('abuja_token');
  showScreen('screen-create');
};

async function afterAuth() {
  try {
    const me = await api('/api/me');
    STATE.user = me.user;
    STATE.player = me.player;
    if (!me.player.name || me.player.name === 'Player') {
      showScreen('screen-create');
      if (me.user && me.user.username) $('#player-name').value = me.user.username;
    } else {
      enterGame();
    }
  } catch (e) {
    localStorage.removeItem('abuja_token');
    STATE.token = null;
    toast('Session expired. Login again.');
  }
}

if (STATE.token) {
  afterAuth().catch(() => {});
}

let chosenGender = null;
let chosenLook = null;

document.querySelectorAll('.gender-btn').forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll('.gender-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    chosenGender = btn.dataset.gender;
    renderLooks();
    checkCreateReady();
  };
});

function renderLooks() {
  const grid = $('#look-grid');
  grid.innerHTML = '';
  if (!chosenGender) return;
  LOOKS[chosenGender].forEach(l => {
    const card = document.createElement('div');
    card.className = 'look-card' + (chosenLook === l.id ? ' selected' : '');
    card.innerHTML = '<span class="emoji">' + l.emoji + '</span>' + l.label;
    card.onclick = () => { chosenLook = l.id; renderLooks(); checkCreateReady(); };
    grid.appendChild(card);
  });
}
$('#player-name').oninput = checkCreateReady;
function checkCreateReady() {
  const name = $('#player-name').value.trim();
  $('#btn-enter').disabled = !(chosenGender && chosenLook && name.length >= 2);
}

$('#btn-enter').onclick = async () => {
  const name = $('#player-name').value.trim();
  const look = LOOKS[chosenGender].find(l => l.id === chosenLook);
  if (STATE.guest) {
    STATE.player = {
      name: name, gender: chosenGender, look_id: look.id, look_emoji: look.emoji,
      money: 2500 + Math.floor(Math.random() * 5000),
      belly: 80, energy: 80, vibe: 60, fame: 0, location: 'wuse',
    };
    enterGame();
    return;
  }
  try {
    const data = await api('/api/player', {
      method: 'POST',
      body: JSON.stringify({ name: name, gender: chosenGender, look_id: look.id, look_emoji: look.emoji }),
    });
    STATE.player = data.player;
    enterGame();
  } catch (e) {
    toast(e.message);
  }
};

function enterGame() {
  showScreen('screen-game');
  updateStats();
  connectSocket();
  setLocation(STATE.player.location || 'wuse');
  setInterval(() => {
    if (!STATE.player) return;
    STATE.player.belly = Math.max(0, STATE.player.belly - 0.35);
    STATE.player.energy = Math.max(0, STATE.player.energy - 0.2);
    if (STATE.player.belly < 20 || STATE.player.energy < 15) {
      STATE.player.vibe = Math.max(0, STATE.player.vibe - 0.4);
    }
    updateStats();
  }, 8000);
  setInterval(savePlayer, 30000);
}

function updateStats() {
  const p = STATE.player;
  if (!p) return;
  $('#stat-money').textContent = Math.floor(p.money).toLocaleString();
  setBar('bar-belly', p.belly);
  setBar('bar-energy', p.energy);
  setBar('bar-vibe', p.vibe);
}
function setBar(id, val) {
  const el = $('#' + id);
  el.style.width = Math.min(100, Math.max(0, val)) + '%';
  el.classList.toggle('low', val < 25);
}

async function savePlayer() {
  if (STATE.guest || !STATE.token || !STATE.player) return;
  try {
    await api('/api/player', {
      method: 'PUT',
      body: JSON.stringify({
        money: STATE.player.money, belly: STATE.player.belly, energy: STATE.player.energy,
        vibe: STATE.player.vibe, fame: STATE.player.fame, location: STATE.player.location, name: STATE.player.name,
      }),
    });
  } catch (e) {}
}

function setLocation(id) {
  STATE.location = id;
  if (STATE.player) STATE.player.location = id;
  const loc = LOCATIONS.find(l => l.id === id);
  if (!loc) return;
  $('#loc-name').textContent = loc.name;
  $('#loc-desc').textContent = loc.desc;
  renderPeople();
  addChat('system', 'You arrived at ' + loc.name + '.');
  if (STATE.socket && STATE.socket.connected) {
    STATE.socket.emit('join', { location: id, name: STATE.player.name, look_emoji: STATE.player.look_emoji });
  }
  savePlayer();
}

function renderPeople() {
  const list = $('#people-list');
  list.innerHTML = '';
  const npcs = NPCS.slice().sort(() => Math.random() - 0.5).slice(0, 2);
  npcs.forEach(p => {
    const el = document.createElement('div');
    el.className = 'person npc';
    el.innerHTML = '<div class="p-emoji">' + p.emoji + '</div><div class="p-name">' + p.name + '</div><div class="p-tag">' + p.tag + '</div>';
    el.onclick = () => openPerson({ name: p.name, emoji: p.emoji, isNpc: true });
    list.appendChild(el);
  });
  STATE.roomPeople.forEach(p => {
    if (STATE.user && p.userId === STATE.user.id) return;
    const el = document.createElement('div');
    el.className = 'person';
    el.innerHTML = '<div class="p-emoji">' + (p.look_emoji || '👤') + '</div><div class="p-name">' + p.name + '</div><div class="p-tag">' + (p.guest ? 'Guest' : 'Online') + '</div>';
    el.onclick = () => openPerson({ name: p.name, emoji: p.look_emoji, userId: p.userId, isNpc: false, guest: p.guest });
    list.appendChild(el);
  });
  $('#loc-people').textContent = (STATE.roomPeople.length + npcs.length) + ' here';
}

function openPerson(p) {
  const safeName = (p.name || '').replace(/'/g, "\\'");
  openModal('<div class="close-row"><h3>' + (p.emoji || '👤') + ' ' + p.name + '</h3><button class="close-x" onclick="closeModal()">✕</button></div>' +
    '<p>' + (p.isNpc ? 'NPC – part of the city.' : (p.guest ? 'Guest player.' : 'Real player online.')) + '</p>' +
    '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
    '<button class="btn primary small" onclick="doSpray(\'' + (p.userId || '') + '\',\'' + safeName + '\')">💸 Spray</button>' +
    '<button class="btn ghost small" onclick="closeModal();toast(\'' + safeName + ' nodded back.\')">👋 Wave</button></div>');
}

window.doSpray = async function (targetUserId, targetName) {
  if (STATE.guest) { toast('Login to spray.'); return; }
  try {
    const data = await api('/api/action/spray', { method: 'POST', body: JSON.stringify({ amount: 200 }) });
    STATE.player = data.player;
    updateStats();
    closeModal();
    addChat('you', 'You sprayed ₦' + data.amount + ' on ' + targetName + ' 💸');
    toast('You sprayed ₦' + data.amount + '!');
    if (STATE.socket && STATE.socket.connected) STATE.socket.emit('spray_broadcast', { amount: data.amount });
  } catch (e) { toast(e.message); }
};

function addChat(who, text) {
  const log = $('#chat-log');
  const div = document.createElement('div');
  div.className = 'chat-msg' + (who === 'system' ? ' system' : '');
  if (who === 'system') div.textContent = text;
  else if (who === 'you') div.innerHTML = '<span class="who">You</span>' + text;
  else div.innerHTML = '<span class="who">' + who + '</span>' + text;
  log.appendChild(div);
  log.scrollTop = log.scrollHeight;
  while (log.children.length > 50) log.removeChild(log.firstChild);
}

function connectSocket() {
  if (STATE.socket) STATE.socket.disconnect();
  const opts = { transports: ['websocket', 'polling'] };
  if (STATE.token) opts.auth = { token: STATE.token };
  STATE.socket = io(opts);

  STATE.socket.on('connect', () => {
    STATE.socket.emit('join', { location: STATE.location, name: STATE.player && STATE.player.name, look_emoji: STATE.player && STATE.player.look_emoji });
  });
  STATE.socket.on('hello', d => { if (d.online != null) $('#online-count').textContent = d.online; });
  STATE.socket.on('online', d => { if (d.online != null) $('#online-count').textContent = d.online; });
  STATE.socket.on('joined', d => {
    STATE.roomPeople = d.people || [];
    renderPeople();
    if (d.online != null) $('#online-count').textContent = d.online;
  });
  STATE.socket.on('presence', d => {
    if (d.location === STATE.location) { STATE.roomPeople = d.people || []; renderPeople(); }
    if (d.online != null) $('#online-count').textContent = d.online;
  });
  STATE.socket.on('chat', msg => {
    if (msg.name === (STATE.player && STATE.player.name)) return;
    addChat(msg.name, msg.text);
  });
  STATE.socket.on('spray', msg => { addChat('system', msg.from + ' sprayed ₦' + msg.amount + ' 💸'); });
  STATE.socket.on('react', msg => { addChat(msg.name, msg.emoji); });
  STATE.socket.on('chat_error', d => toast(d.error || 'Cannot send'));
  STATE.socket.on('spray_error', d => toast(d.error || 'Cannot spray'));
}

$('#reactions').addEventListener('click', e => {
  const btn = e.target.closest('button');
  if (!btn) return;
  const r = btn.dataset.r;
  addChat('you', r);
  STATE.player.vibe = Math.min(100, STATE.player.vibe + 2);
  updateStats();
  if (STATE.socket) STATE.socket.emit('react', { emoji: r });
});

document.querySelector('.bottom-nav').addEventListener('click', e => {
  const btn = e.target.closest('button');
  if (!btn) return;
  const a = btn.dataset.action;
  if (a === 'map') openMap();
  else if (a === 'hustle') openHustle();
  else if (a === 'chat') openTalk();
  else if (a === 'flex') openFlex();
  else if (a === 'more') openMore();
});

function openMap() {
  const items = LOCATIONS.map(l =>
    '<div class="list-item" onclick="goTo(\'' + l.id + '\')"><div class="li-emoji">' + l.emoji + '</div><div class="li-body"><div class="li-title">' + l.name + '</div><div class="li-sub">' + l.desc + '</div></div></div>'
  ).join('');
  openModal('<div class="close-row"><h3>🗺️ Abuja Map</h3><button class="close-x" onclick="closeModal()">✕</button></div><p>Where you wan go?</p>' + items);
}
window.goTo = async function (id) {
  if (STATE.guest) {
    closeModal();
    setLocation(id);
    toast('Guest travel (not saved).');
    return;
  }
  try {
    const data = await api('/api/action/travel', { method: 'POST', body: JSON.stringify({ locationId: id }) });
    STATE.player = data.player;
    updateStats();
    closeModal();
    setLocation(id);
    toast('Bus ₦' + data.cost + '. You don reach.');
  } catch (e) { toast(e.message); }
};

function openHustle() {
  const items = HUSTLES.map(h =>
    '<div class="list-item" onclick="doHustle(\'' + h.id + '\')"><div class="li-emoji">💼</div><div class="li-body"><div class="li-title">' + h.name + '</div><div class="li-sub">' + h.desc + '</div></div><div class="li-right">₦' + h.pay[0] + '–' + h.pay[1] + '</div></div>'
  ).join('');
  openModal('<div class="close-row"><h3>💼 Hustle</h3><button class="close-x" onclick="closeModal()">✕</button></div><p>Make money. Energy go down.</p>' + items);
}
window.doHustle = async function (id) {
  if (STATE.guest) { toast('Login to hustle for real.'); return; }
  try {
    const data = await api('/api/action/hustle', { method: 'POST', body: JSON.stringify({ hustleId: id }) });
    STATE.player = data.player;
    updateStats();
    closeModal();
    addChat('you', 'Finished ' + data.hustle + '. +₦' + data.pay.toLocaleString());
    toast('+₦' + data.pay.toLocaleString() + ' 💰');
  } catch (e) { toast(e.message); }
};

function openTalk() {
  openModal('<div class="close-row"><h3>💬 Talk</h3><button class="close-x" onclick="closeModal()">✕</button></div><p>Realtime chat at this spot.</p>' +
    '<input type="text" id="talk-input" placeholder="Type your gist..." maxlength="120" style="width:100%;padding:12px;border-radius:10px;border:1px solid var(--border);background:var(--card);color:var(--text);font-size:1rem;margin-bottom:12px;font-family:inherit" />' +
    '<button class="btn primary full" onclick="sendTalk()">Send</button>');
  setTimeout(() => { const i = $('#talk-input'); if (i) i.focus(); }, 80);
}
window.sendTalk = function () {
  const input = $('#talk-input');
  const text = (input && input.value || '').trim();
  if (!text) return;
  if (/https?:|www\.|\.com|\.ng|@|\+?\d{7,}/i.test(text)) { toast('Links and numbers blocked.'); return; }
  addChat('you', text);
  if (STATE.socket) STATE.socket.emit('chat', { text: text });
  closeModal();
  STATE.player.vibe = Math.min(100, STATE.player.vibe + 1);
  updateStats();
};

function openFlex() {
  openModal('<div class="close-row"><h3>💸 Flex</h3><button class="close-x" onclick="closeModal()">✕</button></div>' +
    '<div class="list-item" onclick="doSprayRandom()"><div class="li-emoji">💸</div><div class="li-body"><div class="li-title">Spray the room</div><div class="li-sub">₦200 into the crowd</div></div></div>' +
    '<div class="list-item" onclick="buyFood()"><div class="li-emoji">🍛</div><div class="li-body"><div class="li-title">Chop something</div><div class="li-sub">Fill belly</div></div><div class="li-right">₦800–1,500</div></div>' +
    '<div class="list-item" onclick="rest()"><div class="li-emoji">😴</div><div class="li-body"><div class="li-title">Rest small</div><div class="li-sub">Recover energy</div></div></div>');
}
window.doSprayRandom = async function () {
  closeModal();
  if (STATE.guest) { toast('Login to spray.'); return; }
  try {
    const data = await api('/api/action/spray', { method: 'POST', body: JSON.stringify({ amount: 200 }) });
    STATE.player = data.player;
    updateStats();
    addChat('you', 'You sprayed ₦' + data.amount + ' into the crowd 💸🔥');
    toast('E choke!');
    if (STATE.socket) STATE.socket.emit('spray_broadcast', { amount: data.amount });
  } catch (e) { toast(e.message); }
};
window.buyFood = async function () {
  if (STATE.guest) { toast('Login to chop (saved).'); return; }
  try {
    const data = await api('/api/action/food', { method: 'POST', body: '{}' });
    STATE.player = data.player;
    updateStats();
    closeModal();
    toast('Chop done. ₦' + data.cost);
  } catch (e) { toast(e.message); }
};
window.rest = async function () {
  if (STATE.guest) {
    STATE.player.energy = Math.min(100, STATE.player.energy + 25);
    updateStats();
    closeModal();
    toast('You rest.');
    return;
  }
  try {
    const data = await api('/api/action/rest', { method: 'POST', body: '{}' });
    STATE.player = data.player;
    updateStats();
    closeModal();
    toast('You rest. Energy up.');
  } catch (e) { toast(e.message); }
};

function openMore() {
  const p = STATE.player;
  const u = STATE.user;
  let extra = '';
  if (!STATE.guest) {
    extra = '<div class="list-item" onclick="logout()"><div class="li-emoji">🚪</div><div class="li-body"><div class="li-title">Log out</div><div class="li-sub">Sign out of this device</div></div></div>';
  } else {
    extra = '<div class="list-item" onclick="location.reload()"><div class="li-emoji">🔑</div><div class="li-body"><div class="li-title">Create account</div><div class="li-sub">Save progress properly</div></div></div>';
  }
  openModal('<div class="close-row"><h3>⋯ More</h3><button class="close-x" onclick="closeModal()">✕</button></div>' +
    '<p><strong>' + p.look_emoji + ' ' + p.name + '</strong>' + (u ? ' · @' + u.username : ' · Guest') + ' · Fame ' + (p.fame || 0) + '</p>' +
    '<div class="list-item" onclick="window.location=\'/rules.html\'"><div class="li-emoji">📜</div><div class="li-body"><div class="li-title">House rules</div><div class="li-sub">Be kind. No scams.</div></div></div>' + extra);
}
window.logout = function () {
  localStorage.removeItem('abuja_token');
  if (STATE.socket) STATE.socket.disconnect();
  location.reload();
};
$('#btn-phone').onclick = openMore;


/* ===== v4 boutique + leaderboard ===== */
window.openBoutique = async function () {
  let items = [];
  try {
    const cat = await api('/api/catalog');
    items = cat.boutique || [];
  } catch (e) {
    toast('Could not load boutique');
    return;
  }
  const inv = (STATE.player && STATE.player.inventory) || [];
  const html = items.map(it => {
    const owned = inv.includes(it.id);
    const action = owned
      ? '<button class="btn ghost small" onclick="doEquip(\'' + it.id + '\')">Equip</button>'
      : '<button class="btn primary small" onclick="doBuy(\'' + it.id + '\')">Buy ₦' + it.price.toLocaleString() + '</button>';
    return '<div class="list-item"><div class="li-emoji">' + it.emoji + '</div><div class="li-body"><div class="li-title">' + it.name + '</div><div class="li-sub">' + (owned ? 'Owned' : 'Boutique') + '</div></div><div class="li-right">' + action + '</div></div>';
  }).join('');
  openModal('<div class="close-row"><h3>🛍️ Boutique</h3><button class="close-x" onclick="closeModal()">✕</button></div><p>Everyone can see what you equip.</p>' + html);
};

window.doBuy = async function (itemId) {
  if (STATE.guest) { toast('Login to buy drip.'); return; }
  try {
    const data = await api('/api/action/buy', { method: 'POST', body: JSON.stringify({ itemId: itemId }) });
    STATE.player = data.player;
    updateStats();
    toast('Bought ' + data.item.name + '!');
    openBoutique();
  } catch (e) { toast(e.message); }
};

window.doEquip = async function (itemId) {
  if (STATE.guest) return;
  try {
    const data = await api('/api/action/equip', { method: 'POST', body: JSON.stringify({ itemId: itemId }) });
    STATE.player = data.player;
    updateStats();
    toast('Equipped ' + data.item.name);
    if (STATE.socket) STATE.socket.emit('join', { location: STATE.location, name: STATE.player.name, look_emoji: STATE.player.look_emoji });
    openBoutique();
  } catch (e) { toast(e.message); }
};

window.openLeaderboard = async function () {
  try {
    const data = await api('/api/leaderboard');
    const rows = (data.top || []).map((r, i) =>
      '<div class="list-item"><div class="li-emoji">' + (r.look_emoji || '👤') + '</div><div class="li-body"><div class="li-title">#' + (i+1) + ' ' + r.name + '</div><div class="li-sub">Fame ' + r.fame + '</div></div><div class="li-right">₦' + Math.floor(r.money).toLocaleString() + '</div></div>'
    ).join('') || '<p>No one on the board yet.</p>';
    openModal('<div class="close-row"><h3>🏆 Fame board</h3><button class="close-x" onclick="closeModal()">✕</button></div>' + rows);
  } catch (e) { toast(e.message); }
};

// Patch openMore to include boutique links - override
const _openMoreOrig = openMore;
openMore = function () {
  const p = STATE.player;
  const u = STATE.user;
  let extra = '';
  if (!STATE.guest) {
    extra = '<div class="list-item" onclick="logout()"><div class="li-emoji">🚪</div><div class="li-body"><div class="li-title">Log out</div><div class="li-sub">Sign out of this device</div></div></div>';
  } else {
    extra = '<div class="list-item" onclick="location.reload()"><div class="li-emoji">🔑</div><div class="li-body"><div class="li-title">Create account</div><div class="li-sub">Save progress properly</div></div></div>';
  }
  openModal('<div class="close-row"><h3>⋯ More</h3><button class="close-x" onclick="closeModal()">✕</button></div>' +
    '<p><strong>' + p.look_emoji + ' ' + p.name + '</strong>' + (u ? ' · @' + u.username : ' · Guest') + ' · Fame ' + (p.fame || 0) + '</p>' +
    '<div class="list-item" onclick="openBoutique()"><div class="li-emoji">🛍️</div><div class="li-body"><div class="li-title">Boutique</div><div class="li-sub">Shades, chains, gele, phones</div></div></div>' +
    '<div class="list-item" onclick="openLeaderboard()"><div class="li-emoji">🏆</div><div class="li-body"><div class="li-title">Fame board</div><div class="li-sub">Top players in Abuja</div></div></div>' +
    '<div class="list-item" onclick="window.location=\'/rules.html\'"><div class="li-emoji">📜</div><div class="li-body"><div class="li-title">House rules</div><div class="li-sub">Be kind. No scams.</div></div></div>' + extra);
};


/* ===== v5 events + friends + DMs ===== */
window.openEvents = async function () {
  try {
    const data = await api('/api/events');
    const active = data.active;
    const board = (data.board || []).slice(0, 8).map((r) =>
      '<div class="list-item"><div class="li-emoji">' + (r.look_emoji || '👤') + '</div><div class="li-body"><div class="li-title">#' + r.rank + ' ' + r.name + '</div><div class="li-sub">Event sprays</div></div><div class="li-right">₦' + Math.floor(r.total).toLocaleString() + '</div></div>'
    ).join('') || '<p class="tiny">No sprays yet this event. Be first!</p>';
    const others = (data.events || []).map((e) =>
      '<div class="list-item"><div class="li-emoji">' + e.emoji + '</div><div class="li-body"><div class="li-title">' + e.name + (e.active ? ' · LIVE' : '') + '</div><div class="li-sub">' + e.desc + ' · ' + e.location + '</div></div></div>'
    ).join('');
    openModal('<div class="close-row"><h3>' + active.emoji + ' Events</h3><button class="close-x" onclick="closeModal()">✕</button></div>' +
      '<p><strong>' + active.name + '</strong> is live at <strong>' + active.location + '</strong>. Go there and spray to climb the board.</p>' +
      '<h3 style="margin:12px 0 8px;font-size:1rem">Today\'s board</h3>' + board +
      '<h3 style="margin:16px 0 8px;font-size:1rem">All events</h3>' + others);
  } catch (e) { toast(e.message); }
};

window.openFriends = async function () {
  if (STATE.guest) { toast('Login to use friends.'); return; }
  try {
    const data = await api('/api/friends');
    const pendingIn = (data.pending && data.pending.incoming || []).map((r) =>
      '<div class="list-item"><div class="li-emoji">' + (r.look_emoji || '👤') + '</div><div class="li-body"><div class="li-title">@' + r.username + '</div><div class="li-sub">' + (r.name || '') + ' · request</div></div>' +
      '<div class="li-right"><button class="btn primary small" onclick="respondFriend(\'' + r.id + '\',true)">Accept</button></div></div>'
    ).join('');
    const friends = (data.friends || []).map((r) =>
      '<div class="list-item" onclick="openDM(\'' + r.userId + '\',\'' + (r.username || '').replace(/'/g, '') + '\')"><div class="li-emoji">' + (r.look_emoji || '👤') + '</div><div class="li-body"><div class="li-title">' + (r.name || r.username) + '</div><div class="li-sub">@' + r.username + (r.location ? ' · ' + r.location : '') + '</div></div><div class="li-right">💬</div></div>'
    ).join('') || '<p class="tiny">No friends yet. Add someone by username.</p>';
    openModal('<div class="close-row"><h3>👥 Friends</h3><button class="close-x" onclick="closeModal()">✕</button></div>' +
      '<div style="display:flex;gap:8px;margin-bottom:12px"><input id="friend-user" placeholder="Username to add" maxlength="20" style="flex:1;padding:10px;border-radius:10px;border:1px solid var(--border);background:var(--card);color:var(--text);font-family:inherit" />' +
      '<button class="btn primary small" onclick="sendFriendReq()">Add</button></div>' +
      (pendingIn ? '<h3 style="font-size:0.95rem;margin-bottom:6px">Requests</h3>' + pendingIn : '') +
      '<h3 style="font-size:0.95rem;margin:12px 0 6px">Your people</h3>' + friends);
  } catch (e) { toast(e.message); }
};

window.sendFriendReq = async function () {
  const input = document.getElementById('friend-user');
  const username = (input && input.value || '').trim();
  if (!username) return;
  try {
    await api('/api/friends/request', { method: 'POST', body: JSON.stringify({ username: username }) });
    toast('Request sent to @' + username);
    openFriends();
  } catch (e) { toast(e.message); }
};

window.respondFriend = async function (id, accept) {
  try {
    await api('/api/friends/respond', { method: 'POST', body: JSON.stringify({ friendshipId: id, accept: accept }) });
    toast(accept ? 'Friends now!' : 'Declined');
    openFriends();
  } catch (e) { toast(e.message); }
};

window.openDM = async function (otherId, username) {
  try {
    const data = await api('/api/messages/' + otherId);
    const msgs = (data.messages || []).map((m) =>
      '<div class="chat-msg' + (m.fromMe ? '' : '') + '"><span class="who">' + (m.fromMe ? 'You' : '@' + username) + '</span>' + m.body + '</div>'
    ).join('') || '<p class="tiny">No messages yet. Say how body.</p>';
    openModal('<div class="close-row"><h3>💬 @' + username + '</h3><button class="close-x" onclick="closeModal()">✕</button></div>' +
      '<div class="chat-log" style="max-height:220px;margin-bottom:10px">' + msgs + '</div>' +
      '<input id="dm-input" placeholder="Message..." maxlength="500" style="width:100%;padding:12px;border-radius:10px;border:1px solid var(--border);background:var(--card);color:var(--text);font-family:inherit;margin-bottom:8px" />' +
      '<button class="btn primary full" onclick="sendDM(\'' + otherId + '\',\'' + username.replace(/'/g, '') + '\')">Send</button>');
  } catch (e) { toast(e.message); }
};

window.sendDM = async function (otherId, username) {
  const input = document.getElementById('dm-input');
  const body = (input && input.value || '').trim();
  if (!body) return;
  try {
    await api('/api/messages', { method: 'POST', body: JSON.stringify({ toUserId: otherId, body: body }) });
    openDM(otherId, username);
  } catch (e) { toast(e.message); }
};

// Override openMore with v5 menu
openMore = function () {
  const p = STATE.player;
  const u = STATE.user;
  let extra = '';
  if (!STATE.guest) {
    extra = '<div class="list-item" onclick="logout()"><div class="li-emoji">🚪</div><div class="li-body"><div class="li-title">Log out</div><div class="li-sub">Sign out of this device</div></div></div>';
  } else {
    extra = '<div class="list-item" onclick="location.reload()"><div class="li-emoji">🔑</div><div class="li-body"><div class="li-title">Create account</div><div class="li-sub">Save progress properly</div></div></div>';
  }
  openModal('<div class="close-row"><h3>⋯ More</h3><button class="close-x" onclick="closeModal()">✕</button></div>' +
    '<p><strong>' + p.look_emoji + ' ' + p.name + '</strong>' + (u ? ' · @' + u.username : ' · Guest') + ' · Fame ' + (p.fame || 0) + '</p>' +
    '<div class="list-item" onclick="openEvents()"><div class="li-emoji">🎉</div><div class="li-body"><div class="li-title">Events</div><div class="li-sub">Lounge nights & spray boards</div></div></div>' +
    '<div class="list-item" onclick="openFriends()"><div class="li-emoji">👥</div><div class="li-body"><div class="li-title">Friends & DMs</div><div class="li-sub">Add people, private chat</div></div></div>' +
    '<div class="list-item" onclick="openBoutique()"><div class="li-emoji">🛍️</div><div class="li-body"><div class="li-title">Boutique</div><div class="li-sub">Shades, chains, gele, phones</div></div></div>' +
    '<div class="list-item" onclick="openLeaderboard()"><div class="li-emoji">🏆</div><div class="li-body"><div class="li-title">Fame board</div><div class="li-sub">Top players in Abuja</div></div></div>' +
    '<div class="list-item" onclick="window.location=\'/rules.html\'"><div class="li-emoji">📜</div><div class="li-body"><div class="li-title">House rules</div><div class="li-sub">Be kind. No scams.</div></div></div>' + extra);
};

// DM socket listener
if (typeof connectSocket === 'function') {
  const _cs = connectSocket;
  connectSocket = function () {
    _cs();
    if (STATE.socket) {
      STATE.socket.on('dm', function (msg) {
        toast('New message');
      });
    }
  };
}
