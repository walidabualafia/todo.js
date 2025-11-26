import React, { useState } from 'react';
import bloomLogo from '../bloom.svg';
import { API_URL } from '../config';

function Login({ onLogin }) {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const endpoint = isRegister ? '/api/register' : '/api/login';
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok) {
        if (isRegister) {
          setIsRegister(false);
          setError('');
          alert('Account created successfully! Please login.');
        } else {
          onLogin(data.token, data.user);
        }
      } else {
        setError(data.error || 'An error occurred');
      }
    } catch (err) {
      setError('Failed to connect to server');
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '20px' }}>
          <img src={bloomLogo} alt="Bloom" style={{ width: '48px', height: '48px' }} />
          <h1 style={{ margin: 0, fontSize: '32px', color: '#047857' }}>Bloom</h1>
        </div>
        <h2>{isRegister ? 'Create Account' : 'Sign In'}</h2>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn">
            {isRegister ? 'Create Account' : 'Sign In'}
          </button>
        </form>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => {
            setIsRegister(!isRegister);
            setError('');
          }}
        >
          {isRegister ? 'Already have an account? Sign In' : 'Create New Account'}
        </button>
        <div style={{ marginTop: '20px', fontSize: '13px', color: '#616061', textAlign: 'center' }}>
          Demo credentials: admin/password123 or demo/password123
        </div>
      </div>
    </div>
  );
}

export default Login;
