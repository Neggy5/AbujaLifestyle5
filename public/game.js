/* Abuja Lifestyle – no login. Local progress + realtime rooms as guest. */

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

const BOUTIQUE = [
  { id: 'shades', name: 'Designer Shades', emoji: '🕶️', price: 3500 },
  { id: 'cap', name: 'Fitted Cap', emoji: '🧢', price: 2000 },
  { id: 'chain', name: 'Gold Chain', emoji: '📿', price: 12000 },
  { id: 'phone', name: 'Big Phone', emoji: '📱', price: 25000 },
  { id: 'gele', name: 'Royal Gele', emoji: '👑', price: 8000 },
  { id: 'sneakers', name: 'Fresh Sneakers', emoji: '👟', price: 9000 },
  { id: 'watch', name: 'Wristwatch', emoji: '⌚', price: 18000 },
];

const STORAGE_KEY = 'abuja_noauth_v1';

const STATE = {
  player: null,
  location: 'wuse',
  socket: null,
  roomPeople: [],
  lastHustleAt: 0,
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

function save() {
  if (!STATE.player) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      player: STATE.player,
      location: STATE.location,
      lastHustleAt: STATE.lastHustleAt,
    }));
  } catch (e) {}
}
function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) { return null; }
}

async function refreshOnline() {
  try {
    const r = await fetch('/api/stats');
    const d = await r.json();
    $('#online-count').textContent = d.online != null ? d.online : '—';
  } catch (e) {
    $('#online-count').textContent = '—';
  }
}
refreshOnline();
setInterval(refreshOnline, 20000);

// Intro
const saved = load();
if (saved && saved.player && saved.player.name) {
  $('#btn-continue').style.display = 'block';
  $('#saved-name').textContent = saved.player.name;
  $('#btn-continue').onclick = () => {
    STATE.player = saved.player;
    STATE.location = saved.location || 'wuse';
    STATE.lastHustleAt = saved.lastHustleAt || 0;
    enterGame();
  };
}

$('#btn-play').onclick = () => showScreen('screen-create');

// Character
let chosenGender = null;
let chosenLook = null;

document.querySelectorAll('.gender-btn').forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll('.gender-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    chosenGender = btn.dataset.gender;
    chosenLook = null;
    renderLooks();
    const first = LOOKS[chosenGender] && LOOKS[chosenGender][0];
    if (first) {
      chosenLook = first.id;
      renderLooks();
    }
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
  const ready = !!(chosenGender && chosenLook && name.length >= 2);
  const btn = $('#btn-enter');
  btn.disabled = !ready;
  if (!chosenGender) btn.textContent = 'Pick Man or Woman first';
  else if (!chosenLook) btn.textContent = 'Pick a look above';
  else if (name.length < 2) btn.textContent = 'Enter a display name';
  else btn.textContent = 'Enter Abuja';
}

$('#btn-enter').onclick = () => {
  const name = $('#player-name').value.trim();
  const look = LOOKS[chosenGender].find(l => l.id === chosenLook);
  const starts = [2500, 8000, 1500, 20000, 500];
  const money = starts[Math.floor(Math.random() * starts.length)];
  STATE.player = {
    name: name,
    gender: chosenGender,
    look_id: look.id,
    look_emoji: look.emoji,
    money: money,
    belly: 70 + Math.floor(Math.random() * 20),
    energy: 75 + Math.floor(Math.random() * 20),
    vibe: 50 + Math.floor(Math.random() * 30),
    fame: 0,
    inventory: [],
    location: 'wuse',
  };
  STATE.location = 'wuse';
  save();
  toast('You start with ₦' + money.toLocaleString());
  enterGame();
};

function enterGame() {
  showScreen('screen-game');
  updateStats();
  connectSocket();
  setLocation(STATE.player.location || STATE.location || 'wuse');
  setInterval(() => {
    if (!STATE.player) return;
    STATE.player.belly = Math.max(0, STATE.player.belly - 0.35);
    STATE.player.energy = Math.max(0, STATE.player.energy - 0.2);
    if (STATE.player.belly < 20 || STATE.player.energy < 15) {
      STATE.player.vibe = Math.max(0, STATE.player.vibe - 0.4);
    }
    updateStats();
    save();
  }, 8000);
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
    STATE.socket.emit('join', {
      location: id,
      name: STATE.player.name,
      look_emoji: STATE.player.look_emoji,
    });
  }
  save();
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
    const el = document.createElement('div');
    el.className = 'person';
    el.innerHTML = '<div class="p-emoji">' + (p.look_emoji || '👤') + '</div><div class="p-name">' + p.name + '</div><div class="p-tag">Online</div>';
    el.onclick = () => openPerson({ name: p.name, emoji: p.look_emoji, isNpc: false });
    list.appendChild(el);
  });
  $('#loc-people').textContent = (STATE.roomPeople.length + npcs.length) + ' here';
}

function openPerson(p) {
  const safe = (p.name || '').replace(/'/g, "\\'");
  openModal(
    '<div class="close-row"><h3>' + (p.emoji || '👤') + ' ' + p.name + '</h3><button class="close-x" onclick="closeModal()">✕</button></div>' +
    '<p>' + (p.isNpc ? 'NPC – part of the city.' : 'Player in this spot.') + '</p>' +
    '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
    '<button class="btn primary small" onclick="doSpray(\'' + safe + '\')">💸 Spray</button>' +
    '<button class="btn ghost small" onclick="closeModal();toast(\'' + safe + ' nodded back.\')">👋 Wave</button></div>'
  );
}

window.doSpray = function (targetName) {
  const amount = 200;
  if (STATE.player.money < amount) { toast('Your pocket dry. Go hustle.'); return; }
  STATE.player.money -= amount;
  STATE.player.vibe = Math.min(100, STATE.player.vibe + 8);
  STATE.player.fame = (STATE.player.fame || 0) + 1;
  updateStats();
  save();
  closeModal();
  addChat('you', 'You sprayed ₦' + amount + ' on ' + targetName + ' 💸');
  toast('You sprayed ₦' + amount + '!');
  if (STATE.socket && STATE.socket.connected) {
    STATE.socket.emit('spray_broadcast', { amount: amount });
  }
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
  if (typeof io === 'undefined') return;
  STATE.socket = io({ transports: ['websocket', 'polling'] });
  STATE.socket.on('connect', () => {
    STATE.socket.emit('join', {
      location: STATE.location,
      name: STATE.player && STATE.player.name,
      look_emoji: STATE.player && STATE.player.look_emoji,
    });
  });
  STATE.socket.on('hello', d => { if (d.online != null) $('#online-count').textContent = d.online; });
  STATE.socket.on('online', d => { if (d.online != null) $('#online-count').textContent = d.online; });
  STATE.socket.on('joined', d => {
    STATE.roomPeople = d.people || [];
    renderPeople();
    if (d.online != null) $('#online-count').textContent = d.online;
  });
  STATE.socket.on('presence', d => {
    if (d.location === STATE.location) {
      STATE.roomPeople = d.people || [];
      renderPeople();
    }
    if (d.online != null) $('#online-count').textContent = d.online;
  });
  STATE.socket.on('chat', msg => {
    if (msg.name === (STATE.player && STATE.player.name)) return;
    addChat(msg.name, msg.text);
  });
  STATE.socket.on('spray', msg => { addChat('system', msg.from + ' sprayed ₦' + msg.amount + ' 💸'); });
  STATE.socket.on('react', msg => { addChat(msg.name, msg.emoji); });
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
window.goTo = function (id) {
  const cost = 150 + Math.floor(Math.random() * 200);
  if (STATE.player.money < cost) { toast('No money for transport.'); return; }
  STATE.player.money -= cost;
  STATE.player.energy = Math.max(0, STATE.player.energy - 5);
  updateStats();
  closeModal();
  setLocation(id);
  toast('Bus ₦' + cost + '. You don reach.');
  save();
};

function openHustle() {
  const items = HUSTLES.map(h =>
    '<div class="list-item" onclick="doHustle(\'' + h.id + '\')"><div class="li-emoji">💼</div><div class="li-body"><div class="li-title">' + h.name + '</div><div class="li-sub">' + h.desc + '</div></div><div class="li-right">₦' + h.pay[0] + '–' + h.pay[1] + '</div></div>'
  ).join('');
  openModal('<div class="close-row"><h3>💼 Hustle</h3><button class="close-x" onclick="closeModal()">✕</button></div><p>Make money. Energy go down.</p>' + items);
}
window.doHustle = function (id) {
  const h = HUSTLES.find(x => x.id === id);
  const p = STATE.player;
  if (p.energy < h.energy) { toast('You tire. Rest or chop first.'); return; }
  if (Date.now() - STATE.lastHustleAt < 15000) { toast('Rest small before next hustle.'); return; }
  const pay = h.pay[0] + Math.floor(Math.random() * (h.pay[1] - h.pay[0]));
  p.money += pay;
  p.energy = Math.max(0, p.energy - h.energy);
  p.belly = Math.max(0, p.belly + h.belly);
  p.vibe = Math.min(100, p.vibe + 3);
  STATE.lastHustleAt = Date.now();
  updateStats();
  closeModal();
  addChat('you', 'Finished ' + h.name + '. +₦' + pay.toLocaleString());
  toast('+₦' + pay.toLocaleString() + ' 💰');
  save();
};

function openTalk() {
  openModal(
    '<div class="close-row"><h3>💬 Talk</h3><button class="close-x" onclick="closeModal()">✕</button></div><p>Chat with people at this spot.</p>' +
    '<input type="text" id="talk-input" placeholder="Type your gist..." maxlength="120" style="width:100%;padding:12px;border-radius:10px;border:1px solid var(--border);background:var(--card);color:var(--text);font-size:1rem;margin-bottom:12px;font-family:inherit" />' +
    '<button class="btn primary full" onclick="sendTalk()">Send</button>'
  );
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
  openModal(
    '<div class="close-row"><h3>💸 Flex</h3><button class="close-x" onclick="closeModal()">✕</button></div>' +
    '<div class="list-item" onclick="doSprayRandom()"><div class="li-emoji">💸</div><div class="li-body"><div class="li-title">Spray the room</div><div class="li-sub">₦200 into the crowd</div></div></div>' +
    '<div class="list-item" onclick="buyFood()"><div class="li-emoji">🍛</div><div class="li-body"><div class="li-title">Chop something</div><div class="li-sub">Fill belly</div></div><div class="li-right">₦800–1,500</div></div>' +
    '<div class="list-item" onclick="rest()"><div class="li-emoji">😴</div><div class="li-body"><div class="li-title">Rest small</div><div class="li-sub">Recover energy</div></div></div>' +
    '<div class="list-item" onclick="openBoutique()"><div class="li-emoji">🛍️</div><div class="li-body"><div class="li-title">Boutique</div><div class="li-sub">Buy drip</div></div></div>'
  );
}
window.doSprayRandom = function () {
  closeModal();
  if (STATE.player.money < 200) { toast('Pocket dry.'); return; }
  STATE.player.money -= 200;
  STATE.player.vibe = Math.min(100, STATE.player.vibe + 10);
  STATE.player.fame = (STATE.player.fame || 0) + 2;
  updateStats();
  addChat('you', 'You sprayed ₦200 into the crowd 💸🔥');
  toast('E choke!');
  if (STATE.socket) STATE.socket.emit('spray_broadcast', { amount: 200 });
  save();
};
window.buyFood = function () {
  const cost = 800 + Math.floor(Math.random() * 700);
  if (STATE.player.money < cost) { toast('No money for food.'); return; }
  STATE.player.money -= cost;
  STATE.player.belly = Math.min(100, STATE.player.belly + 40);
  STATE.player.energy = Math.min(100, STATE.player.energy + 10);
  updateStats();
  closeModal();
  toast('Chop done. ₦' + cost);
  save();
};
window.rest = function () {
  STATE.player.energy = Math.min(100, STATE.player.energy + 25);
  STATE.player.vibe = Math.min(100, STATE.player.vibe + 5);
  updateStats();
  closeModal();
  toast('You rest. Energy up.');
  save();
};

window.openBoutique = function () {
  const inv = STATE.player.inventory || [];
  const html = BOUTIQUE.map(it => {
    const owned = inv.includes(it.id);
    const action = owned
      ? '<button class="btn ghost small" onclick="doEquip(\'' + it.id + '\')">Equip</button>'
      : '<button class="btn primary small" onclick="doBuy(\'' + it.id + '\')">Buy ₦' + it.price.toLocaleString() + '</button>';
    return '<div class="list-item"><div class="li-emoji">' + it.emoji + '</div><div class="li-body"><div class="li-title">' + it.name + '</div><div class="li-sub">' + (owned ? 'Owned' : 'For sale') + '</div></div><div class="li-right">' + action + '</div></div>';
  }).join('');
  openModal('<div class="close-row"><h3>🛍️ Boutique</h3><button class="close-x" onclick="closeModal()">✕</button></div><p>Buy drip. Progress saves on this device.</p>' + html);
};
window.doBuy = function (itemId) {
  const item = BOUTIQUE.find(x => x.id === itemId);
  if (!item) return;
  const inv = STATE.player.inventory || [];
  if (inv.includes(itemId)) { toast('You already own this.'); return; }
  if (STATE.player.money < item.price) { toast('Not enough money.'); return; }
  STATE.player.money -= item.price;
  inv.push(itemId);
  STATE.player.inventory = inv;
  STATE.player.vibe = Math.min(100, STATE.player.vibe + 5);
  updateStats();
  save();
  toast('Bought ' + item.name + '!');
  openBoutique();
};
window.doEquip = function (itemId) {
  const item = BOUTIQUE.find(x => x.id === itemId);
  if (!item) return;
  STATE.player.look_emoji = item.emoji;
  updateStats();
  save();
  toast('Equipped ' + item.name);
  if (STATE.socket) {
    STATE.socket.emit('join', { location: STATE.location, name: STATE.player.name, look_emoji: STATE.player.look_emoji });
  }
  openBoutique();
};

function openMore() {
  const p = STATE.player;
  openModal(
    '<div class="close-row"><h3>⋯ More</h3><button class="close-x" onclick="closeModal()">✕</button></div>' +
    '<p><strong>' + p.look_emoji + ' ' + p.name + '</strong> · Fame ' + (p.fame || 0) + '</p>' +
    '<div class="list-item" onclick="openBoutique()"><div class="li-emoji">🛍️</div><div class="li-body"><div class="li-title">Boutique</div><div class="li-sub">Buy & equip drip</div></div></div>' +
    '<div class="list-item" onclick="window.location=\'/rules.html\'"><div class="li-emoji">📜</div><div class="li-body"><div class="li-title">House rules</div><div class="li-sub">Be kind. No scams.</div></div></div>' +
    '<div class="list-item" onclick="resetPlayer()"><div class="li-emoji">🔄</div><div class="li-body"><div class="li-title">New person</div><div class="li-sub">Start over on this device</div></div></div>'
  );
}
window.resetPlayer = function () {
  if (!confirm('Start a new person? Current progress on this device will be cleared.')) return;
  localStorage.removeItem(STORAGE_KEY);
  location.reload();
};
$('#btn-phone').onclick = openMore;
