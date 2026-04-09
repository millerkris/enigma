const express = require('express');
const router = express.Router();
const { getDB } = require('../database');
const { authMiddleware } = require('../auth');

router.get('/open', authMiddleware, async (req, res) => {
  const db = getDB();
  const tasks = await db.all(`
    SELECT t.*, u.full_name as elder_name
    FROM tasks t
    JOIN users u ON t.elder_id = u.id
    WHERE t.status = 'open'
    ORDER BY t.created_at DESC
  `);
  res.json(tasks);
});

router.get('/my-requests', authMiddleware, async (req, res) => {
  if (req.user.role !== 'elder') {
    return res.status(403).json({ error: 'Только для пенсионеров' });
  }
  const db = getDB();
  const tasks = await db.all(`
    SELECT t.*, v.full_name as volunteer_name
    FROM tasks t
    LEFT JOIN users v ON t.volunteer_id = v.id
    WHERE t.elder_id = ?
    ORDER BY t.created_at DESC
  `, req.user.userId);
  res.json(tasks);
});

router.get('/my-tasks', authMiddleware, async (req, res) => {
  if (req.user.role !== 'volunteer') {
    return res.status(403).json({ error: 'Только для волонтёров' });
  }
  const db = getDB();
  const tasks = await db.all(`
    SELECT t.*, u.full_name as elder_name
    FROM tasks t
    JOIN users u ON t.elder_id = u.id
    WHERE t.volunteer_id = ? AND t.status IN ('taken', 'completed')
    ORDER BY t.created_at DESC
  `, req.user.userId);
  res.json(tasks);
});

router.post('/', authMiddleware, async (req, res) => {
  if (req.user.role !== 'elder') {
    return res.status(403).json({ error: 'Только пенсионеры могут создавать заявки' });
  }
  const { title, description, datetime } = req.body;
  if (!title) {
    return res.status(400).json({ error: 'Название задачи обязательно' });
  }
  const db = getDB();
  const result = await db.run(
    'INSERT INTO tasks (elder_id, title, description, datetime, status) VALUES (?, ?, ?, ?, ?)',
    [req.user.userId, title, description || '', datetime || '', 'open']
  );
  const newTask = await db.get('SELECT * FROM tasks WHERE id = ?', result.lastID);
  res.status(201).json(newTask);
});

router.post('/:taskId/respond', authMiddleware, async (req, res) => {
  if (req.user.role !== 'volunteer') {
    return res.status(403).json({ error: 'Только волонтёры могут откликаться' });
  }
  const { taskId } = req.params;
  const db = getDB();
  const task = await db.get('SELECT * FROM tasks WHERE id = ? AND status = "open"', taskId);
  if (!task) {
    return res.status(404).json({ error: 'Задача не найдена или уже закрыта' });
  }
  await db.run('UPDATE tasks SET status = "taken", volunteer_id = ? WHERE id = ?', [req.user.userId, taskId]);
  res.json({ message: 'Вы откликнулись на заявку' });
});

router.put('/:taskId/complete', authMiddleware, async (req, res) => {
  if (req.user.role !== 'elder') {
    return res.status(403).json({ error: 'Только пенсионер может отмечать выполнение' });
  }
  const { taskId } = req.params;
  const db = getDB();
  const task = await db.get('SELECT * FROM tasks WHERE id = ? AND elder_id = ?', taskId, req.user.userId);
  if (!task) {
    return res.status(404).json({ error: 'Задача не найдена' });
  }
  if (task.status !== 'taken') {
    return res.status(400).json({ error: 'Можно завершить только принятую задачу' });
  }
  await db.run('UPDATE tasks SET status = "completed" WHERE id = ?', taskId);
  res.json({ message: 'Задача отмечена как выполненная' });
});

router.put('/:taskId/cancel', authMiddleware, async (req, res) => {
  if (req.user.role !== 'volunteer') {
    return res.status(403).json({ error: 'Только волонтёр может отменить' });
  }
  const { taskId } = req.params;
  const db = getDB();
  const task = await db.get('SELECT * FROM tasks WHERE id = ? AND volunteer_id = ?', taskId, req.user.userId);
  if (!task) {
    return res.status(404).json({ error: 'Задача не найдена или вы не откликались на неё' });
  }
  if (task.status !== 'taken') {
    return res.status(400).json({ error: 'Можно отменить только принятую задачу' });
  }
  await db.run('UPDATE tasks SET status = "open", volunteer_id = NULL WHERE id = ?', taskId);
  res.json({ message: 'Задание отменено, заявка снова доступна другим волонтёрам' });
});

// Удалить заявку (в любом статусе, но только свою)
router.delete('/:taskId', authMiddleware, async (req, res) => {
  if (req.user.role !== 'elder') {
    return res.status(403).json({ error: 'Только пенсионеры могут удалять свои заявки' });
  }
  
  const { taskId } = req.params;
  const db = getDB();
  
  // Проверяем, что заявка принадлежит пенсионеру (статус любой)
  const task = await db.get(
    'SELECT * FROM tasks WHERE id = ? AND elder_id = ?',
    taskId, req.user.userId
  );
  
  if (!task) {
    return res.status(404).json({ error: 'Заявка не найдена' });
  }
  
  // Удаляем связанные сообщения
  await db.run('DELETE FROM messages WHERE task_id = ?', taskId);
  // Удаляем саму заявку
  await db.run('DELETE FROM tasks WHERE id = ?', taskId);
  
  res.json({ message: 'Заявка удалена' });
});

module.exports = router;