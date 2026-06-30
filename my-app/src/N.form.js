import React, { useState } from 'react';
import './form.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function NewMessageForm({ onBack }) {
  const [topic, setTopic] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('idle'); 
  const [threadToken, setThreadToken] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('loading');
    setErrorMsg('');

    try {
      const res = await fetch(`${API_URL}/api/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, message }),
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
            Your message has been delivered securely. Save your token below —
            it is the only way to follow up on this thread.
          </p>
          <div className="token-box">
            <strong>🔑 Your Secure Thread Token</strong>
            <code>{threadToken}</code>
            <p className="token-note">
              Copy this token and keep it safe. It will not be shown again.
            </p>
          </div>
          <button type="button" className="back-btn" onClick={-1}>
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
          Compose your secure transmission. All metadata is stripped upon departure.
        </p>

        <form onSubmit={handleSubmit}>
          <label className="form-group">
            <span>TOPIC</span>
            <input
              type="text"
              name="topic"
              placeholder="e.g. New Safeguarding Report"
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
              placeholder="Type your confidential message here..."
              rows="6"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              maxLength={5000}
            />
          </label>

          {status === 'error' && (
            <div className="error-banner">⚠️ {errorMsg}</div>
          )}

          <div className="form-actions">
            <button type="button" className="back-btn" onClick={onBack}>
              ← Back
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
