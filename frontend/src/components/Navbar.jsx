import { Link } from 'react-router-dom';
import "../styles/navbar.css";

function Navbar() {
  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link to="/">Synergy Sphere</Link>
      </div>
      <div className="navbar-links">
        <Link to="/solutions/tasks">Tasks</Link>
        <Link to="/solutions/projects">Projects</Link>
        <Link to="/about">About</Link>
        <Link to="/register">Register</Link>
        <Link to="/login">Login</Link>
      </div>
    </nav>
  );
}

export default Navbar;
 