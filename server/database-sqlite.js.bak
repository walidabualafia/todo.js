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
    is_admin INTEGER DEFAULT 0,
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

  CREATE TABLE IF NOT EXISTS project_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    added_at TEXT NOT NULL,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(project_id, user_id)
  );
`);

// Add is_admin column if it doesn't exist (migration for existing databases)
try {
  db.exec(`ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0`);
  console.log('Added is_admin column to users table');
} catch (error) {
  // Column already exists, ignore error
}

// Make walid and admin users admins if they exist
try {
  db.prepare(`UPDATE users SET is_admin = 1 WHERE username IN (?, ?)`).run('walid', 'admin');
} catch (error) {
  // Users don't exist yet, will be set during initialization
}

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

  getTodos: (userId) => {
    const todos = db.prepare(`
      SELECT
        t.*,
        u.username as creator_name,
        p.name as project_name
      FROM todos t
      LEFT JOIN users u ON t.creator_id = u.id
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE t.creator_id = ?
      ORDER BY t.created_at DESC
    `).all(userId);

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

  getProjects: (userId) => {
    const projects = db.prepare(`
      SELECT DISTINCT
        p.*,
        u.username as creator_name,
        (SELECT COUNT(*) FROM todos WHERE project_id = p.id) as todo_count,
        CASE WHEN p.creator_id = ? THEN 1 ELSE 0 END as is_owner
      FROM projects p
      LEFT JOIN users u ON p.creator_id = u.id
      LEFT JOIN project_members pm ON p.id = pm.project_id
      WHERE p.creator_id = ? OR pm.user_id = ?
      ORDER BY p.created_at ASC
    `).all(userId, userId, userId);

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
  },

  // Admin functions
  getDatabaseStats: () => {
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    const projectCount = db.prepare('SELECT COUNT(*) as count FROM projects').get().count;
    const todoCount = db.prepare('SELECT COUNT(*) as count FROM todos').get().count;
    const completedTodoCount = db.prepare('SELECT COUNT(*) as count FROM todos WHERE status = ?').get('completed').count;

    return {
      users: userCount,
      projects: projectCount,
      todos: todoCount,
      completedTodos: completedTodoCount
    };
  },

  getAllUsersWithStats: () => {
    return db.prepare(`
      SELECT
        u.id,
        u.username,
        u.is_admin,
        u.created_at,
        (SELECT COUNT(*) FROM projects WHERE creator_id = u.id) as project_count,
        (SELECT COUNT(*) FROM todos WHERE creator_id = u.id) as todo_count
      FROM users u
      ORDER BY u.created_at DESC
    `).all();
  },

  getAllProjectsForAdmin: () => {
    return db.prepare(`
      SELECT
        p.*,
        u.username as creator_name,
        (SELECT COUNT(*) FROM todos WHERE project_id = p.id) as todo_count
      FROM projects p
      LEFT JOIN users u ON p.creator_id = u.id
      ORDER BY p.created_at DESC
    `).all();
  },

  getAllTodosForAdmin: () => {
    return db.prepare(`
      SELECT
        t.*,
        u.username as creator_name,
        p.name as project_name
      FROM todos t
      LEFT JOIN users u ON t.creator_id = u.id
      LEFT JOIN projects p ON t.project_id = p.id
      ORDER BY t.created_at DESC
    `).all();
  },

  updateUserAdminStatus: (userId, isAdmin) => {
    db.prepare(`UPDATE users SET is_admin = ? WHERE id = ?`).run(isAdmin, userId);
  },

  // Project sharing functions
  addProjectMember: (projectId, userId) => {
    const result = db.prepare(`
      INSERT INTO project_members (project_id, user_id, added_at)
      VALUES (?, ?, ?)
    `).run(projectId, userId, new Date().toISOString());

    return { lastInsertRowid: result.lastInsertRowid };
  },

  removeProjectMember: (projectId, userId) => {
    db.prepare('DELETE FROM project_members WHERE project_id = ? AND user_id = ?').run(projectId, userId);
  },

  getProjectMembers: (projectId) => {
    return db.prepare(`
      SELECT
        pm.*,
        u.username,
        u.id as user_id
      FROM project_members pm
      JOIN users u ON pm.user_id = u.id
      WHERE pm.project_id = ?
      ORDER BY pm.added_at ASC
    `).all(projectId);
  },

  isProjectMember: (projectId, userId) => {
    const result = db.prepare(`
      SELECT COUNT(*) as count
      FROM project_members
      WHERE project_id = ? AND user_id = ?
    `).get(projectId, userId);

    return result.count > 0;
  },

  hasProjectAccess: (projectId, userId) => {
    const project = db.prepare('SELECT creator_id FROM projects WHERE id = ?').get(projectId);
    if (!project) return false;
    if (project.creator_id === userId) return true;

    const isMember = db.prepare(`
      SELECT COUNT(*) as count
      FROM project_members
      WHERE project_id = ? AND user_id = ?
    `).get(projectId, userId);

    return isMember.count > 0;
  }
};

export { hashPassword, verifyPassword };
export { dbApi as db };
