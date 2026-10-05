/**
 * Redis-backed room presence so counts are correct across replicas.
 * Keys: presence:loc:{location}  →  HASH socketId -> JSON member
 *       presence:online           →  SET of socketIds (approx online)
 */
const PREFIX = 'abuja:presence:';

function locKey(location) {
  return PREFIX + 'loc:' + location;
}
function onlineKey() {
  return PREFIX + 'online';
}

async function setMember(redis, socketId, member) {
  if (!redis) return;
  const payload = JSON.stringify(member);
  const multi = redis.multi();
  multi.hSet(locKey(member.location), socketId, payload);
  multi.sAdd(onlineKey(), socketId);
  multi.expire(locKey(member.location), 3600);
  multi.expire(onlineKey(), 3600);
  await multi.exec();
}

async function removeMember(redis, socketId, location) {
  if (!redis) return;
  const multi = redis.multi();
  if (location) multi.hDel(locKey(location), socketId);
  multi.sRem(onlineKey(), socketId);
  await multi.exec();
}

async function moveMember(redis, socketId, fromLoc, member) {
  if (!redis) return;
  const multi = redis.multi();
  if (fromLoc) multi.hDel(locKey(fromLoc), socketId);
  multi.hSet(locKey(member.location), socketId, JSON.stringify(member));
  multi.sAdd(onlineKey(), socketId);
  multi.expire(locKey(member.location), 3600);
  await multi.exec();
}

async function listLocation(redis, location) {
  if (!redis) return [];
  const all = await redis.hGetAll(locKey(location));
  const people = [];
  for (const raw of Object.values(all)) {
    try {
      const p = JSON.parse(raw);
      people.push({
        userId: p.userId,
        username: p.username,
        name: p.name,
        look_emoji: p.look_emoji,
        guest: !!p.guest,
      });
    } catch (_) {}
  }
  return people;
}

async function onlineCount(redis) {
  if (!redis) return 0;
  return redis.sCard(onlineKey());
}

module.exports = {
  setMember,
  removeMember,
  moveMember,
  listLocation,
  onlineCount,
};
