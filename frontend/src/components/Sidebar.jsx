import React from 'react';
import { Link } from 'react-router-dom';
import "../styles/sidebar.css";

const Sidebar = () => {
  return (
    <>
      <div className="sidebar">
        <div className="navigation-section">
          <h2 className="section-title">Navigation</h2>
          <ul className="nav-list">
            <li className="nav-item">
              <Link to="/solutions/tasks">
                <span className="nav-icon">📋</span>
                Tasks
              </Link>
            </li>
            <li className="nav-item">
              <Link to="/solutions/projects">
                <span className="nav-icon">📁</span>
                Projects
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
