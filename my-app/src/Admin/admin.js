import React, { useEffect, useState } from 'react';
import './form.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function Admin() {
    const [unreadMessages, setUnreadMessages] = useState([]);
    const [readMessages, setReadMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [adminName, setAdminName] = useState('Admin');

    const fetchUnreadMessages = async () => {
        try {
            const response = await fetch(`${API_URL}/api/messages/unread`);
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
        try {
            const response = await fetch(`${API_URL}/api/messages/${messageId}/read`, {
                method: 'PATCH',
            });
            const data = await response.json();

            if (data.success) {
                const movedMessage = unreadMessages.find((message) => (message.id || message._id) === messageId);
                if (movedMessage) {
                    setUnreadMessages((current) => current.filter((message) => (message.id || message._id) !== messageId));
                    setReadMessages((current) => [data.message, ...current]);
                }
            }
        } catch (error) {
            console.error('Failed to mark message as read:', error);
        }
    };

    useEffect(() => {
        const storedAdmin = localStorage.getItem('adminUser');
        if (storedAdmin) {
            try {
                const parsedAdmin = JSON.parse(storedAdmin);
                setAdminName(parsedAdmin.username || parsedAdmin.email || 'Admin');
            } catch (error) {
                console.error('Failed to parse admin user:', error);
            }
        }

        fetchUnreadMessages();
    }, []);

    return (
        <div className="auth-shell">
            <div className="auth-card">
                <h1 className="auth-title">Welcome back, {adminName}</h1>
                <p className="auth-copy">New safeguarding messages appear here until they are reviewed.</p>

                <section className="message-section">
                    <h2 className="auth-subtitle">Unread Messages</h2>
                    {loading ? (
                        <p className="message-empty">Loading messages...</p>
                    ) : unreadMessages.length === 0 ? (
                        <p className="message-empty">No unread messages at the moment.</p>
                    ) : (
                        <ul className="message-list">
                            {unreadMessages.map((message) => (
                                <li key={message.id || message._id} className="message-item">
                                    <div>
                                        <strong>{message.topic}</strong>
                                        <p>{message.message}</p>
                                    </div>
                                    <button className="auth-button" type="button" onClick={() => markAsRead(message.id || message._id)}>
                                        Mark as Read
                                    </button>
                                </li>
                            ))}
                        </ul>
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
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            </div>
        </div>
    );
}

export default Admin;