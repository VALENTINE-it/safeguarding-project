import React, { useState } from 'react';
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
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

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
          <span style={{ fontSize: '2.5rem' }}>⚡</span>
        </div>
        <h1 className="auth-title">Super Admin Registration</h1>
        <p className="auth-copy">
          Create an elite Super Admin account with full system authority and account management privileges.
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="auth-field">
            Username
            <input
              className="auth-input"
              type="text"
              value={username}
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
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm Password"
            />
          </label>

          {error && <p className="form-error">{error}</p>}

          <button className="auth-button" type="submit" disabled={loading}>
            {loading ? 'Creating Account…' : 'Register Super Admin'}
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
