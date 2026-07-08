import React from 'react';
import { Link } from 'react-router-dom';
import './form.css';

const adminsData = [
  { id: '1', name: 'VIP Clients', time: '4 ad accounts', dates: '231 active campaigns', period: 'Feb 2020' },
  { id: '2', name: 'Audiences A', time: '3 ad accounts', dates: '150 active entries', period: 'Mar 2021' },
  { id: '3', name: 'Audiences B', time: '2 ad accounts', dates: '88 active entries', period: 'Jun 2021' },
  { id: '4', name: 'Audiences C', time: '1 ad account', dates: '12 active campaigns', period: 'Sep 2022' },
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
