import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import GoogleAuthButton from './GoogleAuthButton';
import '../form.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function AdminReg() {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isStaff, setIsStaff] = useState('');
    const [error, setError] = useState('');
    const [adminCount, setAdminCount] = useState(0);
    const [limitReached, setLimitReached] = useState(false);
    const navigate = useNavigate();

    const handleGoogleSuccess = async (credential) => {
        setError('');
        if (limitReached || adminCount >= 3) {
            setError('Admin registration limit reached. Maximum of 3 administrator accounts allowed.');
            return;
        }

        try {
            const response = await fetch(`${API_URL}/api/auth/google`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ credential, isStaff: isStaff || 'NO' }),
            });
            const data = await response.json();

            if (!response.ok) {
                const message = data.error || 'Unable to register admin with Google.';
                setError(message);
                if (response.status === 403) {
                    setLimitReached(true);
                }
                return;
            }

            navigate('/admin/super');
        } catch (err) {
            console.error('Google registration error:', err);
            setError('Unable to reach server. Please try again later.');
        }
    };

    useEffect(() => {
        async function loadInitialData() {
            try {
                // Check regular admin count and limit (max 3)
                const authRes = await fetch(`${API_URL}/api/auth/admins`);
                const authData = await authRes.json();
                if (authData.success) {
                    setAdminCount(authData.count || 0);
                    if (authData.limitReached || authData.count >= 3) {
                        setLimitReached(true);
                        setError('Admin registration limit reached. Maximum of 3 administrator accounts allowed.');
                    }
                }
            } catch (err) {
                console.error('Failed to load initial registration data:', err);
            }
        }

        loadInitialData();
    }, []);

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError('');

        if (limitReached || adminCount >= 3) {
            setError('Admin registration limit reached. Maximum of 3 administrator accounts allowed.');
            return;
        }

        if (!username || !email || !password || !confirmPassword || !isStaff) {
            setError('Please fill in all fields.');
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        try {
            const response = await fetch(`${API_URL}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password, isStaff }),
            });
            const data = await response.json();

            if (!response.ok) {
                const message = data.error || data.errors?.[0]?.msg || 'Unable to register admin.';
                setError(message);
                if (response.status === 403) {
                    setLimitReached(true);
                }
                return;
            }

            navigate('/admin/super');
        } catch (err) {
            console.error('Registration error:', err);
            setError('Unable to reach server. Please try again later.');
        }
    };

    return (
        <div className="auth-shell">
            <div className="auth-card">
                <h1 className="auth-title">Admin Registration</h1>
                <p className="auth-copy">Create a secure administrator account to manage safeguarding operations.</p>

                {limitReached && (
                    <div className="registration-limit-warning" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #f87171', padding: '14px 18px', borderRadius: '12px', marginBottom: '1.25rem', color: '#ef4444' }}>
                        <strong style={{ display: 'block', fontSize: '1rem' }}>Registered Admin Limit Alert</strong>
                        <p style={{ margin: '4px 0 0', fontSize: '0.88rem' }}>Maximum limit of 3 administrator accounts reached ({adminCount}/3 registered). New registrations are closed.</p>
                    </div>
                )}

                <form className="auth-form" onSubmit={handleSubmit}>
                    <label className="auth-field">
                        Username
                        <input
                            className="auth-input"
                            type="text"
                            value={username}
                            disabled={limitReached}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Username"
                        />
                    </label>

                    <label className="auth-field">
                        Email
                        <input
                            className="auth-input"
                            type="email"
                            value={email}
                            disabled={limitReached}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Email"
                        />
                    </label>

                    <label className="auth-field">
                        Password
                        <div className="password-input-wrap">
                            <input
                                className="auth-input"
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                disabled={limitReached}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Password"
                            />
                            <button
                                type="button"
                                className="password-toggle-btn"
                                onClick={() => setShowPassword(!showPassword)}
                                title={showPassword ? 'Hide password' : 'Show password'}
                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                            >
                                {showPassword ? (
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                                        <line x1="1" y1="1" x2="23" y2="23"></line>
                                    </svg>
                                ) : (
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                        <circle cx="12" cy="12" r="3"></circle>
                                    </svg>
                                )}
                            </button>
                        </div>
                    </label>

                    <label className="auth-field">
                        Confirm Password
                        <div className="password-input-wrap">
                            <input
                                className="auth-input"
                                type={showConfirmPassword ? 'text' : 'password'}
                                value={confirmPassword}
                                disabled={limitReached}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Confirm Password"
                            />
                            <button
                                type="button"
                                className="password-toggle-btn"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                title={showConfirmPassword ? 'Hide password' : 'Show password'}
                                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                            >
                                {showConfirmPassword ? (
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                                        <line x1="1" y1="1" x2="23" y2="23"></line>
                                    </svg>
                                ) : (
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                        <circle cx="12" cy="12" r="3"></circle>
                                    </svg>
                                )}
                            </button>
                        </div>
                    </label>

                    <label className="auth-field">
                        Are you also a staff member?
                        <select
                            className="auth-input"
                            value={isStaff}
                            disabled={limitReached}
                            onChange={(e) => setIsStaff(e.target.value)}
                        >
                            <option value="">Select YES or NO</option>
                            <option value="YES">YES</option>
                            <option value="NO">NO</option>
                        </select>
                    </label>

                    {error && <p className="form-error">{error}</p>}
                    <button className="auth-button" type="submit" disabled={limitReached}>
                        {limitReached ? 'Registration Closed' : 'Register Admin'}
                    </button>

                    <div className="auth-divider">
                        <span>OR</span>
                    </div>

                    <GoogleAuthButton
                        text="signup_with"
                        disabled={limitReached}
                        onSuccess={handleGoogleSuccess}
                        onError={(errMsg) => setError(errMsg)}
                    />

                    <div className="auth-link-row">
                        <Link className="auth-link" to="/admin/super">Back to Super Admin Portal</Link>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default AdminReg;