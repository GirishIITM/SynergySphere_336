import React from "react";

function Register() {
  return (
    <div className="page">
      <h1>Register</h1>
      <form>
        <div>
          <label htmlFor="register-email">Email:</label>
          <input type="email" id="register-email" name="email" required />
        </div>
        <div>
          <label htmlFor="register-password">Password:</label>
          <input type="password" id="register-password" name="password" required />
        </div>
        <button type="submit">Register</button>
      </form>
    </div>
  );
}

export default Register;