import { faBars, faClose, faProjectDiagram } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import "../styles/navbar.css";
import { authState, clearAuthData, isAuthenticated } from '../utils/apiCalls/auth';
import { Button } from './ui/button';

function Navbar({ showWhenAuthenticated = false }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [authenticated, setAuthenticated] = useState(isAuthenticated);

  useEffect(() => {
    const unsubscribe = authState.subscribe((isAuth) => {
      setAuthenticated(isAuth);
    });
    
    setAuthenticated(isAuthenticated());
    return unsubscribe;
  }, []);

  // Don't render navbar for authenticated users unless explicitly allowed
  if (authenticated && !showWhenAuthenticated) {
    return null;
  }

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  const closeMenu = () => {
    setMenuOpen(false);
  };

  const handleLogout = async () => {
    try {
      clearAuthData();
      closeMenu();
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link to="/">
          <span>SynergySphere</span>
        </Link>
      </div>

      <div className="navbar-right">
        <div className={`navbar-links ${menuOpen ? 'open' : ''}`}>
          <Button asChild variant="ghost" className={isActive("/about") ? "bg-accent" : ""}>
            <Link
              to="/about"
              onClick={closeMenu}
            >
              <i className="fas fa-info-circle"></i>
              <span>About</span>
            </Link>
          </Button>

          <Button asChild variant="outline" className={isActive("/register") ? "bg-accent" : ""}>
            <Link
              to="/register"
              onClick={closeMenu}
            >
              <i className="fas fa-user-plus"></i>
              <span>Register</span>
            </Link>
          </Button>
          
          <Button asChild variant="default" className={isActive("/login") ? "bg-primary/90" : ""}>
            <Link
              to="/login"
              onClick={closeMenu}
            >
              <i className="fas fa-sign-in-alt"></i>
              <span>Login</span>
            </Link>
          </Button>
        </div>

        <Button 
          className="navbar-toggle" 
          onClick={toggleMenu} 
          aria-label="Toggle menu"
          variant="ghost"
          size="icon"
        >
          <FontAwesomeIcon icon={menuOpen ? faClose : faBars} />
        </Button>
      </div>
    </nav>
  );
}

export default Navbar;
