import bcrypt from 'bcrypt';
import pg from 'pg';
const { Pool } = pg;

// PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Initialize database tables
async function initializeDatabase() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        is_admin INTEGER DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS projects (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        creator_id INTEGER NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        FOREIGN KEY (creator_id) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS todos (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        deadline TIMESTAMP,
        creator_id INTEGER NOT NULL,
        project_id INTEGER,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        FOREIGN KEY (creator_id) REFERENCES users(id),
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
      );

      CREATE TABLE IF NOT EXISTS project_members (
        id SERIAL PRIMARY KEY,
        project_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        added_at TIMESTAMP NOT NULL DEFAULT NOW(),
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(project_id, user_id)
      );
    `);

    // Add is_admin column if it doesn't exist (migration for existing databases)
    try {
      await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin INTEGER DEFAULT 0`);
      console.log('Ensured is_admin column exists');
    } catch (error) {
      // Column already exists, ignore error
    }

    // Make walid and admin users admins if they exist
    try {
      await client.query(`UPDATE users SET is_admin = 1 WHERE username IN ($1, $2)`, ['walid', 'admin']);
    } catch (error) {
      // Users don't exist yet, will be set during initialization
    }

    // Initialize demo data if database is empty
    const userCount = await client.query('SELECT COUNT(*) as count FROM users');

    if (parseInt(userCount.rows[0].count) === 0) {
      console.log('Initializing database with demo data...');

      const adminHash = await hashPassword('password123');
      const demoHash = await hashPassword('password123');

      // Insert demo users
      await client.query(`
        INSERT INTO users (username, password, is_admin, created_at)
        VALUES ($1, $2, $3, NOW())
      `, ['admin', adminHash, 1]);

      await client.query(`
        INSERT INTO users (username, password, created_at)
        VALUES ($1, $2, NOW())
      `, ['demo', demoHash]);

      // Insert demo projects
      await client.query(`
        INSERT INTO projects (name, description, creator_id, created_at, updated_at)
        VALUES ($1, $2, $3, NOW(), NOW())
      `, ['Personal', 'Personal tasks and projects', 1]);

      await client.query(`
        INSERT INTO projects (name, description, creator_id, created_at, updated_at)
        VALUES ($1, $2, $3, NOW(), NOW())
      `, ['Work', 'Work-related tasks', 1]);

      console.log('Demo users created: admin/password123 and demo/password123');
      console.log('Demo projects created: Personal and Work');
    }
  } finally {
    client.release();
  }
}

initializeDatabase().catch(console.error);

async function hashPassword(password) {
  return await bcrypt.hash(password, 10);
}

async function verifyPassword(password, hash) {
  return await bcrypt.compare(password, hash);
}

export const dbApi = {
  createUser: async (username, password) => {
    const result = await pool.query(`
      INSERT INTO users (username, password, created_at)
      VALUES ($1, $2, NOW())
      RETURNING id
    `, [username, password]);

    return { lastInsertRowid: result.rows[0].id };
  },

  getUserByUsername: async (username) => {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    return result.rows[0];
  },

  getAllUsers: async () => {
    const result = await pool.query('SELECT id, username, created_at FROM users');
    return result.rows;
  },

  createTodo: async (title, description, status, deadline, creatorId, projectId) => {
    const result = await pool.query(`
      INSERT INTO todos (title, description, status, deadline, creator_id, project_id, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      RETURNING id
    `, [title, description, status, deadline, creatorId, projectId]);

    return { lastInsertRowid: result.rows[0].id };
  },

  updateTodo: async (title, description, status, deadline, projectId, id) => {
    await pool.query(`
      UPDATE todos
      SET title = $1, description = $2, status = $3, deadline = $4, project_id = $5, updated_at = NOW()
      WHERE id = $6
    `, [title, description, status, deadline, projectId, id]);
  },

  deleteTodo: async (id) => {
    await pool.query('DELETE FROM todos WHERE id = $1', [id]);
  },

  getTodos: async (userId) => {
    const result = await pool.query(`
      SELECT
        t.*,
        u.username as creator_name,
        p.name as project_name
      FROM todos t
      LEFT JOIN users u ON t.creator_id = u.id
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE t.creator_id = $1
      ORDER BY t.created_at DESC
    `, [userId]);

    return result.rows;
  },

  getTodoById: async (id) => {
    const result = await pool.query(`
      SELECT
        t.*,
        u.username as creator_name,
        p.name as project_name
      FROM todos t
      LEFT JOIN users u ON t.creator_id = u.id
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE t.id = $1
    `, [id]);

    return result.rows[0];
  },

  getTodosByProject: async (projectId) => {
    const result = await pool.query(`
      SELECT
        t.*,
        u.username as creator_name,
        p.name as project_name
      FROM todos t
      LEFT JOIN users u ON t.creator_id = u.id
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE t.project_id = $1
      ORDER BY t.created_at DESC
    `, [projectId]);

    return result.rows;
  },

  createProject: async (name, description, creatorId) => {
    const result = await pool.query(`
      INSERT INTO projects (name, description, creator_id, created_at, updated_at)
      VALUES ($1, $2, $3, NOW(), NOW())
      RETURNING id
    `, [name, description, creatorId]);

    return { lastInsertRowid: result.rows[0].id };
  },

  updateProject: async (name, description, id) => {
    await pool.query(`
      UPDATE projects
      SET name = $1, description = $2, updated_at = NOW()
      WHERE id = $3
    `, [name, description, id]);
  },

  deleteProject: async (id) => {
    await pool.query('DELETE FROM projects WHERE id = $1', [id]);
  },

  getProjects: async (userId) => {
    const result = await pool.query(`
      SELECT DISTINCT
        p.*,
        u.username as creator_name,
        (SELECT COUNT(*) FROM todos WHERE project_id = p.id) as todo_count,
        CASE WHEN p.creator_id = $1 THEN 1 ELSE 0 END as is_owner
      FROM projects p
      LEFT JOIN users u ON p.creator_id = u.id
      LEFT JOIN project_members pm ON p.id = pm.project_id
      WHERE p.creator_id = $1 OR pm.user_id = $1
      ORDER BY p.created_at ASC
    `, [userId]);

    return result.rows;
  },

  getProjectById: async (id) => {
    const result = await pool.query(`
      SELECT
        p.*,
        u.username as creator_name,
        (SELECT COUNT(*) FROM todos WHERE project_id = p.id) as todo_count
      FROM projects p
      LEFT JOIN users u ON p.creator_id = u.id
      WHERE p.id = $1
    `, [id]);

    return result.rows[0];
  },

  // Admin functions
  getDatabaseStats: async () => {
    const userCount = await pool.query('SELECT COUNT(*) as count FROM users');
    const projectCount = await pool.query('SELECT COUNT(*) as count FROM projects');
    const todoCount = await pool.query('SELECT COUNT(*) as count FROM todos');
    const completedTodoCount = await pool.query("SELECT COUNT(*) as count FROM todos WHERE status = 'completed'");

    return {
      users: parseInt(userCount.rows[0].count),
      projects: parseInt(projectCount.rows[0].count),
      todos: parseInt(todoCount.rows[0].count),
      completedTodos: parseInt(completedTodoCount.rows[0].count)
    };
  },

  getAllUsersWithStats: async () => {
    const result = await pool.query(`
      SELECT
        u.id,
        u.username,
        u.is_admin,
        u.created_at,
        (SELECT COUNT(*) FROM projects WHERE creator_id = u.id) as project_count,
        (SELECT COUNT(*) FROM todos WHERE creator_id = u.id) as todo_count
      FROM users u
      ORDER BY u.created_at DESC
    `);

    return result.rows;
  },

  getAllProjectsForAdmin: async () => {
    const result = await pool.query(`
      SELECT
        p.*,
        u.username as creator_name,
        (SELECT COUNT(*) FROM todos WHERE project_id = p.id) as todo_count
      FROM projects p
      LEFT JOIN users u ON p.creator_id = u.id
      ORDER BY p.created_at DESC
    `);

    return result.rows;
  },

  getAllTodosForAdmin: async () => {
    const result = await pool.query(`
      SELECT
        t.*,
        u.username as creator_name,
        p.name as project_name
      FROM todos t
      LEFT JOIN users u ON t.creator_id = u.id
      LEFT JOIN projects p ON t.project_id = p.id
      ORDER BY t.created_at DESC
    `);

    return result.rows;
  },

  updateUserAdminStatus: async (userId, isAdmin) => {
    await pool.query(`UPDATE users SET is_admin = $1 WHERE id = $2`, [isAdmin, userId]);
  },

  // Project sharing functions
  addProjectMember: async (projectId, userId) => {
    const result = await pool.query(`
      INSERT INTO project_members (project_id, user_id, added_at)
      VALUES ($1, $2, NOW())
      RETURNING id
    `, [projectId, userId]);

    return { lastInsertRowid: result.rows[0].id };
  },

  removeProjectMember: async (projectId, userId) => {
    await pool.query('DELETE FROM project_members WHERE project_id = $1 AND user_id = $2', [projectId, userId]);
  },

  getProjectMembers: async (projectId) => {
    const result = await pool.query(`
      SELECT
        pm.*,
        u.username,
        u.id as user_id
      FROM project_members pm
      JOIN users u ON pm.user_id = u.id
      WHERE pm.project_id = $1
      ORDER BY pm.added_at ASC
    `, [projectId]);

    return result.rows;
  },

  isProjectMember: async (projectId, userId) => {
    const result = await pool.query(`
      SELECT COUNT(*) as count
      FROM project_members
      WHERE project_id = $1 AND user_id = $2
    `, [projectId, userId]);

    return parseInt(result.rows[0].count) > 0;
  },

  hasProjectAccess: async (projectId, userId) => {
    const projectResult = await pool.query('SELECT creator_id FROM projects WHERE id = $1', [projectId]);
    if (!projectResult.rows[0]) return false;
    if (projectResult.rows[0].creator_id === userId) return true;

    const memberResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM project_members
      WHERE project_id = $1 AND user_id = $2
    `, [projectId, userId]);

    return parseInt(memberResult.rows[0].count) > 0;
  }
};

export { hashPassword, verifyPassword };
export { dbApi as db };
