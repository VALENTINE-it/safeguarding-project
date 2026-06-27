import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import reportWebVitals from './reportWebVitals';

function SafeGuardingApp() {
  return (

    <>
    <div className="Header">
     <h1>🛡️ SAFEGUARDING</h1>
    </div>

    <div className="Body">
    <div className="Intro">
      <h1 className="H1">Secure communication, Absolute Privacy</h1>
      <p>A minimalist space for high-stakes messaging. No metadata tracking, no data harvesting. Just clarity.</p>
    </div>

    <div>
      <div className="card">
  <h3>Initiate Transmission</h3>
  <p>Select your messaging path to continue.</p>

  <label className="option">
    <input type="radio" name="path" value="new" defaultChecked />
    <div>
      <div className="option-title">New Message</div>
      <div className="option-desc">Start a clean, encrypted conversation thread.</div>
    </div>
  </label>

  <label className="option">
    <input type="radio" name="path" value="follow" />
    <div>
      <div className="option-title">Follow up</div>
      <div className="option-desc">Access an existing thread via Secure Token.</div>
    </div>
  </label>

  <a href="https://valentine-profile.netlify.app/">
    <button>Continue</button>
  </a>

  <div className="badge">🔒 Anonymous Messaging</div>
</div>

    </div>
    </div>

    </>
  )
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <SafeGuardingApp />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
