import React, { useState, useEffect } from 'react';

function TodoModal({ todo, projects, onSave, onClose }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'pending',
    deadline: '',
    project_id: ''
  });

  useEffect(() => {
    if (todo) {
      setFormData({
        title: todo.title,
        description: todo.description || '',
        status: todo.status,
        deadline: todo.deadline ? todo.deadline.slice(0, 16) : '',
        project_id: todo.project_id || ''
      });
    }
  }, [todo]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...formData,
      deadline: formData.deadline || null,
      project_id: formData.project_id ? parseInt(formData.project_id) : null
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{todo ? 'Edit Todo' : 'Create New Todo'}</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Add more details about this todo..."
            />
          </div>
          <div className="form-group">
            <label>Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            >
              <option value="pending">Pending</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          <div className="form-group">
            <label>Deadline</label>
            <input
              type="datetime-local"
              value={formData.deadline}
              onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Project</label>
            <select
              value={formData.project_id}
              onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
            >
              <option value="">No Project</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              {todo ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default TodoModal;
