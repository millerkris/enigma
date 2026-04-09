const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');
const fs = require('fs');

let db;

async function initDB() {
  const dbDir = path.join(__dirname, '..', 'database');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
    console.log('📁 Папка database создана:', dbDir);
  }

  const dbPath = path.join(dbDir, 'enigma.sqlite');
  console.log('📂 Путь к базе данных:', dbPath);

  db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone TEXT UNIQUE NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT CHECK(role IN ('volunteer', 'elder')) NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      elder_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      datetime TEXT,
      status TEXT DEFAULT 'open' CHECK(status IN ('open', 'taken', 'completed', 'cancelled')),
      volunteer_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (elder_id) REFERENCES users(id),
      FOREIGN KEY (volunteer_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL,
      from_user_id INTEGER NOT NULL,
      to_user_id INTEGER NOT NULL,
      message TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (task_id) REFERENCES tasks(id),
      FOREIGN KEY (from_user_id) REFERENCES users(id),
      FOREIGN KEY (to_user_id) REFERENCES users(id)
    );
  `);

  const testUser = await db.get('SELECT id FROM users WHERE phone = "+79991234567"');
  if (!testUser) {
    console.log('📝 Добавляем тестовые данные...');
    await db.run(`
      INSERT INTO users (phone, full_name, role) VALUES 
      ('+79991234567', 'Дмитрий Волонтёров', 'volunteer'),
      ('+79991112233', 'Олег Иванович', 'elder'),
      ('+79994445566', 'Анна Николаевна', 'elder')
    `);
    await db.run(`
      INSERT INTO tasks (elder_id, title, description, datetime, status) VALUES 
      (2, 'Сходить в поликлинику', 'У меня запись 11 декабря 9:15, нужно сходить со мной', '2026-04-10T09:15', 'open'),
      (3, 'Купить продукты', 'Молоко, хлеб, яблоки', '2026-04-05T18:00', 'open'),
      (2, 'Вынести мусор', 'Пакет у двери', '2026-04-01T19:30', 'taken')
    `);
    console.log('✅ Тестовые данные добавлены');
  }

  console.log('✅ База данных готова');
  return db;
}

function getDB() {
  return db;
}

module.exports = { initDB, getDB };