const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'abuja-lifestyle-dev-secret-CHANGE-ME';
const JWT_EXPIRES = process.env.JWT_EXPIRES || '30d';

if (!process.env.JWT_SECRET) {
  console.warn('[auth] JWT_SECRET not set – using insecure default (dev only)');
}

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Login required' });
  const decoded = verifyToken(token);
  if (!decoded?.userId) return res.status(401).json({ error: 'Invalid or expired token' });
  req.userId = decoded.userId;
  req.username = decoded.username;
  next();
}

module.exports = { signToken, verifyToken, authMiddleware, JWT_SECRET };
