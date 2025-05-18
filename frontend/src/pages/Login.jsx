import React from 'react'
import '../login.css';

export default function Login() {
  return (
    <div className="login-container">
      <h1 className="login-title">Login into account</h1>
      <form className="login-form">
        <div>
          <label htmlFor="login-email">Email:</label>
          <input type="email" id="login-email" name="email" required />
        </div>
        <div>
          <label htmlFor="login-password">Password:</label>
          <input type="password" id="login-password" name="password" required />
        </div>
        <button type="submit">Login</button>
      </form>
      <p className="login-link-text">
        Don’t have an account?{" "}
        <a href="/register" id="signup-link">
          Sign Up
        </a>
      </p>
    </div>
  )
}
