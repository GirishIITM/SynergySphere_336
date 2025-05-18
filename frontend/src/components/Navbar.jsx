import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { isAuthenticated, clearAuthData } from '../../../utils/apicall';
import "../styles/navbar.css";

function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const authenticated = isAuthenticated();
  
  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  const closeMenu = () => {
    setMenuOpen(false);
  };

  const handleLogout = () => {
    clearAuthData();
    navigate('/login');
    closeMenu();
  };

  // Helper function to check if link is active
  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link to="/">SynergySphere</Link>
      </div>
      
      <button className="navbar-toggle" onClick={toggleMenu}>
        {menuOpen ? '✕' : '☰'}
      </button>
      
      <div className={`navbar-links ${menuOpen ? 'open' : ''}`}>
        {authenticated && (
          <>
            <Link 
              to="/solutions/tasks" 
              className={isActive("/solutions/tasks") ? "active" : ""}
              onClick={closeMenu}
            >
              Tasks
            </Link>
            <Link 
              to="/solutions/projects" 
              className={isActive("/solutions/projects") ? "active" : ""}
              onClick={closeMenu}
            >
              Projects
            </Link>
          </>
        )}
        
        <Link 
          to="/about" 
          className={isActive("/about") ? "active" : ""}
          onClick={closeMenu}
        >
          About
        </Link>
        
        {authenticated ? (
          <button 
            onClick={handleLogout}
            className="logout-button"
          >
            Logout
          </button>
        ) : (
          <>
            <Link 
              to="/register" 
              className={isActive("/register") ? "active" : ""}
              onClick={closeMenu}
            >
              Register
            </Link>
            <Link 
              to="/login" 
              className={isActive("/login") ? "active" : ""}
              onClick={closeMenu}
            >
              Login
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
