import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import './form.css';

function AdminLogin() {
  return (
    <div className="auth-shell">
      <div className="auth-card">
        <h1 className="auth-title">Admin Page</h1>
        <p className="auth-copy">Welcome to the admin area. Manage the application and review reports from one secure place.</p>

        <h2 className="auth-subtitle">Login to Admin Page</h2>

        <form className="auth-form">
          <label className="auth-field">
            Username/Email
            <input className="auth-input" type="text" name="username" placeholder="Enter your username or email" />
          </label>

          <label className="auth-field">
            Password
            <input className="auth-input" type="password" name="password" placeholder="Enter your password" />
          </label>

          <button className="auth-button" type="submit">Login</button>

          <div className="auth-link-row">
            <a className="auth-link" href="#">Reset Password</a>
            <a className="auth-link" href="#">Create Account</a>
          </div>
        </form>
      </div>
    </div>
  );
}