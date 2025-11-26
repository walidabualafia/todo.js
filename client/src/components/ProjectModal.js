import React, { useState, useEffect } from 'react';

function ProjectModal({ project, onSave, onClose }) {
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });

  useEffect(() => {
    if (project) {
      setFormData({
        name: project.name,
        description: project.description || ''
      });
    }
  }, [project]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{project ? 'Edit Project' : 'Create New Project'}</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Project Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="e.g., Personal, Work, Side Project"
            />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Add details about this project..."
            />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              {project ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ProjectModal;
