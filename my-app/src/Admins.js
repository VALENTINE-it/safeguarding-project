import React from 'react';
import { Link } from 'react-router-dom';
import './form.css';

const adminsData = [
  { id: '1', name: 'VIP Admin', time: 'N/A', dates: ' N/A', period: 'N/A' },
  { id: '2', name: 'Admin-Name A', time: 'N/A', dates: ' N/A', period: 'N/A' },
  { id: '3', name: 'Admin-Name B', time: 'N/A', dates: ' N/A', period: 'N/A' },
  { id: '4', name: 'Admin-Name C', time: 'N/A', dates: ' N/A', period: 'N/A' },
];

function Admins() {
  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="page-header">
          <h1 className="auth-title">Admins Overview</h1>
          <p className="auth-copy">Same admin dashboard style, now showing admin rows with time, dates, and month/year columns.</p>
        </div>

        <section className="admins-table-section">
          <div className="admins-table-header">
            <span>Name</span>
            <span>Time</span>
            <span>Dates</span>
            <span>Month / Year</span>
          </div>
          <ul className="admins-table-list">
            {adminsData.map((admin) => (
              <li key={admin.id} className="admin-row">
                <div className="admin-name">{admin.name}</div>
                <div className="admin-meta">{admin.time}</div>
                <div className="admin-meta">{admin.dates}</div>
                <div className="admin-meta">{admin.period}</div>
              </li>
            ))}
          </ul>
        </section>

        <div className="page-links-row">
          <Link to="/admin" className="auth-button">
            Go to Message Admin Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Admins;
