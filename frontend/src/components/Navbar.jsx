import { Link, useLocation } from 'react-router-dom';
import "../styles/navbar.css";

function Navbar() {
  const location = useLocation();

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link to="/">My App</Link>
      </div>
      <div className="navbar-links">
        <Link to="/solutions/tasks" className={location.pathname === "/solutions/tasks" ? "active" : ""}>Tasks</Link>
        <Link to="/solutions/projects" className={location.pathname === "/solutions/projects" ? "active" : ""}>Projects</Link>
        <Link to="/about" className={location.pathname === "/about" ? "active" : ""}>About</Link>
        <Link to="/register" className={location.pathname === "/register" ? "active" : ""}>Register</Link>
        <Link to="/login" className={location.pathname === "/login" ? "active" : ""}>Login</Link>
      </div>
    </nav>
  );
}

export default Navbar;
