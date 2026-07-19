import React, { useEffect, useState } from 'react';
import './form.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function CopyText({ text }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="copy-container">
      <code>{text}</code>
      <button onClick={handleCopy} className="copy-btn">
        {copied ? 'Copied!' : 'Copy'}
      </button>
    </div>
  );
}

function NewMessageForm({ onBack }) {
  const [topic, setTopic] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('idle');
  const [threadToken, setThreadToken] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [staffList, setStaffList] = useState([]);
  const [reportedStaff, setReportedStaff] = useState('');

  useEffect(() => {
    async function loadStaff() {
      try {
        const res = await fetch(`${API_URL}/api/staff`);
        const data = await res.json();
        if (data.success) {
          setStaffList(data.staff || []);
        }
      } catch (err) {
        // If the staff directory can't be loaded, the reporter can still
        // submit a general report without naming anyone specific.
        console.error('Failed to load staff list:', err);
      }
    }

    loadStaff();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('loading');
    setErrorMsg('');

    try {
      const res = await fetch(`${API_URL}/api/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, message, reportedStaff: reportedStaff || undefined }),
      });

      const data = await res.json();

      if (!res.ok) {
        const msg =
          data.errors?.[0]?.msg ||
          data.error ||
          'Something went wrong. Please try again.';
        setErrorMsg(msg);
        setStatus('error');
        return;
      }

      setThreadToken(data.threadToken);
      setStatus('success');
    } catch (err) {
      setErrorMsg('Network error. Please check your connection and try again.');
      setStatus('error');
    }
  };

  if (status === 'success') {
    return (
      <div className="form-container">
        <div className="security-banner">
          🔒 END-TO-END ENCRYPTION ACTIVE • ZERO-KNOWLEDGE PROTOCOL
        </div>

        <div className="form-card">
          <h2>✅ Message Sent</h2>
          <p className="subtitle">
            Your message has been delivered securely. Copy your token below —
            it is the only way to follow up on this thread.
          </p>

          <div className="token-box">
            <strong>🔑 Your Secure Thread Token</strong>
            <CopyText text={threadToken} />
            <p className="token-note">
              Copy this token and keep it safe. It will not be shown again.
            </p>
          </div>

          <button type="button" className="back-btn" onClick={onBack}>
            ← Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="form-container">
      <div className="security-banner">
        🔒 END-TO-END ENCRYPTION ACTIVE • ZERO-KNOWLEDGE PROTOCOL
      </div>

      <div className="form-card">
        <h2>New Message</h2>
        <p className="subtitle">
          Share your concern safely and privately. Your identity is protected.
        </p>

        <form onSubmit={handleSubmit}>
          <label className="form-group">
            <span>TOPIC</span>
            <input
              type="text"
              name="topic"
              placeholder="e.g. Briefly describe what this is about"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              required
              maxLength={200}
            />
          </label>

          <label className="form-group">
            <span>MESSAGE</span>
            <textarea
              name="message"
              placeholder="Share what happened..."
              rows="6"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              maxLength={5000}
            />
          </label>

          <label className="form-group">
            <span>IS THIS ABOUT A SPECIFIC STAFF MEMBER? (OPTIONAL)</span>
            <select
              name="reportedStaff"
              value={reportedStaff}
              onChange={(e) => setReportedStaff(e.target.value)}
            >
              <option value="">Not about a specific staff member</option>
              {staffList.map((staffMember) => (
                <option key={staffMember.id} value={staffMember.id}>
                  {staffMember.name}
                  {staffMember.role ? ` — ${staffMember.role}` : ''}
                </option>
              ))}
            </select>
            <p className="field-hint">
              If your report is about a staff member, selecting them here
              ensures they will never be able to view this message, even if
              they have admin access.
            </p>
          </label>

          {status === 'error' && (
            <div className="error-banner">⚠️ {errorMsg}</div>
          )}

          <div className="form-actions">
            <button type="button" className="back-btn" onClick={onBack}>
              ← Go Back
            </button>

            <button
              type="submit"
              className="send-btn"
              disabled={status === 'loading'}
            >
              {status === 'loading' ? 'Sending…' : 'Send Anonymously →'}
            </button>
          </div>
        </form>
      </div>

      <div className="info-section">
        <div className="info-card">
          <h4>🛡️ Identity Masking</h4>
          <p>Your IP address and device info are hidden.</p>
        </div>

        <div className="info-card">
          <h4>🔥 Self-Destruction</h4>
          <p>This message will be deleted after being read.</p>
        </div>
      </div>
    </div>
  );
}

export default NewMessageForm;