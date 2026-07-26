import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../form.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function SuperAdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!username.trim() || !password) {
      setError('Please enter your username/email and password.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/super-auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await response.json();

      if (!response.ok) {
        const message = data.error || data.errors?.[0]?.msg || 'Super Admin login failed.';
        setError(message);
        return;
      }

      localStorage.setItem('superAdminAuth', 'true');
      localStorage.setItem('superAdminUser', JSON.stringify(data.superAdmin));
      localStorage.setItem('adminAuth', 'true');
      navigate('/admin/super');
    } catch (err) {
      console.error('Super Admin login error:', err);
      setError('Unable to reach server. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
          <span style={{ fontSize: '2.5rem' }}>👑</span>
        </div>
        <h1 className="auth-title">Super Admin Portal</h1>
        <p className="auth-copy">
          Authenticate to access administrative controls, staff management, and system configuration.
        </p>

        <h2 className="auth-subtitle">Super Admin Login</h2>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-field">
            Username / Email
            <input
              className="auth-input"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter Super Admin username or email"
            />
          </label>

          <label className="auth-field">
            Password
            <input
              className="auth-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter Super Admin password"
            />
          </label>

          {error && <p className="form-error">{error}</p>}

          <button className="auth-button" type="submit" disabled={loading}>
            {loading ? 'Authenticating…' : 'Login as Super Admin'}
          </button>

          <div className="auth-link-row" style={{ marginTop: '1.25rem', display: 'flex', justifyContent: 'space-between' }}>
            <Link className="auth-link" to="/admin/super/register">
              Create Super Admin Account
            </Link>
            <Link className="auth-link" to="/admin/login">
              Regular Admin Login
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

export default SuperAdminLogin;
