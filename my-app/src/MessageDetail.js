import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import './form.css';

const API_BASE = 'http://localhost:5000';

function MessageDetail() {
  const { messageId } = useParams();
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [staffId, setStaffId] = useState('');

  useEffect(() => {
    async function fetchMessage() {
      try {
        const params = new URLSearchParams();
        const storedAdmin = localStorage.getItem('adminUser');
        if (storedAdmin) {
          try {
            const parsedAdmin = JSON.parse(storedAdmin);
            const currentStaffId = parsedAdmin.staffId || '';
            setStaffId(currentStaffId);
            if (currentStaffId) params.append('staffId', currentStaffId);
          } catch (parseErr) {
            console.error('Failed to parse admin user:', parseErr);
          }
        }

        const response = await fetch(`${API_BASE}/api/messages/${messageId}?${params.toString()}`);
        const data = await response.json();

        if (response.ok && data.success) {
          setMessage(data.message);
        } else {
          setError(data.error || 'Could not load the message.');
        }
      } catch (err) {
        setError(err.message ? `Unable to reach the server: ${err.message}` : 'Unable to reach the server.');
      } finally {
        setLoading(false);
      }
    }

    fetchMessage();
  }, [messageId]);

  const markAsRead = async () => {
    if (!message || message.isRead) return;
    setSaving(true);

    try {
      const params = new URLSearchParams();
      if (staffId) params.append('staffId', staffId);
      const response = await fetch(`${API_BASE}/api/messages/${messageId}/read?${params.toString()}`, {
        method: 'PATCH',
      });
      const data = await response.json();

      if (response.ok && data.success) {
        setMessage((current) => ({ ...current, ...data.message }));
      } else {
        setError(data.error || 'Failed to mark as read.');
      }
    } catch (err) {
      setError('Unable to reach the server.');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (value) => {
    if (!value) return '-';
    return new Date(value).toLocaleString();
  };

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="page-header">
          <h1 className="auth-title">Message Details</h1>
          <p className="auth-copy">Read the full message and review the metadata safely.</p>
        </div>

        {loading ? (
          <p className="message-empty">Loading message...</p>
        ) : error ? (
          <p className="message-empty">{error}</p>
        ) : (
          <div className="message-detail-card">
            <div className="detail-row">
              <span className="detail-label">Topic</span>
              <span>{message.topic}</span>
            </div>
            {message.reportedStaff && (
              <div className="detail-row">
                <span className="detail-label">Reported staff member</span>
                <span>
                  {message.reportedStaff.name}
                  {message.reportedStaff.role ? ` (${message.reportedStaff.role})` : ''}
                </span>
              </div>
            )}
            <div className="detail-row">
              <span className="detail-label">Message</span>
              <span className="detail-body">{message.message}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Status</span>
              <span>{message.isRead ? 'Read' : 'New message'}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Created</span>
              <span>{formatDate(message.createdAt)}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Last updated</span>
              <span>{formatDate(message.readAt || message.updatedAt)}</span>
            </div>
            {!message.isRead && (
              <button type="button" className="auth-button" onClick={markAsRead} disabled={saving}>
                {saving ? 'Marking...' : 'Mark as Read'}
              </button>
            )}
          </div>
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

export default MessageDetail;
