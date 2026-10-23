import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../form.css';
import './SuperAdmin.css';

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
  const [copiedToken, setCopiedToken] = useState('');
  
  // Light mode by default as specified in requirements
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('superAdminTheme') || 'light';
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
      // 1. Fetch all messages for monthly complaint graph and safeguarding reports
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

  const handleCopyToken = (token, e) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(token);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(''), 2000);
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

    // Generate past N months
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

    // Populate counts from allMessages so graph maintains full analytics
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
  const totalComplaints = (allMessages.length > 0 ? allMessages : messages).length;
  const unreadMessages = messages.filter((m) => !m.isRead);
  const readMessages = messages.filter((m) => m.isRead);
  const avgComplaintsPerMonth = (totalComplaints / monthlyData.length).toFixed(1);
  const peakMonth = monthlyData.reduce((prev, current) => (prev.count > current.count ? prev : current), monthlyData[0] || { label: 'N/A', count: 0 });
  const svgWidth = 840;
  const svgHeight = 260;
  const padLeft = 45;
  const padRight = 35;
  const padTop = 25;
  const padBottom = 40;
  const usableW = svgWidth - padLeft - padRight;
  const usableH = svgHeight - padTop - padBottom;

  const points = monthlyData.map((item, index) => {
    const x = padLeft + (monthlyData.length > 1 ? (index / (monthlyData.length - 1)) * usableW : usableW / 2);
    const y = padTop + usableH - (maxCount > 0 ? (item.count / maxCount) * usableH : 0);
    const readY = padTop + usableH - (maxCount > 0 ? (item.read / maxCount) * usableH : 0);
    return { x, y, readY, item, index };
  });

  const getLinePath = (pts, key = 'y') => {
    if (!pts || pts.length === 0) return '';
    if (pts.length === 1) return `M ${pts[0].x.toFixed(1)} ${pts[0][key].toFixed(1)}`;

    let path = `M ${pts[0].x.toFixed(1)} ${pts[0][key].toFixed(1)}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const curr = pts[i];
      const next = pts[i + 1];
      const prev = pts[i - 1] || curr;
      const afterNext = pts[i + 2] || next;

      const cp1x = curr.x + (next.x - prev.x) * 0.18;
      const cp1y = curr[key] + (next[key] - prev[key]) * 0.18;
      const cp2x = next.x - (afterNext.x - curr.x) * 0.18;
      const cp2y = next[key] - (afterNext[key] - curr[key]) * 0.18;

      path += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${next.x.toFixed(1)} ${next[key].toFixed(1)}`;
    }
    return path;
  };

  const linePath = getLinePath(points, 'y');

  const yGridTicks = [
    { label: maxCount, y: padTop },
    { label: Math.round(maxCount * 0.75), y: padTop + usableH * 0.25 },
    { label: Math.round(maxCount * 0.5), y: padTop + usableH * 0.5 },
    { label: Math.round(maxCount * 0.25), y: padTop + usableH * 0.75 },
    { label: 0, y: padTop + usableH },
  ];

  return (
    <div className={`super-admin-root theme-${theme}`}>
      {/* Super Admin Top Header */}
      <header className="super-header">
        <div className="super-header-top">
          <div className="super-header-left">
            <span className="super-badge">SUPER ADMIN PORTAL</span>
            <div className="super-user-info">
              <span className="super-avatar">S</span>
              <span className="super-name">{superAdminName}</span>
            </div>
          </div>

          <div className="super-mobile-actions">
            {/* Quick Logout with Power Icon on mobile */}
            <button
              type="button"
              className="super-logout-btn mobile-logout-btn"
              onClick={handleLogout}
              title="Logout"
              aria-label="Logout"
            >
              <svg className="power-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
                <line x1="12" y1="2" x2="12" y2="12" />
              </svg>
            </button>

            {/* Hamburger button visible only on mobile phone width */}
            <button
              type="button"
              className={`super-hamburger-btn ${mobileMenuOpen ? 'open' : ''}`}
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label="Toggle Navigation Menu"
              aria-expanded={mobileMenuOpen}
              title="Menu"
            >
              {mobileMenuOpen ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Navigation Items (Visible on Desktop / Laptop, and in dropdown on mobile when hamburger is open) */}
        <div className={`super-header-right ${mobileMenuOpen ? 'mobile-menu-open' : ''}`}>
          {/* Theme Toggle Button (Light mode default) */}
          <button
            type="button"
            className="theme-toggle-btn"
            onClick={() => {
              toggleTheme();
              setMobileMenuOpen(false);
            }}
          >
            {theme === 'light' ? 'Dark Mode' : 'Light Mode (Default)'}
          </button>

          <Link
            to="/admin/staff"
            className="super-nav-btn staff-btn"
            onClick={() => setMobileMenuOpen(false)}
          >
            Staff Management
          </Link>
          <Link
            to="/admin/register"
            className="super-nav-btn reg-btn"
            onClick={() => setMobileMenuOpen(false)}
          >
            Register Admin
          </Link>
          <button
            type="button"
            className="super-logout-btn desktop-logout-btn"
            onClick={handleLogout}
            title="Logout"
          >
            <svg className="power-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
              <line x1="12" y1="2" x2="12" y2="12" />
            </svg>
            <span className="logout-text">Logout</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="super-container">
        {/* Hero Control Panel Header */}
        <div className="super-hero-panel">
          <div>
            <h1 className="super-hero-title">Executive Dashboard</h1>
            <p className="super-hero-desc">
              Comprehensive overview of safeguarding complaints, incoming reports, staff management, and admin accounts.
            </p>
            <div className="hero-stats" style={{ marginTop: '1.25rem' }}>
              <div className="stat-card">
                <span className="stat-value">{allMessages.length || messages.length}</span>
                <span className="stat-label">Total Reports</span>
              </div>
              <div className="stat-card highlight-unread">
                <span className="stat-value">{unreadMessages.length}</span>
                <span className="stat-label">Unread</span>
              </div>
              <div className="stat-card highlight-read">
                <span className="stat-value">{readMessages.length}</span>
                <span className="stat-label">Reviewed</span>
              </div>
            </div>
          </div>

          <div className="super-account-pill">
            <div className="account-pill-title">ADMINISTRATOR ACCOUNTS</div>
            <div className="account-pill-meta">
              <span className="account-count">{adminCount} / 3</span>
              <span className={`account-status-badge ${limitReached || adminCount >= 3 ? 'full' : 'available'}`}>
                {limitReached || adminCount >= 3 ? 'FULL (3 MAX)' : `${3 - adminCount} SLOT AVAILABLE`}
              </span>
            </div>
            <div className="account-progress-bar">
              <div
                className="account-progress-fill"
                style={{ width: `${Math.min((adminCount / 3) * 100, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Minimalist Realistic Line Graph Section */}
        <div className="graph-card">
          <div className="graph-header">
            <div>
              <h2 className="graph-title">Safeguarding Complaints Frequency</h2>
              <p className="graph-subtitle">Monthly breakdown of submitted safeguarding reports</p>
            </div>

            <div className="graph-controls">
              <span className="time-select-label">Timeframe:</span>
              <select
                className="time-select-dropdown"
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
              >
                <option value="6months">Past 6 Months</option>
                <option value="12months">Past 12 Months</option>
              </select>
            </div>
          </div>

          {/* Stats Summary Bar */}
          <div className="graph-stats-row">
            <div className="stat-box">
              <span className="stat-label">Total Reports</span>
              <span className="stat-value neutral">{totalComplaints}</span>
            </div>
            <div className="stat-box">
              <span className="stat-label">Monthly Average</span>
              <span className="stat-value neutral">{avgComplaintsPerMonth}</span>
            </div>
            <div className="stat-box">
              <span className="stat-label">Peak Month</span>
              <span className="stat-value neutral">{peakMonth.label} ({peakMonth.count})</span>
            </div>
            <div className="stat-box">
              <span className="stat-label">Unread Reports</span>
              <span className="stat-value neutral">{messages.filter((m) => !m.isRead).length}</span>
            </div>
          </div>

          {/* Clean Thin Line Graph Canvas */}
          {loading ? (
            <div className="loading-graph-state">
              <div className="super-spinner" />
              <span>Loading analytics data…</span>
            </div>
          ) : (
            <div className="clean-chart-wrapper">
              <svg
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                className="clean-chart-svg"
                preserveAspectRatio="none"
              >
                {/* Background Grid & Y-Axis Labels */}
                {yGridTicks.map((tick, i) => (
                  <g key={i} className="clean-grid-group">
                    <line
                      x1={padLeft}
                      y1={tick.y}
                      x2={svgWidth - padRight}
                      y2={tick.y}
                      className="clean-grid-line"
                    />
                    <text
                      x={padLeft - 10}
                      y={tick.y + 4}
                      textAnchor="end"
                      className="clean-y-label"
                    >
                      {tick.label}
                    </text>
                  </g>
                ))}

                {/* Thin Line Graph (1.5px Thin Monochrome Line) */}
                {linePath && (
                  <path
                    d={linePath}
                    fill="none"
                    stroke={theme === 'light' ? '#334155' : '#cbd5e1'}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="clean-main-line"
                  />
                )}

                {/* Vertical Cursor Guideline */}
                {points.map((pt) => {
                  if (hoveredMonth !== pt.item.key) return null;
                  return (
                    <line
                      key={`guide-${pt.item.key}`}
                      x1={pt.x}
                      y1={padTop}
                      x2={pt.x}
                      y2={padTop + usableH}
                      className="clean-hover-guide"
                    />
                  );
                })}

                {/* Data Points & X-Axis Month Labels */}
                {points.map((pt) => {
                  const isHovered = hoveredMonth === pt.item.key;
                  return (
                    <g key={pt.item.key} className="clean-node-group">
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

                      {/* Small Thin Point Circle */}
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r={isHovered ? 4.5 : 3}
                        className={`clean-node-dot ${isHovered ? 'active' : ''}`}
                      />

                      {/* X-Axis Month Label */}
                      <text
                        x={pt.x}
                        y={svgHeight - 10}
                        textAnchor="middle"
                        className={`clean-x-label ${isHovered ? 'active' : ''}`}
                      >
                        {pt.item.label}
                      </text>
                    </g>
                  );
                })}
              </svg>

              {/* Minimalist Floating Tooltip Card */}
              {hoveredMonth && (() => {
                const activePt = points.find((p) => p.item.key === hoveredMonth);
                if (!activePt) return null;
                const leftPct = (activePt.x / svgWidth) * 100;
                const topPct = (activePt.y / svgHeight) * 100;

                return (
                  <div
                    className="clean-tooltip-card"
                    style={{
                      left: `${Math.min(Math.max(leftPct, 12), 88)}%`,
                      top: `${Math.max(topPct - 25, 5)}%`,
                    }}
                  >
                    <div className="clean-tooltip-title">{activePt.item.fullLabel}</div>
                    <div className="clean-tooltip-row">
                      <span>Total Reports:</span>
                      <strong>{activePt.item.count}</strong>
                    </div>
                    <div className="clean-tooltip-row">
                      <span>Read:</span>
                      <span>{activePt.item.read}</span>
                    </div>
                    <div className="clean-tooltip-row">
                      <span>Unread:</span>
                      <span>{activePt.item.unread}</span>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        {/* Incorporated Regular Admin Safeguarding Reports Section */}
        <div className="admins-table-card" style={{ marginBottom: '2rem' }}>
          <div className="table-card-header" style={{ marginBottom: '1.25rem' }}>
            <div>
              <h2 className="table-title">Safeguarding Reports Management</h2>
              <p className="table-subtitle">
                Review, filter, and process confidential safeguarding messages in real time.
              </p>
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div className="admin-controls-card" style={{ marginBottom: '1.5rem' }}>
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

          {/* Messages Sections Grid */}
          {messagesLoading ? (
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
                                Re: {message.reportedStaff.name} ({message.reportedStaff.role})
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
                                {message.threadToken}
                                {copiedToken === message.threadToken && <span className="copy-pop">Copied!</span>}
                              </span>
                              <span className="date-tag">
                                {new Date(message.createdAt || Date.now()).toLocaleString()}
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
                      <h2>Read Messages</h2>
                    </div>
                  </div>

                  {readMessages.length === 0 ? (
                    <div className="empty-state">
                      <div className="empty-icon"></div>
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
                                Re: {message.reportedStaff.name} ({message.reportedStaff.role})
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
                                {message.threadToken}
                                {copiedToken === message.threadToken && <span className="copy-pop">Copied!</span>}
                              </span>
                              <span className="date-tag">
                                {new Date(message.createdAt || Date.now()).toLocaleString()}
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
        </div>

        {/* Registered Admin Accounts Table Section */}
        <div className="admins-table-card">
          <div className="table-card-header">
            <div>
              <h2 className="table-title">Registered Administrator Accounts</h2>
              <p className="table-subtitle">
                System access accounts (Maximum 3 administrator accounts allowed)
              </p>
            </div>

            <div className="table-card-actions">
              <Link
                to="/admin/register"
                className={`table-reg-btn ${limitReached || adminCount >= 3 ? 'disabled' : ''}`}
                onClick={(e) => {
                  if (limitReached || adminCount >= 3) {
                    e.preventDefault();
                    alert('Admin registration limit reached (3/3). No more admin accounts can be registered.');
                  }
                }}
              >
                Register New Admin
              </Link>
            </div>
          </div>

          <div className="table-responsive">
            <table className="super-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Linked Staff Member</th>
                  <th>Account Created</th>
                  <th>Logins</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="8" className="empty-table-cell">
                      Loading administrator accounts…
                    </td>
                  </tr>
                ) : admins.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="empty-table-cell">
                      No admin accounts registered yet. Click "Register New Admin" to create one.
                    </td>
                  </tr>
                ) : (
                  admins.map((adm, index) => {
                    const adminId = adm.id || adm._id || '';
                    return (
                      <tr key={adminId || index}>
                        <td>
                          <span className="row-index">{index + 1}</span>
                        </td>
                        <td>
                          <strong className="admin-username-cell">{adm.username}</strong>
                        </td>
                        <td className="admin-email-cell">{adm.email}</td>
                        <td>
                          {adm.staffId ? (
                            <span className="staff-linked-tag">
                              {typeof adm.staffId === 'object' ? `${adm.staffId.name || adm.username} ${adm.staffId.role ? `(${adm.staffId.role})` : ''}` : adm.staffId}
                            </span>
                          ) : (
                            <span className="unlinked-tag">Not linked</span>
                          )}
                        </td>
                        <td>
                          {adm.createdAt ? new Date(adm.createdAt).toLocaleDateString() : 'N/A'}
                        </td>
                        <td>
                          <span className="login-count-pill">
                            {(adm.loginHistory && adm.loginHistory.length) || 0} logins
                          </span>
                        </td>
                        <td>
                          <span className="status-active-pill">Active</span>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="table-action-btn delete-admin-btn"
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
        </div>
      </main>
    </div>
  );
}

export default SuperAdmin;
