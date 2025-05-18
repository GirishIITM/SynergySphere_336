import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import "../styles/sidebar.css";

const Sidebar = ({ isOpen, onClose }) => {
  const location = useLocation();
  const [darkMode, setDarkMode] = useState(false);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle('theme-dark');
  };

  return (
    <div className={`sidebar ${isOpen ? 'open' : ''} ${darkMode ? 'dark' : ''}`}>
      <div className="navigation-section">
        <h2 className="section-title">
          Navigation
          <button className="close-sidebar" onClick={onClose}>X</button>
        </h2>
        <ul className="nav-list">
          <li className={`nav-item ${location.pathname === "/solutions/tasks" ? "active" : ""}`}>
            <Link 
              to="/solutions/tasks" 
              onClick={onClose}
            >
              <span className="nav-icon">📋</span>
              Tasks
            </Link>
          </li>
          <li className={`nav-item ${location.pathname === "/solutions/projects" ? "active" : ""}`}>
            <Link 
              to="/solutions/projects" 
              onClick={onClose}
            >
              <span className="nav-icon">📁</span>
              Projects
            </Link>
          </li>
        </ul>
        
        <button className="dark-mode-toggle" onClick={toggleDarkMode}>
          {darkMode ? '🌙 Dark Mode' : '☀️ Light Mode'}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
