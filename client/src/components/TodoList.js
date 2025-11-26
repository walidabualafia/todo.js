import React from 'react';

function TodoList({ todos, onEdit, onDelete }) {
  const formatDeadline = (deadline) => {
    if (!deadline) return null;
    const date = new Date(deadline);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (todos.length === 0) {
    return (
      <div className="empty-state">
        <h3>No todos yet</h3>
        <p>Create your first todo to get started!</p>
      </div>
    );
  }

  return (
    <div className="todo-list">
      {todos.map((todo) => (
        <div key={todo.id} className="todo-item">
          <div className="todo-header">
            <div>
              <div className="todo-title">{todo.title}</div>
              <div className="todo-meta">Created by {todo.creator_name}</div>
            </div>
          </div>
          {todo.description && (
            <div className="todo-description">{todo.description}</div>
          )}
          <div className="todo-footer">
            <span className={`status-badge status-${todo.status.replace('_', '-')}`}>
              {todo.status.replace('_', ' ')}
            </span>
            {todo.deadline && (
              <span className="deadline">
                Due: {formatDeadline(todo.deadline)}
              </span>
            )}
            {todo.project_name && (
              <div className="project-badge">
                <span style={{ fontSize: '13px', color: '#616061' }}>Project:</span>
                <span style={{
                  marginLeft: '6px',
                  padding: '2px 8px',
                  background: '#e8e8e8',
                  borderRadius: '3px',
                  fontSize: '12px'
                }}>
                  {todo.project_name}
                </span>
              </div>
            )}
            <div className="todo-actions">
              <button className="btn-small btn-edit" onClick={() => onEdit(todo)}>
                Edit
              </button>
              <button className="btn-small btn-delete" onClick={() => onDelete(todo.id)}>
                Delete
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default TodoList;
