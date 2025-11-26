import React, { useState, useEffect } from 'react';
import { API_URL } from '../config';
import './AdminDashboard.css';

function AdminDashboard({ token, onClose }) {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [todos, setTodos] = useState([]);
  const [activeTab, setActiveTab] = useState('stats');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      if (activeTab === 'stats') {
        const response = await fetch(`${API_URL}/api/admin/stats`, { headers });
        if (!response.ok) throw new Error('Failed to fetch stats');
        const data = await response.json();
        setStats(data);
      } else if (activeTab === 'users') {
        const response = await fetch(`${API_URL}/api/admin/users`, { headers });
        if (!response.ok) throw new Error('Failed to fetch users');
        const data = await response.json();
        setUsers(data);
      } else if (activeTab === 'projects') {
        const response = await fetch(`${API_URL}/api/admin/projects`, { headers });
        if (!response.ok) throw new Error('Failed to fetch projects');
        const data = await response.json();
        setProjects(data);
      } else if (activeTab === 'todos') {
        const response = await fetch(`${API_URL}/api/admin/todos`, { headers });
        if (!response.ok) throw new Error('Failed to fetch todos');
        const data = await response.json();
        setTodos(data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleUserAdmin = async (userId, currentStatus) => {
    try {
      const response = await fetch(`${API_URL}/api/admin/users/${userId}/admin`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isAdmin: !currentStatus })
      });

      if (!response.ok) throw new Error('Failed to update user');
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="admin-overlay">
      <div className="admin-dashboard">
        <div className="admin-header">
          <h2>Admin Dashboard</h2>
          <button onClick={onClose} className="close-btn">×</button>
        </div>

        <div className="admin-tabs">
          <button
            className={activeTab === 'stats' ? 'active' : ''}
            onClick={() => setActiveTab('stats')}
          >
            Statistics
          </button>
          <button
            className={activeTab === 'users' ? 'active' : ''}
            onClick={() => setActiveTab('users')}
          >
            Users
          </button>
          <button
            className={activeTab === 'projects' ? 'active' : ''}
            onClick={() => setActiveTab('projects')}
          >
            Projects
          </button>
          <button
            className={activeTab === 'todos' ? 'active' : ''}
            onClick={() => setActiveTab('todos')}
          >
            Todos
          </button>
        </div>

        <div className="admin-content">
          {loading && <div className="loading">Loading...</div>}
          {error && <div className="error">{error}</div>}

          {!loading && activeTab === 'stats' && stats && (
            <div className="stats-grid">
              <div className="stat-card">
                <h3>Total Users</h3>
                <p className="stat-number">{stats.users}</p>
              </div>
              <div className="stat-card">
                <h3>Total Projects</h3>
                <p className="stat-number">{stats.projects}</p>
              </div>
              <div className="stat-card">
                <h3>Total Todos</h3>
                <p className="stat-number">{stats.todos}</p>
              </div>
              <div className="stat-card">
                <h3>Completed Todos</h3>
                <p className="stat-number">{stats.completedTodos}</p>
              </div>
            </div>
          )}

          {!loading && activeTab === 'users' && (
            <div className="data-table">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Username</th>
                    <th>Admin</th>
                    <th>Projects</th>
                    <th>Todos</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user.id}>
                      <td>{user.id}</td>
                      <td>{user.username}</td>
                      <td>{user.is_admin ? 'Yes' : 'No'}</td>
                      <td>{user.project_count}</td>
                      <td>{user.todo_count}</td>
                      <td>{new Date(user.created_at).toLocaleDateString()}</td>
                      <td>
                        <button
                          onClick={() => toggleUserAdmin(user.id, user.is_admin)}
                          className="toggle-admin-btn"
                        >
                          {user.is_admin ? 'Remove Admin' : 'Make Admin'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loading && activeTab === 'projects' && (
            <div className="data-table">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Description</th>
                    <th>Creator</th>
                    <th>Todo Count</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map(project => (
                    <tr key={project.id}>
                      <td>{project.id}</td>
                      <td>{project.name}</td>
                      <td>{project.description || 'N/A'}</td>
                      <td>{project.creator_name}</td>
                      <td>{project.todo_count}</td>
                      <td>{new Date(project.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loading && activeTab === 'todos' && (
            <div className="data-table">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Title</th>
                    <th>Status</th>
                    <th>Project</th>
                    <th>Creator</th>
                    <th>Deadline</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {todos.map(todo => (
                    <tr key={todo.id}>
                      <td>{todo.id}</td>
                      <td>{todo.title}</td>
                      <td>
                        <span className={`status-badge ${todo.status}`}>
                          {todo.status}
                        </span>
                      </td>
                      <td>{todo.project_name || 'N/A'}</td>
                      <td>{todo.creator_name}</td>
                      <td>{todo.deadline ? new Date(todo.deadline).toLocaleDateString() : 'N/A'}</td>
                      <td>{new Date(todo.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
