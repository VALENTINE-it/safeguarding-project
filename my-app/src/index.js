import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './index.css';
import reportWebVitals from './reportWebVitals';
import FollowUpForm from './F.form';
import NewMessageForm from './N.form';
import Admin from './admin';

function SafeGuardingApp() {
  const [showForm, setShowForm] = useState(false);
  const [selectedPath, setSelectedPath] = useState('new');
  

  const FormComponent = selectedPath === 'follow' ? FollowUpForm : NewMessageForm;

  return (
    <>
      <div className="Header">
        <h1>🛡️ SAFEGUARDING</h1>
      </div>

      <div className="Body">
        <div className="Intro">
          <h1 className="h1">Secure Communication, Complete Privacy</h1>
<p>A safe and private space to share your concerns. Your identity is protected, and your voice matters.</p> 
</div>

        {showForm ? (
         <FormComponent onBack={() => setShowForm(false)} />
        ) : (
          <div>
            <div className="card">
              <h3>Start Here</h3>
              <p>Choose how you’d like to continue.</p>

              <label className="option">
                <input
                  type="radio"
                  name="path"
                  value="new"
                  checked={selectedPath === 'new'}
                  onChange={() => setSelectedPath('new')}
                />
                <div>
                  <div className="option-title">Send a New Message</div>
                  <div className="option-desc">Start a private and secure conversation.</div>
                </div>
              </label>

              <label className="option">
                <input
                  type="radio"
                  name="path"
                  value="follow"
                  checked={selectedPath === 'follow'}
                  onChange={() => setSelectedPath('follow')}
                />
                <div>
                  <div className="option-title">Follow Up on a Message</div>
                  <div className="option-desc">Check updates using your reference code.</div>
                </div>
              </label>

              <button type="button" onClick={() => setShowForm(true)} className="start-btn">
                Continue
              </button>

              <div className="badge">🔒 Anonymous Messaging</div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<SafeGuardingApp />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </BrowserRouter>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
