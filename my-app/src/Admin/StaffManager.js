import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../form.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function StaffManager() {
  const [staff, setStaff] = useState([]);
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const loadStaff = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/staff`);
      const data = await res.json();
      if (data.success) {
        setStaff(data.staff || []);
      }
    } catch (err) {
      setError('Unable to reach the server.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const adminAuth = localStorage.getItem('adminAuth');
    if (!adminAuth) {
      navigate('/admin/login');
      return;
    }
    loadStaff();
  }, [loadStaff, navigate]);

  const handleAdd = async (event) => {
    event.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Staff name is required.');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/staff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), role: role.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        const message = data.errors?.[0]?.msg || data.error || 'Failed to add staff member.';
        setError(message);
        return;
      }

      setName('');
      setRole('');
      setStaff((current) => [...current, data.staff].sort((a, b) => a.name.localeCompare(b.name)));
    } catch (err) {
      setError('Unable to reach the server.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (staffId) => {
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/staff/${staffId}`, { method: 'DELETE' });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to remove staff member.');
        return;
      }

      setStaff((current) => current.filter((member) => member.id !== staffId));
    } catch (err) {
      setError('Unable to reach the server.');
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="page-header">
          <h1 className="auth-title">Manage Staff</h1>
          <p className="auth-copy">
            Add every staff member here so reporters can optionally select
            them when submitting a message. If a staff member is linked to
            an admin account, that admin will never see reports naming them.
          </p>
        </div>

        <form className="staff-manager-form" onSubmit={handleAdd}>
          <label className="form-group">
            <span>NAME</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              maxLength={200}
            />
          </label>

          <label className="form-group">
            <span>ROLE (OPTIONAL)</span>
            <input
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g. Teacher, Coach"
              maxLength={100}
            />
          </label>

          <button className="auth-button" type="submit" disabled={saving}>
            {saving ? 'Adding…' : 'Add Staff Member'}
          </button>
        </form>

        {error && <p className="form-error">{error}</p>}

        {loading ? (
          <p className="message-empty">Loading staff…</p>
        ) : staff.length === 0 ? (
          <p className="message-empty">No staff members added yet.</p>
        ) : (
          <ul className="staff-list">
            {staff.map((member) => (
              <li key={member.id} className="staff-row">
                <div>
                  <span className="staff-row-name">{member.name}</span>
                  {member.role && <span className="staff-row-role">{member.role}</span>}
                </div>
                <button
                  type="button"
                  className="staff-remove-btn"
                  onClick={() => handleRemove(member.id)}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="page-links-row">
          <Link to="/admin" className="auth-button">
            Back to Admin Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

export default StaffManager;
