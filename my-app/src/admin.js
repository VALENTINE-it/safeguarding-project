import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './form.css';

function Admin() {
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [visibleCount, setVisibleCount] = useState(8);
    const [searchToken, setSearchToken] = useState('');
    const [selectedDate, setSelectedDate] = useState('');
    const [adminName, setAdminName] = useState('Admin');

    const fetchMessages = useCallback(async (token = searchToken, date = selectedDate) => {
        setLoading(true);

        try {
            const params = new URLSearchParams();
            if (token.trim()) params.append('threadToken', token.trim());
            if (date) params.append('date', date);

            const response = await fetch(`http://localhost:5000/api/messages?${params.toString()}`);
            const data = await response.json();

            if (data.success) {
                setMessages(data.messages || []);
            }
        } catch (error) {
            console.error('Failed to fetch messages:', error);
        } finally {
            setLoading(false);
        }
    }, [searchToken, selectedDate]);

    const markAsRead = async (messageId) => {
        try {
            const response = await fetch(`http://localhost:5000/api/messages/${messageId}/read`, {
                method: 'PATCH',
            });
            const data = await response.json();

            if (data.success) {
                setMessages((current) =>
                    current.map((message) =>
                        (message.id || message._id) === messageId ? { ...message, ...data.message } : message
                    )
                );
            }
        } catch (error) {
            console.error('Failed to mark message as read:', error);
        }
    };

    const markAllAsRead = async () => {
        if (messages.length === 0) return;

        setMessages((current) =>
            current.map((message) => ({ ...message, isRead: true, readAt: new Date().toISOString() }))
        );

        try {
            const response = await fetch('http://localhost:5000/api/messages/mark-all-read', { method: 'PATCH' });
            const data = await response.json();
            if (!data.success) {
                console.warn('mark-all-read returned non-success', data);
            }
        } catch (err) {
            console.error('Failed to mark all as read on server:', err);
        }
    };

    const handleSearch = () => {
        fetchMessages(searchToken, selectedDate);
    };

    const handleDateChange = (event) => {
        const value = event.target.value;
        setSelectedDate(value);
        fetchMessages(searchToken, value);
    };

    const loadMore = () => setVisibleCount((c) => c + 8);

    const navigate = useNavigate();

    useEffect(() => {
        const adminAuth = localStorage.getItem('adminAuth');
        if (!adminAuth) {
            navigate('/admin/login');
            return;
        }

        const storedAdmin = localStorage.getItem('adminUser');
        if (storedAdmin) {
            try {
                const parsedAdmin = JSON.parse(storedAdmin);
                setAdminName(parsedAdmin.username || parsedAdmin.email || 'Admin');
            } catch (error) {
                console.error('Failed to parse admin user:', error);
            }
        }

        fetchMessages();
    }, [fetchMessages, navigate]);

    return (
        <div className="auth-shell">
            <div className="auth-card">
                <h1 className="auth-title">Welcome back, {adminName}</h1>
                <p className="auth-copy">New safeguarding messages appear here until they are reviewed.</p>

                <div className="message-columns single-column">
                    <section className="message-section">
                        <div className="message-header">
                            <h2 className="auth-subtitle">All Messages</h2>
                            <div className="header-controls">
                                <span className="unread-badge">{messages.length} Total</span>
                        <div className="header-actions">
                            <button className="mark-all-link" onClick={markAllAsRead}>Mark all as read</button>
                            <button className="auth-button logout-button" type="button" onClick={() => {
                                localStorage.removeItem('adminAuth');
                                localStorage.removeItem('adminUser');
                                navigate('/admin/login');
                            }}>
                                Logout
                            </button>
                        </div>
                    </div>
                </div>

                        <div className="admin-controls">
                            <div className="search-panel">
                                <input
                                    className="search-input"
                                    type="text"
                                    value={searchToken}
                                    placeholder="Search by thread token"
                                    onChange={(e) => setSearchToken(e.target.value)}
                                />
                                <button className="search-button" type="button" onClick={handleSearch}>
                                    Search
                                </button>
                            </div>

                            <div className="filter-panel">
                                <label htmlFor="dateFilter">Filter by date</label>
                                <input
                                    id="dateFilter"
                                    className="filter-select"
                                    type="date"
                                    value={selectedDate}
                                    onChange={handleDateChange}
                                />
                            </div>
                        </div>

                        {loading ? (
                            <p className="message-empty">Loading messages...</p>
                        ) : messages.length === 0 ? (
                            <p className="message-empty">No messages match your criteria.</p>
                        ) : (
                            <ul className="message-list">
                                {messages.slice(0, visibleCount).map((message) => {
                                    const isRead = !!message.isRead;
                                    return (
                                        <li
                                            key={message.id || message._id}
                                            className={`message-item ${isRead ? 'read-item' : 'unread-item'}`}
                                        >
                                            <Link to={`/message/${message.id || message._id}`} className="message-link">
                                                <div>
                                                    <div className="message-topline">
                                                        {!isRead && <span className="status-dot" />}
                                                        <strong className="message-topic">{message.topic}</strong>
                                                    </div>
                                                    <p className="message-body">{message.message}</p>
                                                    <div className="message-meta">
                                                        Token: {message.threadToken} • ID: {message.id || message._id} • {new Date(message.createdAt || message.readAt || Date.now()).toLocaleString()}
                                                    </div>
                                                </div>
                                            </Link>
                                            {!isRead && (
                                                <button
                                                    className="auth-button mark-read-btn"
                                                    type="button"
                                                    onClick={() => markAsRead(message.id || message._id)}
                                                >
                                                    Mark as Read
                                                </button>
                                            )}
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                        {messages.length > visibleCount && (
                            <div className="load-more-wrap">
                                <button className="load-more-btn" onClick={loadMore}>Load More Entries</button>
                            </div>
                        )}
                    </section>
                </div>
            </div>
        </div>
    );
}

export default Admin;