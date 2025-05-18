import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import { clearAuthData, getCurrentUser } from '../../../utils/apicall';
import "../styles/navSidebar.css";

const NavSidebar = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const profileRef = useRef(null);
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

  return (
    <div className="nav-container">
      <nav className="navbar">
        <button className="sidebar-toggle" onClick={toggleSidebar}>
          ☰
        </button>
        <div className="brand">
          <Link to="/">SynergySphere</Link>
        </div>
        <div className='navbar-links'>
          <div className="search-container">
            <div className="search-wrapper">
              <input
                type="text"
                placeholder="Search..."
                className="search-input"
              />
              <button className="search-button">
                🔍
              </button>
            </div>
          </div>

          <div className="profile-container" ref={profileRef}>
            <div className="profile-icon" onClick={toggleProfileMenu}>
              {user?.name?.charAt(0).toUpperCase() || '👤'}
            </div>
            
            {profileMenuOpen && (
              <div className="profile-dropdown">
                <div className="profile-dropdown-header">
                  <span className="profile-name">{user?.name || 'User'}</span>
                  <span className="profile-email">{user?.email || ''}</span>
                </div>
                <div className="profile-dropdown-divider"></div>
                <Link to="/profile" className="profile-dropdown-item" onClick={() => setProfileMenuOpen(false)}>
                  <span className="dropdown-icon">👤</span>
                  My Profile
                </Link>
                <button className="profile-dropdown-item" onClick={handleLogout}>
                  <span className="dropdown-icon">🚪</span>
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
