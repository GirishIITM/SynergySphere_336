import React from 'react';
import { Atom } from 'react-loading-indicators';
import '../styles/LoadingIndicator.css';

/**
 * Loading indicator component that displays an animated atom
 * @param {Object} props - Component props
 * @param {boolean} props.loading - Whether the component should show the loading state
 * @param {string} props.size - Size of the loading indicator ("small", "medium", "large")
 * @param {React.ReactNode} props.children - Content to render when not loading
 * @returns {React.ReactNode} - Loading indicator or children
 */
const LoadingIndicator = ({ loading = false, size = "large", children }) => {
  if (loading) {
    return (
      <div className="loading-overlay">
        <div className="loading-container">
          <div className="loading-content">
            <Atom color="#2563eb" size={size} text="" textColor="" />
          </div>
        </div>
      </div>
    );
  }
  
  return children;
};

export default LoadingIndicator;
