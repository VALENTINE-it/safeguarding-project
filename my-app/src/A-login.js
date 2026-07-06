import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';

function AdminLogin() {
  return (
    <>
    
    <div className="admin-page">
      <h1>Admin Page</h1>
      <p>Welcome to the admin page. Here you can manage the application and view Reports.</p>
    </div>

    <h1 className="admin-login">
      Login to Admin Page
    </h1>

    <form className="admin-form">
      <label>
        Username/Email:
        <input type="text" name="username" placeholder="Enter your username or email" />
      </label>
      <br />
      <label>
        Password:
        <input type="password" name="password" placeholder="Enter your password" />
      </label>
      <br />
      <button type="submit">Login</button>
      <br />
      <p>Forgot your password? <a href="#">Reset Password</a></p>
      <p>have an account? <a href="#">Sign Up</a></p>
    </form>

    </>
  );
}