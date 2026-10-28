import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../form.css';
import './SuperAdmin.css';
import { downloadTokenPdf } from '../tokenPdf';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function SuperAdmin() {
  const [messages, setMessages] = useState([]);
  const [allMessages, setAllMessages] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [adminCount, setAdminCount] = useState(0);
  const [limitReached, setLimitReached] = useState(false);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [timeRange, setTimeRange] = useState('12months');
  const [superAdminName, setSuperAdminName] = useState('Super Admin');
  const [hoveredMonth, setHoveredMonth] = useState(null);

  // Search & Filter controls for incorporated regular admin features
  const [searchToken, setSearchToken] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'unread' | 'read'
  const [downloadedToken, setDownloadedToken] = useState('');

  // Light mode by default as specified in requirements
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('superAdminTheme') || 'light';
  });

  const navigate = useNavigate();

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    localStorage.setItem('superAdminTheme', nextTheme);
  };

  const handleLogout = () => {
    localStorage.removeItem('superAdminAuth');
    localStorage.removeItem('superAdminUser');
    localStorage.removeItem('adminAuth');
    localStorage.removeItem('adminUser');
    navigate('/admin/super/login');
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch all messages for reports overview, chart & reports management
      const msgRes = await fetch(`${API_URL}/api/messages`);
      const msgData = await msgRes.json();
      if (msgData.success) {
        const msgs = msgData.messages || [];
        setMessages(msgs);
        setAllMessages(msgs);
      }

      // 2. Fetch admin accounts and count (limit = 3) from Admin database
      const authRes = await fetch(`${API_URL}/api/auth/admins`);
      const authData = await authRes.json();
      if (authData.success) {
        setAdmins(authData.admins || []);
        const count = authData.count || (authData.admins ? authData.admins.length : 0);
        setAdminCount(count);
        setLimitReached(count >= 3 || authData.limitReached);
      }
    } catch (err) {
      console.error('Failed to fetch Super Admin dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchFilteredMessages = async (token = searchToken, date = selectedDate) => {
    setMessagesLoading(true);
    try {
      const params = new URLSearchParams();
      if (token.trim()) params.append('threadToken', token.trim());
      if (date) params.append('date', date);

      const response = await fetch(`${API_URL}/api/messages?${params.toString()}`);
      const data = await response.json();
      if (data.success) {
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error('Failed to fetch filtered messages:', error);
    } finally {
      setMessagesLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchFilteredMessages(searchToken, selectedDate);
  };

  const handleDateChange = (event) => {
    const value = event.target.value;
    setSelectedDate(value);
    fetchFilteredMessages(searchToken, value);
  };

  const clearFilters = () => {
    setSearchToken('');
    setSelectedDate('');
    fetchFilteredMessages('', '');
  };

  const handleDownloadToken = (message, e) => {
    e.preventDefault();
    e.stopPropagation();
    const token = message.threadToken;
    const staffLabel = message.reportedStaff
      ? (typeof message.reportedStaff === 'object'
          ? `${message.reportedStaff.name} (${message.reportedStaff.role})`
          : message.reportedStaff)
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

  const markAsRead = async (messageId) => {
    try {
      const response = await fetch(
        `${API_URL}/api/messages/${messageId}/read`,
        { method: 'PATCH' }
      );
      const data = await response.json();

      if (data.success) {
        setMessages((current) =>
          current.map((message) =>
            (message.id || message._id) === messageId ? { ...message, ...data.message, isRead: true } : message
          )
        );
        setAllMessages((current) =>
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
    setAllMessages((current) =>
      current.map((message) => ({ ...message, isRead: true, readAt: new Date().toISOString() }))
    );

    try {
      const response = await fetch(`${API_URL}/api/messages/mark-all-read`, { method: 'PATCH' });
      const data = await response.json();
      if (!data.success) {
        console.warn('mark-all-read returned non-success', data);
      }
    } catch (err) {
      console.error('Failed to mark all as read on server:', err);
    }
  };

  const deleteAdmin = async (adminId) => {
    if (!adminId) {
      alert('Unable to delete admin account: missing admin ID.');
      return;
    }
    if (!window.confirm('Delete this administrator account?')) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/admins/${encodeURIComponent(adminId)}`, {
        method: 'DELETE',
      });
      const data = await response.json();

      if (response.ok && data.success) {
        await fetchData();
      } else {
        alert(data.error || 'Unable to delete admin account.');
      }
    } catch (err) {
      console.error('Failed to delete admin account:', err);
      alert('Unable to delete admin account. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const isSuperAuth = localStorage.getItem('superAdminAuth');
    const isAdminAuth = localStorage.getItem('adminAuth');

    if (!isSuperAuth && !isAdminAuth) {
      navigate('/admin/super/login');
      return;
    }

    const storedSuperAdmin = localStorage.getItem('superAdminUser');
    if (storedSuperAdmin) {
      try {
        const parsed = JSON.parse(storedSuperAdmin);
        setSuperAdminName(parsed.username || parsed.email || 'Super Admin');
      } catch (e) {
        console.error('Error parsing super admin user:', e);
      }
    } else {
      const storedAdmin = localStorage.getItem('adminUser');
      if (storedAdmin) {
        try {
          const parsedAdmin = JSON.parse(storedAdmin);
          setSuperAdminName(parsedAdmin.username || parsedAdmin.email || 'Super Admin');
        } catch (e) {
          console.error('Error parsing admin user:', e);
        }
      }
    }

    fetchData();
  }, [fetchData, navigate]);

  // Aggregate complaints by month
  const getMonthlyData = () => {
    const monthsCount = timeRange === '6months' ? 6 : 12;
    const result = [];
    const now = new Date();

    for (let i = monthsCount - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleString('default', { month: 'short', year: '2-digit' });
      const fullLabel = d.toLocaleString('default', { month: 'long', year: 'numeric' });

      result.push({
        key: monthKey,
        label,
        fullLabel,
        year: d.getFullYear(),
        month: d.getMonth(),
        count: 0,
        unread: 0,
        read: 0,
      });
    }

    const chartSource = allMessages.length > 0 ? allMessages : messages;
    chartSource.forEach((msg) => {
      if (!msg.createdAt) return;
      const msgDate = new Date(msg.createdAt);
      const msgKey = `${msgDate.getFullYear()}-${String(msgDate.getMonth() + 1).padStart(2, '0')}`;

      const found = result.find((item) => item.key === msgKey);
      if (found) {
        found.count += 1;
        if (msg.isRead) {
          found.read += 1;
        } else {
          found.unread += 1;
        }
      }
    });

    return result;
  };

  const monthlyData = getMonthlyData();
  const maxCount = Math.max(...monthlyData.map((m) => m.count), 5);
  const totalReports = (allMessages.length > 0 ? allMessages : messages).length;
  const avgReportsPerMonth = (totalReports / monthlyData.length).toFixed(1);
  const peakMonth = monthlyData.reduce(
    (prev, current) => (prev.count > current.count ? prev : current),
    monthlyData[0] || { label: 'None', count: 0 }
  );

  const unreadMessages = messages.filter((m) => !m.isRead);
  const readMessages = messages.filter((m) => m.isRead);
  const unreadReportsCount = (allMessages.length > 0 ? allMessages : messages).filter((m) => !m.isRead).length;

  // Practical chart dimensions: reduced height and clear margins
  const svgWidth = 840;
  const svgHeight = 170;
  const padLeft = 40;
  const padRight = 24;
  const padTop = 16;
  const padBottom = 32;
  const usableW = svgWidth - padLeft - padRight;
  const usableH = svgHeight - padTop - padBottom;

  const points = monthlyData.map((item, index) => {
    const x = padLeft + (monthlyData.length > 1 ? (index / (monthlyData.length - 1)) * usableW : usableW / 2);
    const y = padTop + usableH - (maxCount > 0 ? (item.count / maxCount) * usableH : 0);
    return { x, y, item, index };
  });

  // Use straight line segments so the chart never curves below zero when counts are 0
  const straightLinePath = points.length > 0
    ? points.reduce((acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`, '')
    : '';

  const areaPath = points.length > 0
    ? `${straightLinePath} L ${points[points.length - 1].x.toFixed(1)} ${padTop + usableH} L ${points[0].x.toFixed(1)} ${padTop + usableH} Z`
    : '';

  const yGridTicks = [
    { label: maxCount, y: padTop },
    { label: Math.round(maxCount * 0.5), y: padTop + usableH * 0.5 },
    { label: 0, y: padTop + usableH },
  ];

  const strokeColor = theme === 'light' ? '#0f766e' : '#2dd4bf';
  const areaColor = theme === 'light' ? '#f0fdfa' : '#132832';
  const gridColor = theme === 'light' ? '#e2e8f0' : '#334155';
  const labelColor = theme === 'light' ? '#64748b' : '#94a3b8';

  return (
    <div className={`super-admin-root theme-${theme}`}>
      {/* Quiet, professional navigation header */}
      <header className="super-header">
        <div className="super-header-left">
          <div className="super-brand">
            <span className="brand-name">Linda</span>
            <span className="brand-separator">/</span>
            <span className="brand-context">Super admin</span>
          </div>
          <span className="nav-user" title={`Signed in as ${superAdminName}`}>
            {superAdminName}
          </span>
        </div>

        <nav className="super-header-right" aria-label="Super admin navigation">
          <button
            type="button"
            className="super-btn super-btn-secondary"
            onClick={toggleTheme}
          >
            {theme === 'light' ? 'Dark mode' : 'Light mode'}
          </button>

          <Link to="/admin/staff" className="super-btn super-btn-secondary">
            Staff management
          </Link>
          <Link to="/admin/register" className="super-btn super-btn-primary">
            Register admin
          </Link>
          <button
            type="button"
            className="super-btn super-btn-outline"
            onClick={handleLogout}
          >
            Log out
          </button>
        </nav>
      </header>

      {/* Main layout container */}
      <main className="super-container">
        {/* Simple page header without oversized container */}
        <div className="super-page-header">
          <div className="super-page-header-text">
            <h1 className="super-page-title">Dashboard</h1>
            <p className="super-page-desc">
              Overview of Linda reports, monthly trends, and administrator accounts.
            </p>
          </div>
          <div className="super-account-summary">
            <span className="account-summary-text">
              {adminCount} of 3 administrator accounts in use
            </span>
            {limitReached && (
              <span className="account-limit-note">(limit reached)</span>
            )}
          </div>
        </div>

        {/* Compact statistics row with left-aligned labels and values */}
        <div className="super-stats-row">
          <div className="super-stat-card">
            <span className="super-stat-label">Total reports</span>
            <span className="super-stat-value">{totalReports}</span>
          </div>
          <div className="super-stat-card">
            <span className="super-stat-label">Monthly average</span>
            <span className="super-stat-value">{avgReportsPerMonth}</span>
          </div>
          <div className="super-stat-card">
            <span className="super-stat-label">Peak month</span>
            <span className="super-stat-value">
              {peakMonth.count > 0 ? `${peakMonth.label} (${peakMonth.count})` : 'None'}
            </span>
          </div>
          <div className="super-stat-card">
            <span className="super-stat-label">Unread reports</span>
            <span className="super-stat-value">{unreadReportsCount}</span>
          </div>
        </div>

        {/* Practical Chart Section */}
        <section className="super-section">
          <div className="super-section-header">
            <div>
              <h2 className="super-section-title">Reports over time</h2>
              <p className="super-section-subtitle">Monthly breakdown of submitted reports</p>
            </div>

            <div className="super-filter-control">
              <label htmlFor="timeframe-select" className="super-filter-label">Timeframe</label>
              <select
                id="timeframe-select"
                className="super-select"
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
              >
                <option value="6months">Past 6 months</option>
                <option value="12months">Past 12 months</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="super-loading-box">
              <div className="super-spinner" />
              <span>Loading report data…</span>
            </div>
          ) : (
            <div className="super-chart-wrapper">
              <svg
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                className="super-chart-svg"
                preserveAspectRatio="none"
              >
                {/* Horizontal Grid lines and Y labels */}
                {yGridTicks.map((tick, i) => (
                  <g key={i}>
                    <line
                      x1={padLeft}
                      y1={tick.y}
                      x2={svgWidth - padRight}
                      y2={tick.y}
                      stroke={gridColor}
                      strokeDasharray="2 3"
                      strokeWidth="1"
                    />
                    <text
                      x={padLeft - 8}
                      y={tick.y + 4}
                      textAnchor="end"
                      fill={labelColor}
                      fontSize="11"
                      fontFamily="inherit"
                    >
                      {tick.label}
                    </text>
                  </g>
                ))}

                {/* Subtle Area fill under the straight line */}
                {areaPath && (
                  <path
                    d={areaPath}
                    fill={areaColor}
                  />
                )}

                {/* Straight segment line (never curves below zero) */}
                {straightLinePath && (
                  <path
                    d={straightLinePath}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {/* Data points and X labels */}
                {points.map((pt) => {
                  const isHovered = hoveredMonth === pt.item.key;
                  return (
                    <g key={pt.item.key}>
                      {/* Hover touch target */}
                      <rect
                        x={pt.x - usableW / (monthlyData.length * 2)}
                        y={padTop}
                        width={usableW / monthlyData.length}
                        height={usableH}
                        fill="transparent"
                        onMouseEnter={() => setHoveredMonth(pt.item.key)}
                        onMouseLeave={() => setHoveredMonth(null)}
                        style={{ cursor: 'pointer' }}
                      />

                      {/* Dot */}
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r={isHovered ? 4.5 : 3}
                        fill={isHovered ? strokeColor : (theme === 'light' ? '#ffffff' : '#0f172a')}
                        stroke={strokeColor}
                        strokeWidth="2"
                      />

                      {/* X-axis label */}
                      <text
                        x={pt.x}
                        y={svgHeight - 10}
                        textAnchor="middle"
                        fill={isHovered ? (theme === 'light' ? '#0f172a' : '#f8fafc') : labelColor}
                        fontSize="11"
                        fontWeight={isHovered ? '600' : '400'}
                        fontFamily="inherit"
                      >
                        {pt.item.label}
                      </text>
                    </g>
                  );
                })}
              </svg>

              {/* Discreet floating tooltip */}
              {hoveredMonth && (() => {
                const activePt = points.find((p) => p.item.key === hoveredMonth);
                if (!activePt) return null;
                const leftPct = (activePt.x / svgWidth) * 100;
                const topPct = (activePt.y / svgHeight) * 100;

                return (
                  <div
                    className="super-chart-tooltip"
                    style={{
                      left: `${Math.min(Math.max(leftPct, 12), 88)}%`,
                      top: `${Math.max(topPct - 30, 0)}%`,
                    }}
                  >
                    <div className="tooltip-title">{activePt.item.fullLabel}</div>
                    <div className="tooltip-row">
                      <span>Total reports:</span>
                      <strong>{activePt.item.count}</strong>
                    </div>
                    <div className="tooltip-row">
                      <span>Reviewed:</span>
                      <span>{activePt.item.read}</span>
                    </div>
                    <div className="tooltip-row">
                      <span>Unread:</span>
                      <span>{activePt.item.unread}</span>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </section>

        {/* Incorporated Regular Admin Safeguarding Reports Section */}
        <section className="super-section">
          <div className="super-section-header">
            <div>
              <h2 className="super-section-title">Reports management</h2>
              <p className="super-section-subtitle">
                Review, filter, and process incoming reports
              </p>
            </div>
          </div>

          {/* Search, Filter Date & Status Tabs */}
          <div className="super-reports-controls">
            <form className="super-search-form" onSubmit={handleSearch}>
              <div className="super-search-field">
                <input
                  type="text"
                  className="super-input"
                  placeholder="Search by thread token…"
                  value={searchToken}
                  onChange={(e) => setSearchToken(e.target.value)}
                />
              </div>

              <div className="super-date-field">
                <label htmlFor="filter-date" className="super-field-label">Filter date:</label>
                <input
                  id="filter-date"
                  type="date"
                  className="super-input super-date-input"
                  value={selectedDate}
                  onChange={handleDateChange}
                />
              </div>

              <button type="submit" className="super-btn super-btn-primary">
                Search
              </button>
              {(searchToken || selectedDate) && (
                <button type="button" className="super-btn super-btn-secondary" onClick={clearFilters}>
                  Reset
                </button>
              )}
            </form>

            <div className="super-tab-group" role="tablist" aria-label="Report filter tabs">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'all'}
                className={`super-tab-btn ${activeTab === 'all' ? 'active' : ''}`}
                onClick={() => setActiveTab('all')}
              >
                All reports ({messages.length})
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'unread'}
                className={`super-tab-btn ${activeTab === 'unread' ? 'active' : ''}`}
                onClick={() => setActiveTab('unread')}
              >
                Unread ({unreadMessages.length})
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'read'}
                className={`super-tab-btn ${activeTab === 'read' ? 'active' : ''}`}
                onClick={() => setActiveTab('read')}
              >
                Reviewed ({readMessages.length})
              </button>
            </div>
          </div>

          {/* Reports Content */}
          {messagesLoading ? (
            <div className="super-loading-box">
              <div className="super-spinner" />
              <span>Loading messages…</span>
            </div>
          ) : (
            <div className="super-messages-grid">
              {/* Unread Reports List */}
              {(activeTab === 'all' || activeTab === 'unread') && (
                <div className="super-msg-section">
                  <div className="super-msg-section-header">
                    <span className="super-msg-section-title">
                      Unread reports ({unreadMessages.length})
                    </span>
                    {unreadMessages.length > 0 && (
                      <button type="button" className="super-btn super-btn-outline" onClick={markAllAsRead}>
                        Mark all as read
                      </button>
                    )}
                  </div>

                  {unreadMessages.length === 0 ? (
                    <div className="super-msg-empty">
                      <span>No unread reports to review.</span>
                    </div>
                  ) : (
                    <div className="super-msg-list">
                      {unreadMessages.map((message) => {
                        const msgId = message.id || message._id;
                        return (
                          <div key={msgId} className="super-msg-card unread">
                            <div className="super-msg-header">
                              <div className="super-msg-topic-row">
                                <span className="unread-dot" title="Unread report" />
                                <Link to={`/message/${msgId}`} className="super-msg-topic">
                                  {message.topic}
                                </Link>
                              </div>
                              {message.reportedStaff && (
                                <span className="super-staff-tag">
                                  Re: {message.reportedStaff.name} ({message.reportedStaff.role})
                                </span>
                              )}
                            </div>

                            <p className="super-msg-body">{message.message}</p>

                            <div className="super-msg-footer">
                              <div className="super-msg-meta">
                                <button
                                  type="button"
                                  className="super-token-pill"
                                  onClick={(e) => handleDownloadToken(message, e)}
                                  title="Click to download secure thread token PDF"
                                >
                                  {message.threadToken}
                                  <span className="token-pdf-tag">PDF</span>
                                  {downloadedToken === message.threadToken && (
                                    <span className="copied-bubble">Downloaded PDF</span>
                                  )}
                                </button>
                                <span className="super-date-text">
                                  {new Date(message.createdAt || Date.now()).toLocaleString()}
                                </span>
                              </div>

                              <div className="super-msg-actions">
                                <Link to={`/message/${msgId}`} className="super-btn super-btn-secondary">
                                  View details
                                </Link>
                                <button
                                  type="button"
                                  className="super-btn super-btn-outline"
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
                </div>
              )}

              {/* Reviewed Reports List */}
              {(activeTab === 'all' || activeTab === 'read') && (
                <div className="super-msg-section">
                  <div className="super-msg-section-header">
                    <span className="super-msg-section-title">
                      Reviewed reports ({readMessages.length})
                    </span>
                  </div>

                  {readMessages.length === 0 ? (
                    <div className="super-msg-empty">
                      <span>No reviewed reports yet.</span>
                    </div>
                  ) : (
                    <div className="super-msg-list">
                      {readMessages.map((message) => {
                        const msgId = message.id || message._id;
                        return (
                          <div key={msgId} className="super-msg-card read">
                            <div className="super-msg-header">
                              <div className="super-msg-topic-row">
                                <span className="read-check">✓</span>
                                <Link to={`/message/${msgId}`} className="super-msg-topic">
                                  {message.topic}
                                </Link>
                              </div>
                              {message.reportedStaff && (
                                <span className="super-staff-tag">
                                  Re: {message.reportedStaff.name} ({message.reportedStaff.role})
                                </span>
                              )}
                            </div>

                            <p className="super-msg-body">{message.message}</p>

                            <div className="super-msg-footer">
                              <div className="super-msg-meta">
                                <button
                                  type="button"
                                  className="super-token-pill"
                                  onClick={(e) => handleDownloadToken(message, e)}
                                  title="Click to download secure thread token PDF"
                                >
                                  {message.threadToken}
                                  <span className="token-pdf-tag">PDF</span>
                                  {downloadedToken === message.threadToken && (
                                    <span className="copied-bubble">Downloaded PDF</span>
                                  )}
                                </button>
                                <span className="super-date-text">
                                  {new Date(message.createdAt || Date.now()).toLocaleString()}
                                </span>
                              </div>

                              <div className="super-msg-actions">
                                <Link to={`/message/${msgId}`} className="super-btn super-btn-secondary">
                                  View details
                                </Link>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </section>

        {/* Practical Accounts Table Section */}
        <section className="super-section">
          <div className="super-section-header">
            <div>
              <h2 className="super-section-title">Administrator accounts</h2>
              <p className="super-section-subtitle">
                System access accounts (maximum 3 allowed)
              </p>
            </div>

            <div>
              <Link
                to="/admin/register"
                className={`super-btn ${limitReached || adminCount >= 3 ? 'super-btn-disabled' : 'super-btn-primary'}`}
                onClick={(e) => {
                  if (limitReached || adminCount >= 3) {
                    e.preventDefault();
                    alert('Admin registration limit reached (3/3). No more admin accounts can be registered.');
                  }
                }}
              >
                Register admin
              </Link>
            </div>
          </div>

          <div className="super-table-container">
            <table className="super-data-table">
              <thead>
                <tr>
                  <th scope="col" style={{ width: '40px' }}>#</th>
                  <th scope="col">Username</th>
                  <th scope="col">Email</th>
                  <th scope="col">Linked staff member</th>
                  <th scope="col">Created</th>
                  <th scope="col">Logins</th>
                  <th scope="col">Status</th>
                  <th scope="col" style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="8" className="table-empty-cell">
                      Loading administrator accounts…
                    </td>
                  </tr>
                ) : admins.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="table-empty-cell">
                      No admin accounts registered yet.
                    </td>
                  </tr>
                ) : (
                  admins.map((adm, index) => {
                    const adminId = adm.id || adm._id || '';
                    return (
                      <tr key={adminId || index}>
                        <td className="cell-muted">{index + 1}</td>
                        <td className="cell-username">{adm.username}</td>
                        <td className="cell-email">{adm.email}</td>
                        <td className="cell-muted">
                          {adm.staffId ? (
                            typeof adm.staffId === 'object'
                              ? `${adm.staffId.name || adm.username} ${adm.staffId.role ? `(${adm.staffId.role})` : ''}`
                              : adm.staffId
                          ) : (
                            'None'
                          )}
                        </td>
                        <td className="cell-muted">
                          {adm.createdAt ? new Date(adm.createdAt).toLocaleDateString() : '—'}
                        </td>
                        <td className="cell-muted">
                          {(adm.loginHistory && adm.loginHistory.length) || 0}
                        </td>
                        <td>
                          <span className="status-indicator">
                            <span className="status-dot" />
                            Active
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            type="button"
                            className="btn-table-action"
                            onClick={() => deleteAdmin(adminId)}
                            disabled={loading || !adminId}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}

export default SuperAdmin;
