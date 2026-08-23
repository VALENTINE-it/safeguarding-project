import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../form.css';
import './SuperAdmin.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function SuperAdmin() {
  const [messages, setMessages] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [adminCount, setAdminCount] = useState(0);
  const [limitReached, setLimitReached] = useState(false);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('12months');
  const [superAdminName, setSuperAdminName] = useState('Super Admin');
  const [hoveredMonth, setHoveredMonth] = useState(null);
  
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

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch all messages for monthly complaint graph
      const msgRes = await fetch(`${API_URL}/api/messages`);
      const msgData = await msgRes.json();
      if (msgData.success) {
        setMessages(msgData.messages || []);
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

    // Populate counts from messages
    messages.forEach((msg) => {
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
  const totalComplaints = messages.length;
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
        <div className="super-header-left">
          <span className="super-badge">SUPER ADMIN PORTAL</span>
          <div className="super-user-info">
            <span className="super-avatar">S</span>
            <span className="super-name">{superAdminName}</span>
          </div>
        </div>

        <div className="super-header-right">
          {/* Theme Toggle Button (Light mode default) */}
          <button
            type="button"
            className="theme-toggle-btn"
            onClick={toggleTheme}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '10px',
              border: '1px solid #cbd5e1',
              background: theme === 'light' ? '#ffffff' : '#1e293b',
              color: theme === 'light' ? '#0f172a' : '#f8fafc',
              fontWeight: '600',
              cursor: 'pointer',
              fontSize: '0.85rem',
            }}
          >
            {theme === 'light' ? 'Dark Mode' : 'Light Mode (Default)'}
          </button>

          <Link to="/admin/staff" className="super-nav-btn staff-btn">
            Staff Management
          </Link>
          <Link to="/admin" className="super-nav-btn admin-link-btn">
            Regular Admin Dashboard
          </Link>
          <Link to="/admin/register" className="super-nav-btn reg-btn">
            Register Admin
          </Link>
          <button
            type="button"
            className="super-logout-btn"
            onClick={() => {
              localStorage.removeItem('superAdminAuth');
              localStorage.removeItem('superAdminUser');
              localStorage.removeItem('adminAuth');
              localStorage.removeItem('adminUser');
              navigate('/admin/super/login');
            }}
          >
            Logout
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
              Comprehensive overview of safeguarding complaints, staff management, and regular admin accounts.
            </p>
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
                      left: `${leftPct}%`,
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
