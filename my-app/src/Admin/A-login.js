import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../form.css';

function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();

      if (!response.ok) {
        const message = data.error || data.errors?.[0]?.msg || 'Login failed.';
        setError(message);
        return;
      }

      localStorage.setItem('adminAuth', 'true');
      localStorage.setItem('adminUser', JSON.stringify(data.admin));
      navigate('/admin');
    } catch (err) {
      console.error('Login error:', err);
      setError('Unable to reach server. Please try again later.');
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <h1 className="auth-title">Admin Page</h1>
        <p className="auth-copy">Welcome to the admin area. Manage the application and review reports from one secure place.</p>

        <h2 className="auth-subtitle">Login to Admin Page</h2>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-field">
            Username/Email
            <input
              className="auth-input"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username or email"
            />
          </label>

          <label className="auth-field">
            Password
            <input
              className="auth-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
            />
          </label>

          {error && <p className="form-error">{error}</p>}

          <button className="auth-button" type="submit">Login</button>


        </form>
      </div>
    </div>
  );
}

export default AdminLogin;