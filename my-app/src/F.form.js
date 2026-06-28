import React from 'react';
import './form.css';

function SafeGuardingForm() {
  return (
    <div className="form-container">

      <div className="security-banner">
        🔒 END-TO-END ENCRYPTION ACTIVE • ZERO-KNOWLEDGE PROTOCOL
      </div>

      <div className="form-card">

        <h2>FOLLOW UP MESSAGE</h2>
        <p className="subtitle">
          Compose your secure transmission. All metadata is stripped upon departure.
        </p>

        <form>

          <label className="form-group">
            <span>FOLLOW UP TOPIC</span>
            <input
              type="text"
              name="topic"
              placeholder="e.g., Safeguarding Report"
            />
          </label>

          <label className="form-group">
            <span>MESSAGE</span>
            <textarea
              name="message"
              placeholder="Type your confidential message here..."
              rows="6"
            />
          </label>

          <div className="form-actions">

            <button type="button" className="back-btn" >
              ← Back
            </button>

            <button type="submit" className="send-btn">
              Send Anonymously →
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

export default SafeGuardingForm;