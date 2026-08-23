import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../form.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function SuperAdminRegister() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [superAdminCount, setSuperAdminCount] = useState(0);
  const [limitReached, setLimitReached] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    async function checkLimit() {
      try {
        const res = await fetch(`${API_URL}/api/super-auth/superadmins`);
        const data = await res.json();
        if (data.success) {
          setSuperAdminCount(data.count || 0);
          if (data.limitReached || data.count >= 2) {
            setLimitReached(true);
            setError('Super Admin registration limit reached. Maximum of 2 Super Admin accounts allowed.');
          }
        }
      } catch (err) {
        console.error('Failed to fetch Super Admin limit:', err);
      }
    }

    checkLimit();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (limitReached || superAdminCount >= 2) {
      setError('Super Admin registration limit reached. Maximum of 2 Super Admin accounts allowed.');
      return;
    }

    if (!username.trim() || !email.trim() || !password || !confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/super-auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          email: email.trim(),
          password,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        const message = data.error || data.errors?.[0]?.msg || 'Unable to register Super Admin.';
        setError(message);
        if (response.status === 403) {
          setLimitReached(true);
        }
        return;
      }

      localStorage.setItem('superAdminAuth', 'true');
      localStorage.setItem('superAdminUser', JSON.stringify(data.superAdmin));
      localStorage.setItem('adminAuth', 'true');
      navigate('/admin/super');
    } catch (err) {
      console.error('Super Admin registration error:', err);
      setError('Unable to reach server. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
          <span style={{ fontSize: '2.5rem' }}>S</span>
        </div>
        <h1 className="auth-title">Super Admin Registration</h1>
        <p className="auth-copy">
          Create an elite Super Admin account with full system authority and account management privileges.
        </p>

        {limitReached && (
          <div className="registration-limit-warning" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #f87171', padding: '14px 18px', borderRadius: '12px', marginBottom: '1.25rem', color: '#ef4444' }}>
            <strong style={{ display: 'block', fontSize: '1rem' }}>Registered Super Admin Limit Alert</strong>
            <p style={{ margin: '4px 0 0', fontSize: '0.88rem' }}>
              Maximum limit of 2 Super Administrator accounts reached ({superAdminCount}/2 registered).
              New Super Admin registrations are currently closed.
            </p>
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-field">
            Username
            <input
              className="auth-input"
              type="text"
              value={username}
              disabled={limitReached}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
            />
          </label>

          <label className="auth-field">
            Email
            <input
              className="auth-input"
              type="email"
              value={email}
              disabled={limitReached}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
            />
          </label>

          <label className="auth-field">
            Password
            <div className="password-input-wrap">
              <input
                className="auth-input"
                type={showPassword ? 'text' : 'password'}
                value={password}
                disabled={limitReached}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password (min 8 chars)"
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

          <label className="auth-field">
            Confirm Password
            <div className="password-input-wrap">
              <input
                className="auth-input"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                disabled={limitReached}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm Password"
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                title={showConfirmPassword ? 'Hide password' : 'Show password'}
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? (
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

          <button className="auth-button" type="submit" disabled={loading || limitReached}>
            {loading ? 'Creating Account…' : limitReached ? 'Registration Closed' : 'Register Super Admin'}
          </button>

          <div className="auth-link-row">
            <Link className="auth-link" to="/admin/super/login">
              Already have a Super Admin account? Login
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

export default SuperAdminRegister;
