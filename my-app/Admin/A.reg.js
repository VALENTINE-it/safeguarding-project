import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import './form.css';

function AdminReg() {
    return (
        <div className="auth-shell">
            <div className="auth-card">
                <h1 className="auth-title">Admin Registration</h1>
                <p className="auth-copy">Create a secure administrator account to manage safeguarding operations.</p>

                <form className="auth-form">
                    <label className="auth-field">
                        Username
                        <input className="auth-input" type="text" placeholder="Username" />
                    </label>

                    <label className="auth-field">
                        Email
                        <input className="auth-input" type="email" placeholder="Email" />
                    </label>

                    <label className="auth-field">
                        Password
                        <input className="auth-input" type="password" placeholder="Password" />
                    </label>

                    <label className="auth-field">
                        Confirm Password
                        <input className="auth-input" type="password" placeholder="Confirm Password" />
                    </label>

                    <button className="auth-button" type="submit">Register</button>
                </form>
            </div>
        </div>
    );
}