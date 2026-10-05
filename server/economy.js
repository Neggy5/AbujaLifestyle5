const catalog = require('./catalog');
const db = require('./db');

const {
  HUSTLES, BOUTIQUE, FOOD, BUS_COST,
  SPRAY_MIN, SPRAY_MAX, HUSTLE_GLOBAL_COOLDOWN_MS,
  clamp, randomPay, LOCATIONS,
} = catalog;

function locationOk(id) {
  return LOCATIONS.some((l) => l.id === id);
}

async function doHustle(userId, hustleId) {
  const h = HUSTLES[hustleId];
  if (!h) throw new Error('Unknown hustle');

  return db.withPlayerLock(userId, async (player) => {
    if (player.energy < h.energy) throw new Error('You tire. Rest or chop first.');
    const last = player.last_hustle_at ? new Date(player.last_hustle_at).getTime() : 0;
    if (Date.now() - last < HUSTLE_GLOBAL_COOLDOWN_MS) {
      throw new Error('Rest small before next hustle.');
    }
    const pay = randomPay(h);
    player.money += pay;
    player.energy = clamp(player.energy - h.energy, 0, 100);
    player.belly = clamp(player.belly + h.belly, 0, 100);
    player.vibe = clamp(player.vibe + 3, 0, 100);
    player.last_hustle_at = new Date().toISOString();
    return { player, pay, hustle: h.name };
  });
}

async function doTravel(userId, locationId) {
  if (!locationOk(locationId)) throw new Error('Unknown location');
  const cost = BUS_COST.min + Math.floor(Math.random() * (BUS_COST.max - BUS_COST.min + 1));
  return db.withPlayerLock(userId, async (player) => {
    if (player.location === locationId) throw new Error('You are already here.');
    if (player.money < cost) throw new Error('No money for transport.');
    player.money -= cost;
    player.energy = clamp(player.energy - BUS_COST.energy, 0, 100);
    player.location = locationId;
    return { player, cost };
  });
}

async function doFood(userId) {
  const cost = FOOD.min + Math.floor(Math.random() * (FOOD.max - FOOD.min + 1));
  return db.withPlayerLock(userId, async (player) => {
    if (player.money < cost) throw new Error('No money for food.');
    player.money -= cost;
    player.belly = clamp(player.belly + FOOD.belly, 0, 100);
    player.energy = clamp(player.energy + FOOD.energy, 0, 100);
    return { player, cost };
  });
}

async function doRest(userId) {
  return db.withPlayerLock(userId, async (player) => {
    player.energy = clamp(player.energy + 25, 0, 100);
    player.vibe = clamp(player.vibe + 5, 0, 100);
    return { player };
  });
}

async function doSpray(userId, amount) {
  amount = Math.min(SPRAY_MAX, Math.max(SPRAY_MIN, Number(amount) || 200));
  return db.withPlayerLock(userId, async (player) => {
    if (player.money < amount) throw new Error('Your pocket dry.');
    player.money -= amount;
    player.vibe = clamp(player.vibe + 8, 0, 100);
    player.fame = (player.fame || 0) + (amount >= 1000 ? 3 : 1);
    return { player, amount };
  });
}

async function buyItem(userId, itemId) {
  const item = BOUTIQUE[itemId];
  if (!item) throw new Error('Item not found');
  return db.withPlayerLock(userId, async (player) => {
    const inv = player.inventory || [];
    if (inv.includes(itemId)) throw new Error('You already own this.');
    if (player.money < item.price) throw new Error('Not enough money.');
    player.money -= item.price;
    inv.push(itemId);
    player.inventory = inv;
    player.vibe = clamp(player.vibe + (item.vibe || 0), 0, 100);
    if (item.fame) player.fame = (player.fame || 0) + item.fame;
    return { player, item };
  });
}

async function equipItem(userId, itemId) {
  const item = BOUTIQUE[itemId];
  if (!item) throw new Error('Item not found');
  return db.withPlayerLock(userId, async (player) => {
    const inv = player.inventory || [];
    if (!inv.includes(itemId)) throw new Error('You do not own this.');
    const equipped = { ...(player.equipped || {}) };
    equipped[item.slot] = itemId;
    player.equipped = equipped;
    // Show richest emoji from equipped for presence
    const priority = ['chain', 'phone', 'watch', 'gele', 'agbada_drip', 'shades', 'sneakers', 'cap'];
    for (const id of priority) {
      if (Object.values(equipped).includes(id) && BOUTIQUE[id]) {
        player.look_emoji = BOUTIQUE[id].emoji;
        break;
      }
    }
    return { player, item };
  });
}

module.exports = {
  doHustle,
  doTravel,
  doFood,
  doRest,
  doSpray,
  buyItem,
  equipItem,
  catalog,
};
