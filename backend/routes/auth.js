const express = require('express');
const router = express.Router();
const { getDB } = require('../database');
const { generateToken, authMiddleware } = require('../auth');

router.post('/send-code', async (req, res) => {
  const { phone } = req.body;
  if (!phone) {
    return res.status(400).json({ error: 'Телефон обязателен' });
  }
  const mockCode = '123456';
  console.log(`Код для ${phone}: ${mockCode}`);
  res.json({ message: 'Код отправлен', code: mockCode });
});

router.post('/verify-code', async (req, res) => {
  const { phone, code, fullName, role } = req.body;
  if (code !== '123456') {
    return res.status(400).json({ error: 'Неверный код' });
  }

  const db = getDB();
  let user = await db.get('SELECT * FROM users WHERE phone = ?', phone);

  if (!user) {
    if (!fullName || !role) {
      return res.status(400).json({ error: 'Для регистрации нужны ФИО и роль' });
    }
    const result = await db.run(
      'INSERT INTO users (phone, full_name, role) VALUES (?, ?, ?)',
      [phone, fullName, role]
    );
    user = {
      id: result.lastID,
      phone,
      full_name: fullName,
      role
    };
  } else if (fullName && role && user.role !== role) {
    await db.run('UPDATE users SET full_name = ?, role = ? WHERE id = ?', [fullName, role, user.id]);
    user.role = role;
    user.full_name = fullName;
  }

  const token = generateToken(user.id, user.phone, user.role, user.full_name);
  res.json({
    token,
    user: {
      id: user.id,
      phone: user.phone,
      fullName: user.full_name,
      role: user.role
    }
  });
});

router.get('/me', authMiddleware, async (req, res) => {
  const db = getDB();
  const user = await db.get('SELECT id, phone, full_name, role FROM users WHERE id = ?', req.user.userId);
  res.json(user);
});

module.exports = router;