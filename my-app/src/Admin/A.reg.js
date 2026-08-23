import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../form.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function AdminReg() {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isStaff, setIsStaff] = useState('');
    const [error, setError] = useState('');
    const [adminCount, setAdminCount] = useState(0);
    const [limitReached, setLimitReached] = useState(false);
    const navigate = useNavigate();

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
                        <input
                            className="auth-input"
                            type="password"
                            value={password}
                            disabled={limitReached}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Password"
                        />
                    </label>

                    <label className="auth-field">
                        Confirm Password
                        <input
                            className="auth-input"
                            type="password"
                            value={confirmPassword}
                            disabled={limitReached}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Confirm Password"
                        />
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

                    <div className="auth-link-row">
                        <Link className="auth-link" to="/admin/super">Back to Super Admin Portal</Link>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default AdminReg;