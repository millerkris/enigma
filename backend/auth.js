const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'enigma_super_secret_key_2026';

function generateToken(userId, phone, role, fullName) {
  return jwt.sign(
    { userId, phone, role, fullName },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Нет токена авторизации' });
  }
  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Недействительный токен' });
  }
  req.user = decoded;
  next();
}

module.exports = { generateToken, verifyToken, authMiddleware };