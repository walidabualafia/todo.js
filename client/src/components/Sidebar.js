import React from 'react';
import bloomLogo from '../bloom.svg';

function Sidebar({
  user,
  onLogout,
  projects,
  selectedProject,
  onSelectProject,
  onCreateProject,
  onEditProject,
  onDeleteProject
}) {
  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <img src={bloomLogo} alt="Bloom" style={{ width: '32px', height: '32px' }} />
          <h3 style={{ margin: 0 }}>Bloom</h3>
        </div>
        <div className="user-info">Logged in as {user.username}</div>
      </div>
      <div className="sidebar-nav">
        <div className="nav-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h4>Projects</h4>
            <button
              className="btn-icon"
              onClick={onCreateProject}
              style={{
                background: 'none',
                border: 'none',
                color: '#b8b8b8',
                cursor: 'pointer',
                fontSize: '18px',
                padding: '0 4px'
              }}
              title="Create new project"
            >
              +
            </button>
          </div>
          <div
            className={`nav-item ${selectedProject === 'all' ? 'active' : ''}`}
            onClick={() => onSelectProject('all')}
          >
            <span className="nav-item-icon">#</span>
            all-todos
          </div>
          {projects.map((project) => (
            <div
              key={project.id}
              className={`nav-item ${String(selectedProject) === String(project.id) ? 'active' : ''}`}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <div
                onClick={() => onSelectProject(project.id)}
                style={{ flex: 1 }}
              >
                <span className="nav-item-icon">#</span>
                {project.name.toLowerCase().replace(/\s+/g, '-')}
                {project.todo_count > 0 && (
                  <span style={{ marginLeft: '8px', fontSize: '12px', color: '#b8b8b8' }}>
                    ({project.todo_count})
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  className="btn-icon-small"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditProject(project);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#b8b8b8',
                    cursor: 'pointer',
                    fontSize: '12px',
                    padding: '2px 4px'
                  }}
                  title="Edit project"
                >
                  ✎
                </button>
                <button
                  className="btn-icon-small"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteProject(project.id);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#b8b8b8',
                    cursor: 'pointer',
                    fontSize: '12px',
                    padding: '2px 4px'
                  }}
                  title="Delete project"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="sidebar-footer">
        <button className="logout-btn" onClick={onLogout}>
          Sign Out
        </button>
      </div>
    </div>
  );
}

export default Sidebar;
