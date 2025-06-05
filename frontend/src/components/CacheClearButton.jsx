import React from 'react';
import { clearCacheAndRefresh, triggerCacheClearAcrossTabs } from '../utils/cacheManager';

/**
 * Cache Clear Button Component
 * Provides manual cache clearing functionality
 * 
 * @param {Object} props - Component props
 * @param {string} props.variant - Button variant ('primary', 'secondary', 'danger')
 * @param {string} props.size - Button size ('sm', 'md', 'lg')
 * @param {boolean} props.showIcon - Whether to show refresh icon
 * @param {string} props.label - Button label text
 * @param {Function} props.onClearSuccess - Callback after successful cache clear
 * @param {boolean} props.clearAllTabs - Whether to clear cache across all tabs
 */
const CacheClearButton = ({
  variant = 'secondary',
  size = 'md',
  showIcon = true,
  label = 'Clear Cache',
  onClearSuccess,
  clearAllTabs = false
}) => {
  const handleClearCache = async () => {
    try {
      if (clearAllTabs) {
        triggerCacheClearAcrossTabs();
      }
      
      // Show confirmation dialog
      const confirmed = window.confirm(
        'This will clear all cached data and refresh the page. Continue?'
      );
      
      if (confirmed) {
        if (onClearSuccess) {
          await onClearSuccess();
        }
        clearCacheAndRefresh();
      }
    } catch (error) {
      console.error('Error clearing cache:', error);
      alert('Failed to clear cache. Please try refreshing the page manually.');
    }
  };

  const getButtonClasses = () => {
    const baseClasses = 'inline-flex items-center justify-center font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';
    
    const sizeClasses = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-sm',
      lg: 'px-6 py-3 text-base'
    };
    
    const variantClasses = {
      primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
      secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500',
      danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500'
    };
    
    return `${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]}`;
  };

  return (
    <button
      onClick={handleClearCache}
      className={getButtonClasses()}
      title="Clear application cache and refresh"
      type="button"
    >
      {showIcon && (
        <svg
          className={`${size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4'} ${label ? 'mr-2' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
      )}
      {label}
    </button>
  );
};

/**
 * Cache Status Display Component
 * Shows current cache status and last clear time
 */
export const CacheStatus = () => {
  const [lastClearTime, setLastClearTime] = React.useState(null);
  const [cacheSize, setCacheSize] = React.useState(0);

  React.useEffect(() => {
    const updateCacheInfo = () => {
      const lastClear = localStorage.getItem('last_cache_clear');
      if (lastClear) {
        setLastClearTime(new Date(parseInt(lastClear)));
      }

      // Estimate cache size
      let size = 0;
      for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          size += localStorage[key].length;
        }
      }
      setCacheSize(Math.round(size / 1024)); // Convert to KB
    };

    updateCacheInfo();
    
    // Update every 30 seconds
    const interval = setInterval(updateCacheInfo, 30000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="text-xs text-gray-500 space-y-1">
      <div>Cache size: ~{cacheSize}KB</div>
      {lastClearTime && (
        <div>Last cleared: {lastClearTime.toLocaleString()}</div>
      )}
    </div>
  );
};

export default CacheClearButton; 