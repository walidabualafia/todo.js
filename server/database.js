import bcrypt from 'bcrypt';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create or open the database
const db = new Database(join(__dirname, 'bloom.db'));

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    creator_id INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (creator_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS todos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    deadline TEXT,
    creator_id INTEGER NOT NULL,
    project_id INTEGER,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (creator_id) REFERENCES users(id),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
  );
`);

async function hashPassword(password) {
  return await bcrypt.hash(password, 10);
}

async function verifyPassword(password, hash) {
  return await bcrypt.compare(password, hash);
}

// Initialize demo data if database is empty
async function initializeData() {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;

  if (userCount === 0) {
    console.log('Initializing database with demo data...');

    const adminHash = await hashPassword('password123');
    const demoHash = await hashPassword('password123');

    // Insert demo users
    db.prepare(`
      INSERT INTO users (username, password, created_at)
      VALUES (?, ?, ?)
    `).run('admin', adminHash, new Date().toISOString());

    db.prepare(`
      INSERT INTO users (username, password, created_at)
      VALUES (?, ?, ?)
    `).run('demo', demoHash, new Date().toISOString());

    // Insert demo projects
    db.prepare(`
      INSERT INTO projects (name, description, creator_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `).run('Personal', 'Personal tasks and projects', 1, new Date().toISOString(), new Date().toISOString());

    db.prepare(`
      INSERT INTO projects (name, description, creator_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `).run('Work', 'Work-related tasks', 1, new Date().toISOString(), new Date().toISOString());

    console.log('Demo users created: admin/password123 and demo/password123');
    console.log('Demo projects created: Personal and Work');
  }
}

initializeData();

export const dbApi = {
  createUser: (username, password) => {
    const result = db.prepare(`
      INSERT INTO users (username, password, created_at)
      VALUES (?, ?, ?)
    `).run(username, password, new Date().toISOString());

    return { lastInsertRowid: result.lastInsertRowid };
  },

  getUserByUsername: (username) => {
    return db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  },

  getAllUsers: () => {
    return db.prepare('SELECT id, username, created_at FROM users').all();
  },

  createTodo: (title, description, status, deadline, creatorId, projectId) => {
    const result = db.prepare(`
      INSERT INTO todos (title, description, status, deadline, creator_id, project_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      title,
      description,
      status,
      deadline,
      creatorId,
      projectId,
      new Date().toISOString(),
      new Date().toISOString()
    );

    return { lastInsertRowid: result.lastInsertRowid };
  },

  updateTodo: (title, description, status, deadline, projectId, id) => {
    db.prepare(`
      UPDATE todos
      SET title = ?, description = ?, status = ?, deadline = ?, project_id = ?, updated_at = ?
      WHERE id = ?
    `).run(title, description, status, deadline, projectId, new Date().toISOString(), id);
  },

  deleteTodo: (id) => {
    db.prepare('DELETE FROM todos WHERE id = ?').run(id);
  },

  getTodos: () => {
    const todos = db.prepare(`
      SELECT
        t.*,
        u.username as creator_name,
        p.name as project_name
      FROM todos t
      LEFT JOIN users u ON t.creator_id = u.id
      LEFT JOIN projects p ON t.project_id = p.id
      ORDER BY t.created_at DESC
    `).all();

    return todos;
  },

  getTodoById: (id) => {
    return db.prepare(`
      SELECT
        t.*,
        u.username as creator_name,
        p.name as project_name
      FROM todos t
      LEFT JOIN users u ON t.creator_id = u.id
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE t.id = ?
    `).get(id);
  },

  getTodosByProject: (projectId) => {
    return db.prepare(`
      SELECT
        t.*,
        u.username as creator_name,
        p.name as project_name
      FROM todos t
      LEFT JOIN users u ON t.creator_id = u.id
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE t.project_id = ?
      ORDER BY t.created_at DESC
    `).all(projectId);
  },

  createProject: (name, description, creatorId) => {
    const result = db.prepare(`
      INSERT INTO projects (name, description, creator_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      name,
      description,
      creatorId,
      new Date().toISOString(),
      new Date().toISOString()
    );

    return { lastInsertRowid: result.lastInsertRowid };
  },

  updateProject: (name, description, id) => {
    db.prepare(`
      UPDATE projects
      SET name = ?, description = ?, updated_at = ?
      WHERE id = ?
    `).run(name, description, new Date().toISOString(), id);
  },

  deleteProject: (id) => {
    // Foreign key constraint will automatically set project_id to NULL in todos
    db.prepare('DELETE FROM projects WHERE id = ?').run(id);
  },

  getProjects: () => {
    const projects = db.prepare(`
      SELECT
        p.*,
        u.username as creator_name,
        (SELECT COUNT(*) FROM todos WHERE project_id = p.id) as todo_count
      FROM projects p
      LEFT JOIN users u ON p.creator_id = u.id
      ORDER BY p.created_at ASC
    `).all();

    return projects;
  },

  getProjectById: (id) => {
    const project = db.prepare(`
      SELECT
        p.*,
        u.username as creator_name,
        (SELECT COUNT(*) FROM todos WHERE project_id = p.id) as todo_count
      FROM projects p
      LEFT JOIN users u ON p.creator_id = u.id
      WHERE p.id = ?
    `).get(id);

    return project;
  }
};

export { hashPassword, verifyPassword };
export { dbApi as db };
