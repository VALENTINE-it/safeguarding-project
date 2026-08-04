import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../form.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function SuperAdminRegister() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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
            <input
              className="auth-input"
              type="password"
              value={password}
              disabled={limitReached}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password (min 8 chars)"
            />
          </label>

          <label className="auth-field">
            Confirm Password
            <input
              className="auth-input"
              type="password"
              value={confirmPassword}
              disabled={limitReached}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm Password"
            />
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
