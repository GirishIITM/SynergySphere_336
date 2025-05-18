
  return (
    <div className="page">
      <h1>Login</h1>
      <form>
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
    </div>
  );
}

export default Login;