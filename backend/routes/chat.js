const express = require('express');
const router = express.Router();
const { getDB } = require('../database');
const { authMiddleware } = require('../auth');

router.get('/task/:taskId', authMiddleware, async (req, res) => {
  const { taskId } = req.params;
  const db = getDB();
  const task = await db.get('SELECT elder_id, volunteer_id FROM tasks WHERE id = ?', taskId);
  if (!task) {
    return res.status(404).json({ error: 'Задача не найдена' });
  }
  if (task.elder_id !== req.user.userId && task.volunteer_id !== req.user.userId) {
    return res.status(403).json({ error: 'Нет доступа к этому чату' });
  }
  const messages = await db.all(`
    SELECT m.*, u.full_name as from_name
    FROM messages m
    JOIN users u ON m.from_user_id = u.id
    WHERE m.task_id = ?
    ORDER BY m.created_at ASC
  `, taskId);
  res.json(messages);
});

router.post('/task/:taskId', authMiddleware, async (req, res) => {
  const { taskId } = req.params;
  const { message } = req.body;
  if (!message || message.trim() === '') {
    return res.status(400).json({ error: 'Сообщение не может быть пустым' });
  }
  const db = getDB();
  const task = await db.get('SELECT elder_id, volunteer_id FROM tasks WHERE id = ?', taskId);
  if (!task) {
    return res.status(404).json({ error: 'Задача не найдена' });
  }
  if (task.elder_id !== req.user.userId && task.volunteer_id !== req.user.userId) {
    return res.status(403).json({ error: 'Нет доступа к этому чату' });
  }
  const toUserId = req.user.userId === task.elder_id ? task.volunteer_id : task.elder_id;
  if (!toUserId) {
    return res.status(400).json({ error: 'У задачи ещё нет волонтёра' });
  }
  await db.run(
    'INSERT INTO messages (task_id, from_user_id, to_user_id, message) VALUES (?, ?, ?, ?)',
    [taskId, req.user.userId, toUserId, message.trim()]
  );
  res.status(201).json({ message: 'Сообщение отправлено' });
});

module.exports = router;