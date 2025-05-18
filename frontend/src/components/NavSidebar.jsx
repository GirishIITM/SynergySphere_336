import { faBars, faSearch, faSignOutAlt, faUser } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { clearAuthData, getCurrentUser } from '../../../utils/apicall';
import "../styles/navSidebar.css";
import Sidebar from './Sidebar';

const NavSidebar = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();
  const profileRef = useRef(null);
  const searchInputRef = useRef(null);
  const user = getCurrentUser();
  
  // Close profile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileMenuOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };
  
  const toggleProfileMenu = () => {
    setProfileMenuOpen(!profileMenuOpen);
  };

  const handleLogout = () => {
    clearAuthData();
    navigate('/login');
    setProfileMenuOpen(false);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      // Navigate to search results or handle search functionality
      console.log(`Searching for: ${searchTerm}`);
      // navigate(`/search?q=${encodeURIComponent(searchTerm)}`);
    }
  };

  const focusSearchInput = () => {
    searchInputRef.current?.focus();
  };

  return (
    <div className="nav-container">
      <nav className="navbar">
        <div className="navbar-left">
          <button className="sidebar-toggle" onClick={toggleSidebar} aria-label="Toggle sidebar">
            <FontAwesomeIcon icon={faBars} />
          </button>
          <div className="brand">
            <Link to="/">SynergySphere</Link>
          </div>
        </div>

        <div className='navbar-right'>
          <div className="search-container">
            <form className="search-wrapper" onSubmit={handleSearch}>
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search..."
                className="search-input"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <button 
                type="submit" 
                className="search-button"
                onClick={handleSearch}
                aria-label="Search"
              >
                <FontAwesomeIcon icon={faSearch} />
              </button>
            </form>
          </div>

          <div className="profile-container" ref={profileRef}>
            <div className="profile-icon" onClick={toggleProfileMenu}>
              {user?.name?.charAt(0).toUpperCase() || <FontAwesomeIcon icon={faUser} />}
            </div>
            
            {profileMenuOpen && (
              <div className="profile-dropdown">
                <div className="profile-dropdown-header">
                  <span className="profile-name">{user?.name || 'User'}</span>
                  <span className="profile-email">{user?.email || ''}</span>
                </div>
                <div className="profile-dropdown-divider"></div>
                <Link to="/profile" className="profile-dropdown-item" onClick={() => setProfileMenuOpen(false)}>
                  <span className="dropdown-icon"><FontAwesomeIcon icon={faUser} /></span>
                  My Profile
                </Link>
                <div className="profile-dropdown-divider"></div>
                <button className="profile-dropdown-item" onClick={handleLogout}>
                  <span className="dropdown-icon"><FontAwesomeIcon icon={faSignOutAlt} /></span>
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      <div className="main-content">
        <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />
        <div className="content-area">
          {children}
        </div>
      </div>
    </div>
  );
};

export default NavSidebar;
