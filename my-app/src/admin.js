import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './form.css';

function Admin() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchToken, setSearchToken] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [adminName, setAdminName] = useState('Admin');
  const [adminId, setAdminId] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'unread' | 'read'
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('adminTheme') || 'light';
  });
  const [copiedToken, setCopiedToken] = useState('');

  const navigate = useNavigate();

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    localStorage.setItem('adminTheme', nextTheme);
  };

  const fetchMessages = useCallback(async (token = searchToken, date = selectedDate, currentAdminId = adminId) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (token.trim()) params.append('threadToken', token.trim());
      if (date) params.append('date', date);
      if (currentAdminId) params.append('adminId', currentAdminId);

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
  }, [searchToken, selectedDate, adminId]);

  const markAsRead = async (messageId) => {
    try {
      const params = new URLSearchParams();
      if (adminId) params.append('adminId', adminId);

      const response = await fetch(
        `http://localhost:5000/api/messages/${messageId}/read?${params.toString()}`,
        { method: 'PATCH' }
      );
      const data = await response.json();

      if (data.success) {
        setMessages((current) =>
          current.map((message) =>
            (message.id || message._id) === messageId ? { ...message, ...data.message, isRead: true } : message
          )
        );
      }
    } catch (error) {
      console.error('Failed to mark message as read:', error);
    }
  };

  const markAllAsRead = async () => {
    const unreadCount = messages.filter(m => !m.isRead).length;
    if (unreadCount === 0) return;

    setMessages((current) =>
      current.map((message) => ({ ...message, isRead: true, readAt: new Date().toISOString() }))
    );

    try {
      const params = new URLSearchParams();
      if (adminId) params.append('adminId', adminId);
      const response = await fetch(`http://localhost:5000/api/messages/mark-all-read?${params.toString()}`, { method: 'PATCH' });
      const data = await response.json();
      if (!data.success) {
        console.warn('mark-all-read returned non-success', data);
      }
    } catch (err) {
      console.error('Failed to mark all as read on server:', err);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchMessages(searchToken, selectedDate);
  };

  const handleDateChange = (event) => {
    const value = event.target.value;
    setSelectedDate(value);
    fetchMessages(searchToken, value);
  };

  const clearFilters = () => {
    setSearchToken('');
    setSelectedDate('');
    fetchMessages('', '');
  };

  const handleCopyToken = (token, e) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(token);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(''), 2000);
  };

  useEffect(() => {
    const adminAuth = localStorage.getItem('adminAuth');
    if (!adminAuth) {
      navigate('/admin/login');
      return;
    }

    let currentAdminId = '';
    const storedAdmin = localStorage.getItem('adminUser');
    if (storedAdmin) {
      try {
        const parsedAdmin = JSON.parse(storedAdmin);
        setAdminName(parsedAdmin.username || parsedAdmin.email || 'Admin');
        currentAdminId = parsedAdmin.id || parsedAdmin._id || '';
        setAdminId(currentAdminId);
      } catch (error) {
        console.error('Failed to parse admin user:', error);
      }
    }

    fetchMessages(searchToken, selectedDate, currentAdminId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  const unreadMessages = messages.filter((m) => !m.isRead);
  const readMessages = messages.filter((m) => m.isRead);

  return (
    <div className={`admin-app-shell theme-${theme}`}>
      {/* Header Bar */}
      <header className="admin-header-nav">
        <div className="admin-header-left">
          <span className="admin-brand-badge">🛡️ SAFEGUARDING ADMIN</span>
          <span className="admin-user-pill">
            <span className="admin-avatar">{adminName.charAt(0).toUpperCase()}</span>
            <span>{adminName}</span>
          </span>
        </div>

        <div className="admin-header-right">
          <button
            type="button"
            className="theme-toggle-btn"
            onClick={toggleTheme}
            title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
          >
            {theme === 'light' ? (
              <>
                <span className="toggle-icon">🌙</span> Dark Mode
              </>
            ) : (
              <>
                <span className="toggle-icon">☀️</span> Light Mode
              </>
            )}
          </button>

          <Link to="/admin/staff" className="nav-action-link">
            👥 Staff
          </Link>
          <Link to="/admins" className="nav-action-link">
            📋 Admins
          </Link>
          <button
            type="button"
            className="nav-logout-btn"
            onClick={() => {
              localStorage.removeItem('adminAuth');
              localStorage.removeItem('adminUser');
              navigate('/admin/login');
            }}
          >
            Logout
          </button>
        </div>
      </header>

      <main className="admin-container">
        {/* Banner Card */}
        <div className="admin-hero-card">
          <div className="hero-content">
            <h1 className="hero-title">Admin Control Dashboard</h1>
            <p className="hero-desc">
              Review confidential safeguarding reports securely. Identity protection features automatically mask your own staff reports.
            </p>
          </div>
          <div className="hero-stats">
            <div className="stat-card">
              <span className="stat-icon">📩</span>
              <span className="stat-value">{messages.length}</span>
              <span className="stat-label">Total Reports</span>
            </div>
            <div className="stat-card highlight-unread">
              <span className="stat-icon">📬</span>
              <span className="stat-value">{unreadMessages.length}</span>
              <span className="stat-label">Unread</span>
            </div>
            <div className="stat-card highlight-read">
              <span className="stat-icon">✅</span>
              <span className="stat-value">{readMessages.length}</span>
              <span className="stat-label">Reviewed</span>
            </div>
          </div>
        </div>

        {/* Filter and View Controls Bar */}
        <div className="admin-controls-card">
          <form className="admin-search-form" onSubmit={handleSearch}>
            <div className="search-input-wrap">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                className="admin-input"
                placeholder="Search by thread token..."
                value={searchToken}
                onChange={(e) => setSearchToken(e.target.value)}
              />
            </div>
            <div className="date-input-wrap">
              <label htmlFor="dateFilter">Filter date:</label>
              <input
                id="dateFilter"
                type="date"
                className="admin-input date-input"
                value={selectedDate}
                onChange={handleDateChange}
              />
            </div>
            <button type="submit" className="admin-btn primary-btn">
              Search
            </button>
            {(searchToken || selectedDate) && (
              <button type="button" className="admin-btn ghost-btn" onClick={clearFilters}>
                Reset
              </button>
            )}
          </form>

          <div className="tab-controls">
            <button
              type="button"
              className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`}
              onClick={() => setActiveTab('all')}
            >
              All Sections
            </button>
            <button
              type="button"
              className={`tab-btn ${activeTab === 'unread' ? 'active' : ''}`}
              onClick={() => setActiveTab('unread')}
            >
              Unread ({unreadMessages.length})
            </button>
            <button
              type="button"
              className={`tab-btn ${activeTab === 'read' ? 'active' : ''}`}
              onClick={() => setActiveTab('read')}
            >
              Read ({readMessages.length})
            </button>
          </div>
        </div>

        {loading ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Loading safeguarding messages...</p>
          </div>
        ) : (
          <div className="sections-grid">
            {/* UNREAD MESSAGES SECTION */}
            {(activeTab === 'all' || activeTab === 'unread') && (
              <section className="messages-section-card unread-section">
                <div className="section-header">
                  <div className="section-title-wrap">
                    <span className="section-badge unread-badge-count">{unreadMessages.length}</span>
                    <h2>📬 Unread Messages</h2>
                  </div>
                  {unreadMessages.length > 0 && (
                    <button type="button" className="mark-all-btn" onClick={markAllAsRead}>
                      ✓ Mark all as read
                    </button>
                  )}
                </div>

                {unreadMessages.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">🎉</div>
                    <h3>All Caught Up!</h3>
                    <p>There are no unread safeguarding reports to review.</p>
                  </div>
                ) : (
                  <div className="messages-list">
                    {unreadMessages.map((message) => (
                      <div key={message.id || message._id} className="msg-card unread-msg-card">
                        <div className="msg-header">
                          <div className="msg-topic-row">
                            <span className="pulse-unread-dot" title="Unread Message"></span>
                            <Link to={`/message/${message.id || message._id}`} className="msg-topic-link">
                              {message.topic}
                            </Link>
                          </div>
                          {message.reportedStaff && (
                            <span className="staff-pill">
                              👤 Re: {message.reportedStaff.name} ({message.reportedStaff.role})
                            </span>
                          )}
                        </div>

                        <p className="msg-body">{message.message}</p>

                        <div className="msg-footer">
                          <div className="msg-meta-row">
                            <span
                              className="token-tag"
                              onClick={(e) => handleCopyToken(message.threadToken, e)}
                              title="Click to copy thread token"
                            >
                              🔑 {message.threadToken}
                              {copiedToken === message.threadToken && <span className="copy-pop">Copied!</span>}
                            </span>
                            <span className="date-tag">
                              🕒 {new Date(message.createdAt || Date.now()).toLocaleString()}
                            </span>
                          </div>

                          <div className="msg-actions">
                            <Link to={`/message/${message.id || message._id}`} className="msg-btn view-btn">
                              View Details
                            </Link>
                            <button
                              type="button"
                              className="msg-btn mark-read-btn"
                              onClick={() => markAsRead(message.id || message._id)}
                            >
                              Mark as Read
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* READ MESSAGES SECTION */}
            {(activeTab === 'all' || activeTab === 'read') && (
              <section className="messages-section-card read-section">
                <div className="section-header">
                  <div className="section-title-wrap">
                    <span className="section-badge read-badge-count">{readMessages.length}</span>
                    <h2>✅ Read Messages</h2>
                  </div>
                </div>

                {readMessages.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">📂</div>
                    <h3>No Reviewed Messages</h3>
                    <p>Messages will move here after you review and mark them as read.</p>
                  </div>
                ) : (
                  <div className="messages-list">
                    {readMessages.map((message) => (
                      <div key={message.id || message._id} className="msg-card read-msg-card">
                        <div className="msg-header">
                          <div className="msg-topic-row">
                            <span className="read-check-icon">✓</span>
                            <Link to={`/message/${message.id || message._id}`} className="msg-topic-link">
                              {message.topic}
                            </Link>
                          </div>
                          {message.reportedStaff && (
                            <span className="staff-pill">
                              👤 Re: {message.reportedStaff.name} ({message.reportedStaff.role})
                            </span>
                          )}
                        </div>

                        <p className="msg-body">{message.message}</p>

                        <div className="msg-footer">
                          <div className="msg-meta-row">
                            <span
                              className="token-tag"
                              onClick={(e) => handleCopyToken(message.threadToken, e)}
                              title="Click to copy thread token"
                            >
                              🔑 {message.threadToken}
                              {copiedToken === message.threadToken && <span className="copy-pop">Copied!</span>}
                            </span>
                            <span className="date-tag">
                              🕒 {new Date(message.createdAt || Date.now()).toLocaleString()}
                            </span>
                          </div>

                          <div className="msg-actions">
                            <Link to={`/message/${message.id || message._id}`} className="msg-btn view-btn">
                              View Details
                            </Link>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default Admin;