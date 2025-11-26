import React, { useState, useEffect } from 'react';
import './App.css';
import Login from './components/Login';
import Dashboard from './components/Dashboard';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user') || 'null'));

  const handleLogin = (authToken, userData) => {
    localStorage.setItem('token', authToken);
    localStorage.setItem('user', JSON.stringify(userData));
    setToken(authToken);
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  return (
    <div className="app">
      {!token ? (
        <Login onLogin={handleLogin} />
      ) : (
        <Dashboard user={user} token={token} onLogout={handleLogout} />
      )}
    </div>
  );
}

export default App;
