import React, { useEffect, useState } from 'react';
import './form.css';

function Admin() {
    const [unreadMessages, setUnreadMessages] = useState([]);
    const [readMessages, setReadMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [visibleCount, setVisibleCount] = useState(4);

    const fetchUnreadMessages = async () => {
        try {
            const response = await fetch('http://localhost:5000/api/messages/unread');
            const data = await response.json();

            if (data.success) {
                setUnreadMessages(data.messages || []);
            }
        } catch (error) {
            console.error('Failed to fetch unread messages:', error);
        } finally {
            setLoading(false);
        }
    };

    const markAsRead = async (messageId) => {
        const movedMessage = unreadMessages.find((message) => (message.id || message._id) === messageId);

        if (!movedMessage) {
            return;
        }

        try {
            const response = await fetch(`http://localhost:5000/api/messages/${messageId}/read`, {
                method: 'PATCH',
            });
            const data = await response.json();

            if (data.success) {
                setUnreadMessages((current) => current.filter((message) => (message.id || message._id) !== messageId));
                setReadMessages((current) => [{ ...movedMessage, ...data.message }, ...current]);
            }
        } catch (error) {
            console.error('Failed to mark message as read:', error);
        }
    };

    const markAllAsRead = async () => {
        // optimistic UI update
        const toMark = unreadMessages.map((m) => (m.id || m._id));
        if (toMark.length === 0) return;

        // Move all locally first
        setReadMessages((current) => [...unreadMessages.map((m) => ({ ...m, isRead: true, readAt: new Date().toISOString() })), ...current]);
        setUnreadMessages([]);

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

    const loadMore = () => setVisibleCount((c) => c + 4);

    useEffect(() => {
        fetchUnreadMessages();
    }, []);

    return (
        <div className="auth-shell">
            <div className="auth-card">
                <h1 className="auth-title">Admin Dashboard</h1>
                <p className="auth-copy">New safeguarding messages appear here until they are reviewed.</p>

                <div className="message-columns">
                    <section className="message-section">
                        <div className="message-header">
                            <h2 className="auth-subtitle">Unread Messages</h2>
                            <div className="header-controls">
                                <span className="unread-badge">{unreadMessages.length} Total</span>
                                <button className="mark-all-link" onClick={markAllAsRead}>Mark all as read</button>
                            </div>
                        </div>
                        {loading ? (
                            <p className="message-empty">Loading messages...</p>
                        ) : unreadMessages.length === 0 ? (
                            <p className="message-empty">No unread messages at the moment.</p>
                        ) : (
                            <ul className="message-list">
                                {unreadMessages.slice(0, visibleCount).map((message) => (
                                    <li key={message.id || message._id} className="message-item">
                                        <div>
                                            <div className="message-topline">
                                                <span className="status-dot" />
                                                <strong className="message-topic">{message.topic}</strong>
                                            </div>
                                            <p className="message-body">{message.message}</p>
                                            <div className="message-meta">ID: {message.id || message._id} • {new Date(message.createdAt || message.readAt || Date.now()).toLocaleString()}</div>
                                        </div>
                                        <button className="auth-button" type="button" onClick={() => markAsRead(message.id || message._id)}>
                                            Mark as Read
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                        {unreadMessages.length > visibleCount && (
                            <div className="load-more-wrap">
                                <button className="load-more-btn" onClick={loadMore}>Load More Entries</button>
                            </div>
                        )}
                    </section>

                    <section className="message-section">
                        <h2 className="auth-subtitle">Read Messages</h2>
                        {readMessages.length === 0 ? (
                            <p className="message-empty">Read messages will appear here after you review them.</p>
                        ) : (
                            <ul className="message-list">
                                {readMessages.map((message) => (
                                    <li key={message.id || message._id} className="message-item read-item">
                                        <div>
                                            <strong>{message.topic}</strong>
                                            <p>{message.message}</p>
                                            <div className="message-meta">ID: {message.id || message._id} • {new Date(message.readAt || message.createdAt || Date.now()).toLocaleString()}</div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </section>
                </div>
            </div>
        </div>
    );
}

export default Admin;