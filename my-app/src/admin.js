import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './form.css';
import { downloadTokenPdf } from './tokenPdf';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function Admin() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchToken, setSearchToken] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [adminName, setAdminName] = useState('Admin');
  const [staffId, setStaffId] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'unread' | 'read'
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('adminTheme') || 'light';
  });
  const [downloadedToken, setDownloadedToken] = useState('');

  const navigate = useNavigate();

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    localStorage.setItem('adminTheme', nextTheme);
  };

  const fetchMessages = useCallback(async (token = searchToken, date = selectedDate, currentStaffId = staffId) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (token.trim()) params.append('threadToken', token.trim());
      if (date) params.append('date', date);
      if (currentStaffId) params.append('staffId', currentStaffId);

      const response = await fetch(`${API_URL}/api/messages?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    } finally {
      setLoading(false);
    }
  }, [searchToken, selectedDate, staffId]);

  const markAsRead = async (messageId) => {
    try {
      const params = new URLSearchParams();
      if (staffId) params.append('staffId', staffId);

      const response = await fetch(
        `${API_URL}/api/messages/${messageId}/read?${params.toString()}`,
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
    const unreadCount = messages.filter((m) => !m.isRead).length;
    if (unreadCount === 0) return;

    setMessages((current) =>
      current.map((message) => ({ ...message, isRead: true, readAt: new Date().toISOString() }))
    );

    try {
      const params = new URLSearchParams();
      if (staffId) params.append('staffId', staffId);
      const response = await fetch(`${API_URL}/api/messages/mark-all-read?${params.toString()}`, { method: 'PATCH' });
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

  const handleDownloadToken = (message, e) => {
    e.preventDefault();
    e.stopPropagation();
    const token = message.threadToken;
    const staffLabel = message.reportedStaff
      ? `${message.reportedStaff.name} (${message.reportedStaff.role})`
      : undefined;
    const dateStr = new Date(message.createdAt || Date.now()).toLocaleString();

    downloadTokenPdf({
      token,
      topic: message.topic,
      reportedStaff: staffLabel,
      date: dateStr,
    });
    setDownloadedToken(token);
    setTimeout(() => setDownloadedToken(''), 2500);
  };

  const handleLogout = () => {
    localStorage.removeItem('adminAuth');
    localStorage.removeItem('adminUser');
    navigate('/admin/login');
  };

  useEffect(() => {
    const adminAuth = localStorage.getItem('adminAuth');
    if (!adminAuth) {
      navigate('/admin/login');
      return;
    }

    let currentStaffId = '';
    const storedAdmin = localStorage.getItem('adminUser');
    if (storedAdmin) {
      try {
        const parsedAdmin = JSON.parse(storedAdmin);
        setAdminName(parsedAdmin.username || parsedAdmin.email || 'Admin');
        if (parsedAdmin.staffId) {
          currentStaffId = typeof parsedAdmin.staffId === 'object' ? (parsedAdmin.staffId.id || '') : String(parsedAdmin.staffId);
        }
        setStaffId(currentStaffId);
      } catch (error) {
        console.error('Failed to parse admin user:', error);
      }
    }

    fetchMessages(searchToken, selectedDate, currentStaffId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  const unreadMessages = messages.filter((m) => !m.isRead);
  const readMessages = messages.filter((m) => m.isRead);

  return (
    <div className={`admin-app-shell theme-${theme}`}>
      {/* Quiet Navigation Header */}
      <header className="admin-header-nav">
        <div className="admin-header-left">
          <div className="admin-brand">
            <span className="brand-name">Linda</span>
            <span className="brand-separator">/</span>
            <span className="brand-context">Admin</span>
          </div>
          <span className="nav-user" title={`Signed in as ${adminName}`}>
            {adminName}
          </span>
        </div>

        <nav className="admin-header-right" aria-label="Admin navigation">
          <button
            type="button"
            className="admin-btn admin-btn-secondary"
            onClick={toggleTheme}
          >
            {theme === 'light' ? 'Dark mode' : 'Light mode'}
          </button>

          <button
            type="button"
            className="admin-btn admin-btn-outline"
            onClick={handleLogout}
          >
            Log out
          </button>
        </nav>
      </header>

      {/* Main Layout Container */}
      <main className="admin-container">
        {/* Simple Page Header without oversized container */}
        <div className="admin-page-header">
          <div className="admin-page-header-text">
            <h1 className="admin-page-title">Reports</h1>
            <p className="admin-page-desc">View and manage Linda reports.</p>
          </div>
        </div>

        {/* Compact Statistics Row */}
        <div className="admin-stats-row">
          <div className="admin-stat-card">
            <span className="admin-stat-label">Total reports</span>
            <span className="admin-stat-value">{messages.length}</span>
          </div>
          <div className="admin-stat-card">
            <span className="admin-stat-label">Unread reports</span>
            <span className="admin-stat-value">{unreadMessages.length}</span>
          </div>
          <div className="admin-stat-card">
            <span className="admin-stat-label">Read reports</span>
            <span className="admin-stat-value">{readMessages.length}</span>
          </div>
        </div>

        {/* Filter and View Controls Section */}
        <section className="admin-section admin-controls-section">
          <div className="admin-reports-controls">
            <form className="admin-search-form" onSubmit={handleSearch}>
              <div className="admin-search-field">
                <label htmlFor="searchToken" className="admin-field-label">Search token:</label>
                <input
                  id="searchToken"
                  type="text"
                  className="admin-input"
                  placeholder="Enter thread token…"
                  value={searchToken}
                  onChange={(e) => setSearchToken(e.target.value)}
                />
              </div>

              <div className="admin-date-field">
                <label htmlFor="dateFilter" className="admin-field-label">Filter date:</label>
                <input
                  id="dateFilter"
                  type="date"
                  className="admin-input admin-date-input"
                  value={selectedDate}
                  onChange={handleDateChange}
                />
              </div>

              <div className="admin-search-actions">
                <button type="submit" className="admin-btn admin-btn-primary">
                  Search
                </button>
                {(searchToken || selectedDate) && (
                  <button type="button" className="admin-btn admin-btn-secondary" onClick={clearFilters}>
                    Reset
                  </button>
                )}
              </div>
            </form>

            <div className="admin-tab-group" role="tablist" aria-label="Report filter tabs">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'all'}
                className={`admin-tab-btn ${activeTab === 'all' ? 'active' : ''}`}
                onClick={() => setActiveTab('all')}
              >
                All reports ({messages.length})
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'unread'}
                className={`admin-tab-btn ${activeTab === 'unread' ? 'active' : ''}`}
                onClick={() => setActiveTab('unread')}
              >
                Unread ({unreadMessages.length})
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'read'}
                className={`admin-tab-btn ${activeTab === 'read' ? 'active' : ''}`}
                onClick={() => setActiveTab('read')}
              >
                Read ({readMessages.length})
              </button>
            </div>
          </div>
        </section>

        {/* Reports Content */}
        {loading ? (
          <div className="admin-loading-box">
            <div className="admin-spinner" />
            <span>Loading messages…</span>
          </div>
        ) : (
          <div className="admin-messages-grid">
            {/* UNREAD MESSAGES SECTION */}
            {(activeTab === 'all' || activeTab === 'unread') && (
              <section className="admin-section admin-msg-section">
                <div className="admin-section-header">
                  <div className="admin-section-title-wrap">
                    <h2 className="admin-section-title">
                      Unread reports ({unreadMessages.length})
                    </h2>
                  </div>
                  {unreadMessages.length > 0 && (
                    <button type="button" className="admin-btn admin-btn-outline" onClick={markAllAsRead}>
                      Mark all as read
                    </button>
                  )}
                </div>

                {unreadMessages.length === 0 ? (
                  <div className="admin-empty-state">
                    <span className="empty-title">No unread reports</span>
                    <p className="empty-desc">All submitted reports have been reviewed.</p>
                  </div>
                ) : (
                  <div className="admin-msg-list">
                    {unreadMessages.map((message) => {
                      const msgId = message.id || message._id;
                      return (
                        <div key={msgId} className="admin-msg-card unread">
                          <div className="admin-msg-header">
                            <div className="admin-msg-topic-row">
                              <span className="admin-unread-dot" title="Unread report" />
                              <Link to={`/message/${msgId}`} className="admin-msg-topic">
                                {message.topic}
                              </Link>
                            </div>
                            {message.reportedStaff && (
                              <span className="admin-staff-tag">
                                Re: {message.reportedStaff.name} ({message.reportedStaff.role})
                              </span>
                            )}
                          </div>

                          <p className="admin-msg-body">{message.message}</p>

                          <div className="admin-msg-footer">
                            <div className="admin-msg-meta">
                              <button
                                type="button"
                                className="admin-token-pill"
                                onClick={(e) => handleDownloadToken(message, e)}
                                title="Click to download secure thread token PDF"
                              >
                                {message.threadToken}
                                <span className="token-pdf-tag">PDF</span>
                                {downloadedToken === message.threadToken && (
                                  <span className="copied-bubble">Downloaded PDF</span>
                                )}
                              </button>
                              <span className="admin-date-text">
                                {new Date(message.createdAt || Date.now()).toLocaleString()}
                              </span>
                            </div>

                            <div className="admin-msg-actions">
                              <Link to={`/message/${msgId}`} className="admin-btn admin-btn-secondary">
                                View details
                              </Link>
                              <button
                                type="button"
                                className="admin-btn admin-btn-outline"
                                onClick={() => markAsRead(msgId)}
                              >
                                Mark as read
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            )}

            {/* READ MESSAGES SECTION */}
            {(activeTab === 'all' || activeTab === 'read') && (
              <section className="admin-section admin-msg-section">
                <div className="admin-section-header">
                  <div className="admin-section-title-wrap">
                    <h2 className="admin-section-title">
                      Read reports ({readMessages.length})
                    </h2>
                  </div>
                </div>

                {readMessages.length === 0 ? (
                  <div className="admin-empty-state">
                    <span className="empty-title">No read reports</span>
                    <p className="empty-desc">Reports will appear here once marked as read.</p>
                  </div>
                ) : (
                  <div className="admin-msg-list">
                    {readMessages.map((message) => {
                      const msgId = message.id || message._id;
                      return (
                        <div key={msgId} className="admin-msg-card read">
                          <div className="admin-msg-header">
                            <div className="admin-msg-topic-row">
                              <Link to={`/message/${msgId}`} className="admin-msg-topic">
                                {message.topic}
                              </Link>
                            </div>
                            {message.reportedStaff && (
                              <span className="admin-staff-tag">
                                Re: {message.reportedStaff.name} ({message.reportedStaff.role})
                              </span>
                            )}
                          </div>

                          <p className="admin-msg-body">{message.message}</p>

                          <div className="admin-msg-footer">
                            <div className="admin-msg-meta">
                              <button
                                type="button"
                                className="admin-token-pill"
                                onClick={(e) => handleDownloadToken(message, e)}
                                title="Click to download secure thread token PDF"
                              >
                                {message.threadToken}
                                <span className="token-pdf-tag">PDF</span>
                                {downloadedToken === message.threadToken && (
                                  <span className="copied-bubble">Downloaded PDF</span>
                                )}
                              </button>
                              <span className="admin-date-text">
                                {new Date(message.createdAt || Date.now()).toLocaleString()}
                              </span>
                            </div>

                            <div className="admin-msg-actions">
                              <Link to={`/message/${msgId}`} className="admin-btn admin-btn-secondary">
                                View details
                              </Link>
                            </div>
                          </div>
                        </div>
                      );
                    })}
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
