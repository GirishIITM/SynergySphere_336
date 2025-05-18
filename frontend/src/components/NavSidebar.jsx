import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from './Sidebar';
import "../styles/navSidebar.css";

const NavSidebar = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
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

          <div className="profile-container">
            <div className="profile-icon">
              👤
            </div>
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
