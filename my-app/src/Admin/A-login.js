import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../form.css';

function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (event) => {
    event.preventDefault();
    setError('');

    const users = JSON.parse(localStorage.getItem('adminUsers') || '[]');
    const user = users.find(
      (item) => (item.username === username || item.email === username) && item.password === password
    );

    if (!user) {
      setError('Invalid username/email or password.');
      return;
    }

    localStorage.setItem('adminAuth', 'true');
    localStorage.setItem('adminUser', JSON.stringify(user));
    navigate('/admin');
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

          <div className="auth-link-row">
            <Link className="auth-link" to="/admin/register">Create Account</Link>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AdminLogin;