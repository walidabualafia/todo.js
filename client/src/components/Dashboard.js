import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './Sidebar';
import TodoList from './TodoList';
import TodoModal from './TodoModal';
import ProjectModal from './ProjectModal';
import AdminDashboard from './AdminDashboard';
import ShareProjectModal from './ShareProjectModal';
import { API_URL } from '../config';

function Dashboard({ user, token, onLogout }) {
  const [todos, setTodos] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState('all');
  const [isTodoModalOpen, setIsTodoModalOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isAdminDashboardOpen, setIsAdminDashboardOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [editingTodo, setEditingTodo] = useState(null);
  const [editingProject, setEditingProject] = useState(null);
  const [sharingProject, setSharingProject] = useState(null);

  const fetchTodos = useCallback(async () => {
    try {
      const endpoint = selectedProject !== 'all'
        ? `${API_URL}/api/todos/project/${selectedProject}`
        : `${API_URL}/api/todos`;

      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      setTodos(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch todos:', err);
      setTodos([]);
    }
  }, [selectedProject, token]);

  const fetchProjects = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/projects`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      setProjects(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch projects:', err);
      setProjects([]);
    }
  }, [token]);

  useEffect(() => {
    fetchTodos();
    fetchProjects();
  }, [fetchTodos, fetchProjects]);

  const handleCreateTodo = () => {
    setEditingTodo(null);
    setIsTodoModalOpen(true);
  };

  const handleEditTodo = (todo) => {
    setEditingTodo(todo);
    setIsTodoModalOpen(true);
  };

  const handleCreateProject = () => {
    setEditingProject(null);
    setIsProjectModalOpen(true);
  };

  const handleEditProject = (project) => {
    setEditingProject(project);
    setIsProjectModalOpen(true);
  };

  const handleShareProject = (project) => {
    setSharingProject(project);
    setIsShareModalOpen(true);
  };

  const handleDeleteTodo = async (todoId) => {
    if (!window.confirm('Are you sure you want to delete this todo?')) {
      return;
    }

    try {
      await fetch(`${API_URL}/api/todos/${todoId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      fetchTodos();
    } catch (err) {
      console.error('Failed to delete todo:', err);
    }
  };

  const handleDeleteProject = async (projectId) => {
    if (!window.confirm('Are you sure you want to delete this project? Todos in this project will not be deleted, but will be unassigned from the project.')) {
      return;
    }

    try {
      await fetch(`${API_URL}/api/projects/${projectId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (selectedProject === projectId) {
        setSelectedProject('all');
      }
      fetchProjects();
      fetchTodos();
    } catch (err) {
      console.error('Failed to delete project:', err);
    }
  };

  const handleSaveTodo = async (todoData) => {
    try {
      const url = editingTodo
        ? `${API_URL}/api/todos/${editingTodo.id}`
        : `${API_URL}/api/todos`;

      const method = editingTodo ? 'PUT' : 'POST';

      await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(todoData),
      });

      setIsTodoModalOpen(false);
      fetchTodos();
    } catch (err) {
      console.error('Failed to save todo:', err);
    }
  };

  const handleSaveProject = async (projectData) => {
    try {
      const url = editingProject
        ? `${API_URL}/api/projects/${editingProject.id}`
        : `${API_URL}/api/projects`;

      const method = editingProject ? 'PUT' : 'POST';

      await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(projectData),
      });

      setIsProjectModalOpen(false);
      fetchProjects();
    } catch (err) {
      console.error('Failed to save project:', err);
    }
  };

  const getCurrentViewTitle = () => {
    if (selectedProject === 'all') {
      return 'All Todos';
    }
    const project = projects.find(p => p.id === parseInt(selectedProject));
    return project ? `${project.name} - Todos` : 'Todos';
  };

  return (
    <>
      <Sidebar
        user={user}
        onLogout={onLogout}
        projects={projects}
        selectedProject={selectedProject}
        onSelectProject={setSelectedProject}
        onCreateProject={handleCreateProject}
        onEditProject={handleEditProject}
        onDeleteProject={handleDeleteProject}
        onShareProject={handleShareProject}
      />
      <div className="main-content">
        <div className="content-header">
          <h2>{getCurrentViewTitle()}</h2>
          <div className="header-actions">
            {user?.isAdmin === 1 && (
              <button
                className="btn-admin"
                onClick={() => setIsAdminDashboardOpen(true)}
                style={{ marginRight: '12px' }}
              >
                Admin Dashboard
              </button>
            )}
            <button className="btn-primary" onClick={handleCreateTodo}>
              + New Todo
            </button>
          </div>
        </div>
        <div className="content-body">
          <TodoList
            todos={todos}
            onEdit={handleEditTodo}
            onDelete={handleDeleteTodo}
          />
        </div>
      </div>
      {isTodoModalOpen && (
        <TodoModal
          todo={editingTodo}
          projects={projects}
          onSave={handleSaveTodo}
          onClose={() => setIsTodoModalOpen(false)}
        />
      )}
      {isProjectModalOpen && (
        <ProjectModal
          project={editingProject}
          onSave={handleSaveProject}
          onClose={() => setIsProjectModalOpen(false)}
        />
      )}
      {isAdminDashboardOpen && (
        <AdminDashboard
          token={token}
          onClose={() => setIsAdminDashboardOpen(false)}
        />
      )}
      {isShareModalOpen && sharingProject && (
        <ShareProjectModal
          project={sharingProject}
          token={token}
          onClose={() => {
            setIsShareModalOpen(false);
            setSharingProject(null);
          }}
        />
      )}
    </>
  );
}

export default Dashboard;
