import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import jwt from 'jsonwebtoken';
import { db, hashPassword, verifyPassword } from './database.js';

const app = express();
const PORT = 5001;
const JWT_SECRET = 'your-secret-key-change-in-production';

app.use(cors());
app.use(bodyParser.json());

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access denied' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

const authenticateAdmin = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access denied' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    if (!user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    req.user = user;
    next();
  });
};

app.post('/api/register', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const existingUser = db.getUserByUsername(username);
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    const hashedPassword = await hashPassword(password);
    const result = db.createUser(username, hashedPassword);

    res.json({ message: 'User created successfully', userId: result.lastInsertRowid });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = db.getUserByUsername(username);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await verifyPassword(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, isAdmin: user.is_admin },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ token, user: { id: user.id, username: user.username, isAdmin: user.is_admin } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/users', authenticateToken, (req, res) => {
  try {
    const users = db.getAllUsers();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/todos', authenticateToken, (req, res) => {
  try {
    const todos = db.getTodos(req.user.id);
    res.json(todos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/todos/project/:projectId', authenticateToken, (req, res) => {
  try {
    const todos = db.getTodosByProject(req.params.projectId);
    res.json(todos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/todos', authenticateToken, (req, res) => {
  try {
    const { title, description, status, deadline, project_id } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const result = db.createTodo(
      title,
      description || null,
      status || 'pending',
      deadline || null,
      req.user.id,
      project_id || null
    );

    const todoId = result.lastInsertRowid;
    const todo = db.getTodoById(todoId);
    res.json(todo);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/todos/:id', authenticateToken, (req, res) => {
  try {
    const { title, description, status, deadline, project_id } = req.body;
    const todoId = req.params.id;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    db.updateTodo(title, description || null, status || 'pending', deadline || null, project_id || null, todoId);

    const todo = db.getTodoById(todoId);
    res.json(todo);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/todos/:id', authenticateToken, (req, res) => {
  try {
    db.deleteTodo(req.params.id);
    res.json({ message: 'Todo deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/projects', authenticateToken, (req, res) => {
  try {
    const projects = db.getProjects(req.user.id);
    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/projects/:id', authenticateToken, (req, res) => {
  try {
    const project = db.getProjectById(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json(project);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/projects', authenticateToken, (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Project name is required' });
    }

    const result = db.createProject(
      name,
      description || null,
      req.user.id
    );

    const projectId = result.lastInsertRowid;
    const project = db.getProjectById(projectId);
    res.json(project);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/projects/:id', authenticateToken, (req, res) => {
  try {
    const { name, description } = req.body;
    const projectId = req.params.id;

    if (!name) {
      return res.status(400).json({ error: 'Project name is required' });
    }

    db.updateProject(name, description || null, projectId);

    const project = db.getProjectById(projectId);
    res.json(project);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/projects/:id', authenticateToken, (req, res) => {
  try {
    db.deleteProject(req.params.id);
    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Project sharing endpoints
app.get('/api/projects/:id/members', authenticateToken, (req, res) => {
  try {
    const projectId = req.params.id;

    // Check if user has access to this project
    if (!db.hasProjectAccess(projectId, req.user.id)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const members = db.getProjectMembers(projectId);
    res.json(members);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/projects/:id/members', authenticateToken, (req, res) => {
  try {
    const projectId = req.params.id;
    const { username } = req.body;

    // Check if user is the project owner
    const project = db.getProjectById(projectId);
    if (!project || project.creator_id !== req.user.id) {
      return res.status(403).json({ error: 'Only project owner can add members' });
    }

    // Get user by username
    const userToAdd = db.getUserByUsername(username);
    if (!userToAdd) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Don't add owner as member
    if (userToAdd.id === req.user.id) {
      return res.status(400).json({ error: 'Cannot add yourself as a member' });
    }

    // Check if already a member
    if (db.isProjectMember(projectId, userToAdd.id)) {
      return res.status(400).json({ error: 'User is already a member' });
    }

    db.addProjectMember(projectId, userToAdd.id);
    res.json({ message: 'Member added successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/projects/:id/members/:userId', authenticateToken, (req, res) => {
  try {
    const projectId = req.params.id;
    const userId = parseInt(req.params.userId);

    // Check if user is the project owner
    const project = db.getProjectById(projectId);
    if (!project || project.creator_id !== req.user.id) {
      return res.status(403).json({ error: 'Only project owner can remove members' });
    }

    db.removeProjectMember(projectId, userId);
    res.json({ message: 'Member removed successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin endpoints
app.get('/api/admin/stats', authenticateAdmin, (req, res) => {
  try {
    const stats = db.getDatabaseStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/users', authenticateAdmin, (req, res) => {
  try {
    const users = db.getAllUsersWithStats();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/projects', authenticateAdmin, (req, res) => {
  try {
    const projects = db.getAllProjectsForAdmin();
    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/todos', authenticateAdmin, (req, res) => {
  try {
    const todos = db.getAllTodosForAdmin();
    res.json(todos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/admin/users/:id/admin', authenticateAdmin, (req, res) => {
  try {
    const { isAdmin } = req.body;
    db.updateUserAdminStatus(req.params.id, isAdmin ? 1 : 0);
    res.json({ message: 'User admin status updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Emergency endpoint to bootstrap first admin - REMOVE AFTER USE
app.post('/api/bootstrap-admin', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Verify credentials
    const user = db.getUserByUsername(username);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await verifyPassword(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Make this user an admin
    db.updateUserAdminStatus(user.id, 1);

    res.json({ message: 'Admin access granted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
