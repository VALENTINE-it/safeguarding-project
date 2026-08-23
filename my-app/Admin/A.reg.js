import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../form.css';

function AdminReg() {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isStaff, setIsStaff] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = (event) => {
        event.preventDefault();
        setError('');

        if (!username || !email || !password || !confirmPassword || !isStaff) {
            setError('Please fill in all fields.');
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        const users = JSON.parse(localStorage.getItem('adminUsers') || '[]');
        const exists = users.some((user) => user.username === username || user.email === email);

        if (exists) {
            setError('An account with that username or email already exists.');
            return;
        }

        const newUser = { username, email, password, isStaff };
        localStorage.setItem('adminUsers', JSON.stringify([...users, newUser]));
        navigate('/admin/login');
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
                        Are you also a staff member?
                        <select
                            className="auth-input"
                            value={isStaff}
                            onChange={(e) => setIsStaff(e.target.value)}
                        >
                            <option value="">Select YES or NO</option>
                            <option value="YES">YES</option>
                            <option value="NO">NO</option>
                        </select>
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