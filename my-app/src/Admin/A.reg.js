import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../form.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function AdminReg() {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [staffId, setStaffId] = useState('');
    const [staffList, setStaffList] = useState([]);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        async function loadStaff() {
            try {
                const res = await fetch(`${API_URL}/api/staff`);
                const data = await res.json();
                if (data.success) {
                    setStaffList(data.staff || []);
                }
            } catch (err) {
                console.error('Failed to load staff list:', err);
            }
        }

        loadStaff();
    }, []);

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError('');

        if (!username || !email || !password || !confirmPassword) {
            setError('Please fill in all fields.');
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        try {
            const response = await fetch('http://localhost:5000/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password, staffId: staffId || undefined }),
            });
            const data = await response.json();

            if (!response.ok) {
                const message = data.error || data.errors?.[0]?.msg || 'Unable to register admin.';
                setError(message);
                return;
            }

            navigate('/admin/login');
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

                <form className="auth-form" onSubmit={handleSubmit}>
                    <label className="auth-field">
                        Username
                        <input
                            className="auth-input"
                            type="text"
                            value={username}
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
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Confirm Password"
                        />
                    </label>

                    <label className="auth-field">
                        Are you also a staff member? (optional)
                        <select
                            className="auth-input"
                            value={staffId}
                            onChange={(e) => setStaffId(e.target.value)}
                        >
                            <option value="">Not applicable</option>
                            {staffList.map((member) => (
                                <option key={member.id} value={member.id}>
                                    {member.name}
                                    {member.role ? ` — ${member.role}` : ''}
                                </option>
                            ))}
                        </select>
                        <p className="field-hint">
                            Linking your account to your staff record means you will never
                            see any report submitted about yourself.
                        </p>
                    </label>

                    {error && <p className="form-error">{error}</p>}
                    <button className="auth-button" type="submit">Register</button>

                    <div className="auth-link-row">
                        <Link className="auth-link" to="/admin/login">Already have an account? Login</Link>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default AdminReg;