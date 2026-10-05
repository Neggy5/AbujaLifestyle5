/** Server-authoritative prices, hustles, boutique items */

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

const HUSTLES = {
  suya:    { id: 'suya', name: 'Sell Suya', energy: 18, belly: -8, payMin: 800, payMax: 2200, cooldownSec: 45, desc: 'Roadside stick. Smoke and money.' },
  keke:    { id: 'keke', name: 'Keke Napep', energy: 22, belly: -12, payMin: 1200, payMax: 3500, cooldownSec: 60, desc: 'Utako to Gwarinpa runs.' },
  office:  { id: 'office', name: 'Contract Work', energy: 15, belly: -5, payMin: 2500, payMax: 6000, cooldownSec: 90, desc: 'Paperwork for a big man.' },
  market:  { id: 'market', name: 'Market Load', energy: 25, belly: -15, payMin: 600, payMax: 1800, cooldownSec: 40, desc: 'Carry bags at Wuse.' },
  content: { id: 'content', name: 'Phone Content', energy: 10, belly: -3, payMin: 400, payMax: 2500, cooldownSec: 50, desc: 'Skits. Algorithm decides.' },
};

const BOUTIQUE = {
  shades:   { id: 'shades', name: 'Designer Shades', emoji: '🕶️', price: 3500, slot: 'face', vibe: 5 },
  cap:      { id: 'cap', name: 'Fitted Cap', emoji: '🧢', price: 2000, slot: 'head', vibe: 3 },
  chain:    { id: 'chain', name: 'Gold Chain', emoji: '📿', price: 12000, slot: 'neck', vibe: 12, fame: 2 },
  phone:    { id: 'phone', name: 'Big Phone', emoji: '📱', price: 25000, slot: 'hand', vibe: 8, fame: 3 },
  gele:     { id: 'gele', name: 'Royal Gele', emoji: '👑', price: 8000, slot: 'head', vibe: 10, fame: 1 },
  agbada:   { id: 'agbada_drip', name: 'Party Agbada', emoji: '🥋', price: 15000, slot: 'body', vibe: 15, fame: 2 },
  sneakers: { id: 'sneakers', name: 'Fresh Sneakers', emoji: '👟', price: 9000, slot: 'feet', vibe: 7 },
  watch:    { id: 'watch', name: 'Wristwatch', emoji: '⌚', price: 18000, slot: 'wrist', vibe: 10, fame: 2 },
};

const FOOD = { min: 800, max: 1500, belly: 40, energy: 10 };
const BUS_COST = { min: 150, max: 350, energy: 5 };
const SPRAY_DEFAULT = 200;
const SPRAY_MIN = 100;
const SPRAY_MAX = 5000;
const HUSTLE_GLOBAL_COOLDOWN_MS = 15 * 1000; // min gap between any hustles

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function randomPay(h) {
  return h.payMin + Math.floor(Math.random() * (h.payMax - h.payMin + 1));
}

module.exports = {
  LOCATIONS,
  HUSTLES,
  BOUTIQUE,
  FOOD,
  BUS_COST,
  SPRAY_DEFAULT,
  SPRAY_MIN,
  SPRAY_MAX,
  HUSTLE_GLOBAL_COOLDOWN_MS,
  clamp,
  randomPay,
};
