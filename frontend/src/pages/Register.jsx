import React from "react";
import "../register.css";

function Register() {
  return (
    <div className="register-container">
      <h1 className="register-title">Create an account</h1>
      <form className="register-form">
        <div>
          <label htmlFor="register-firstname">First Name:</label>
          <input type="text" id="register-firstname" name="firstname" required />
        </div>
        <div>
          <label htmlFor="register-lastname">Last Name:</label>
          <input type="text" id="register-lastname" name="lastname" required />
        </div>
        <div>
          <label htmlFor="register-email">Email:</label>
          <input type="email" id="register-email" name="email" required />
        </div>
        <div>
          <label htmlFor="register-password">Password:</label>
          <input type="password" id="register-password" name="password" required />
        </div>
        <button type="submit">Create an account</button>
      </form>
      <p className="register-link-text">
        Already have an account?{" "}
        <a href="/login" id="login-link">
          Login
        </a>
      </p>
    </div>
  );
}

export default Register;