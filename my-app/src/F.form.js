import React, { useState } from 'react';
import './form.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function FollowUpForm({ onBack }) {
  const [token, setToken] = useState('');
  const [topic, setTopic] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState('idle'); // idle | loading | success | error
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('loading');
    setErrorMsg('');

    const trimmedToken = token.trim();

    try {
      const res = await fetch(
        `${API_URL}/api/threads/${encodeURIComponent(trimmedToken)}/reply`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topic, message }),
        }
      );

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
          <h2>✅ Follow-Up Sent</h2>
          <p className="subtitle">
            Your follow-up message has been securely added to the thread.
          </p>
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
        <h2>Follow Up on Your Message</h2>
        <p className="subtitle">Use your reference code to continue your conversation safely and privately. </p>

        <form onSubmit={handleSubmit}>
          <label className="form-group">
            <span>Reference Code</span>
            <input
              type="text"
              name="token"
              placeholder="Paste your secure token here"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              required
            />
          </label>

          <label className="form-group">
            <span>FOLLOW UP TOPIC</span>
            <input
              type="text"
              name="topic"
              placeholder="e.g. What is this follow-up about?"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              required
              maxLength={200}
            />
          </label>

          <label className="form-group">
            <span>Your message</span>
            <textarea
              name="message"
              placeholder="Add any new information or updates here..."
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
              {status === 'loading' ? 'Sending…' : 'Submit updates →'}
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

export default FollowUpForm;
