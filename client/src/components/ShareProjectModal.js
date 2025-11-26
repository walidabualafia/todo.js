import React, { useState, useEffect } from 'react';
import { API_URL } from '../config';
import './ShareProjectModal.css';

function ShareProjectModal({ project, token, onClose }) {
  const [username, setUsername] = useState('');
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      const response = await fetch(`${API_URL}/api/projects/${project.id}/members`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch members');
      const data = await response.json();
      setMembers(data);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/projects/${project.id}/members`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add member');
      }

      setMessage('Member added successfully!');
      setUsername('');
      fetchMembers();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (userId) => {
    try {
      const response = await fetch(`${API_URL}/api/projects/${project.id}/members/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to remove member');
      fetchMembers();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content share-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Share "{project.name}"</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {error && <div className="error-message">{error}</div>}
          {message && <div className="success-message">{message}</div>}

          <form onSubmit={handleAddMember} className="add-member-form">
            <div className="form-group">
              <label>Add member by username</label>
              <div className="input-button-group">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  required
                />
                <button type="submit" disabled={loading} className="btn-primary">
                  {loading ? 'Adding...' : 'Add'}
                </button>
              </div>
            </div>
          </form>

          <div className="members-list">
            <h4>Members ({members.length})</h4>
            {members.length === 0 ? (
              <p className="no-members">No members yet. Add someone to collaborate!</p>
            ) : (
              <ul>
                {members.map((member) => (
                  <li key={member.id} className="member-item">
                    <div className="member-info">
                      <span className="member-avatar">{member.username.charAt(0).toUpperCase()}</span>
                      <span className="member-username">{member.username}</span>
                    </div>
                    {project.is_owner && (
                      <button
                        onClick={() => handleRemoveMember(member.user_id)}
                        className="btn-remove"
                      >
                        Remove
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ShareProjectModal;
