import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import GoogleAuthButton from './GoogleAuthButton';
import '../form.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function SuperAdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleGoogleSuccess = async (credential) => {
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/super-auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential }),
      });
      const data = await response.json();

      if (!response.ok) {
        const message = data.error || 'Google authentication failed.';
        setError(message);
        return;
      }

      localStorage.setItem('superAdminAuth', 'true');
      localStorage.setItem('superAdminUser', JSON.stringify(data.superAdmin));
      localStorage.setItem('adminAuth', 'true');
      navigate('/admin/super');
    } catch (err) {
      console.error('Super Admin Google login error:', err);
      setError('Unable to reach server. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

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
            <div className="password-input-wrap">
              <input
                className="auth-input"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter Super Admin password"
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? 'Hide password' : 'Show password'}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                )}
              </button>
            </div>
          </label>

          {error && <p className="form-error">{error}</p>}

          <button className="auth-button" type="submit" disabled={loading}>
            {loading ? 'Authenticating…' : 'Login as Super Admin'}
          </button>

          <div className="auth-divider">
            <span>OR</span>
          </div>

          <GoogleAuthButton
            text="signin_with"
            disabled={loading}
            onSuccess={handleGoogleSuccess}
            onError={(errMsg) => setError(errMsg)}
          />

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
