/**
 * Cache Management Utility
 * Handles clearing various types of cache on page refresh
 */

// Cache keys that should be cleared on refresh (excluding authentication data)
const CACHE_KEYS_TO_CLEAR = [
  'projects_cache',
  'tasks_cache',
  'dashboard_cache',
  'analytics_cache',
  'notifications_cache',
  'messages_cache',
  'user_profile_cache',
  'project_details_cache',
  'task_details_cache',
  'finance_cache'
];

// Session storage keys to clear
const SESSION_KEYS_TO_CLEAR = [
  'temp_data',
  'form_draft',
  'search_results',
  'filter_state',
  'pagination_state'
];

/**
 * Clear all cache data except authentication tokens
 */
export const clearApplicationCache = async () => {
  try {
    // Clear specific localStorage cache keys
    CACHE_KEYS_TO_CLEAR.forEach(key => {
      localStorage.removeItem(key);
    });

    // Clear session storage
    SESSION_KEYS_TO_CLEAR.forEach(key => {
      sessionStorage.removeItem(key);
    });

    // Clear browser cache for API responses (if using browser cache)
    if ('caches' in window) {
      caches.keys().then(cacheNames => {
        cacheNames.forEach(cacheName => {
          if (cacheName.includes('api-cache') || cacheName.includes('app-cache')) {
            caches.delete(cacheName);
          }
        });
      });
    }

    // Reset any in-memory caches
    await resetInMemoryCache();

    console.log('Application cache cleared successfully');
  } catch (error) {
    console.error('Error clearing application cache:', error);
  }
};

/**
 * Reset in-memory cache objects
 */
const resetInMemoryCache = async () => {
  try {
    // Reset Google client cache but preserve valid client ID
    const authModule = await import('./apiCalls/auth.js');
    if (authModule.googleClientCache && typeof authModule.googleClientCache.clear === 'function') {
      // Don't clear if it's still valid and not expired
      if (!authModule.googleClientCache.isValid || authModule.googleClientCache.isExpired()) {
        authModule.googleClientCache.clear();
      }
    }

    // Reset loading states
    const apiModule = await import('./apiCalls/apiRequest.js');
    if (apiModule.loadingState && typeof apiModule.loadingState.reset === 'function') {
      apiModule.loadingState.reset();
    }
  } catch (error) {
    console.warn('Error resetting in-memory cache:', error);
  }
};

/**
 * Clear cache and force page refresh
 */
export const clearCacheAndRefresh = async () => {
  await clearApplicationCache();
  window.location.reload();
};

/**
 * Set up automatic cache clearing on page refresh
 */
export const setupCacheClearingOnRefresh = () => {
  // Listen for beforeunload event to clear cache
  const handleBeforeUnload = () => {
    clearApplicationCache().catch(console.error);
  };

  // Listen for visibilitychange to clear cache when page becomes visible again
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      // Clear cache when user returns to the page
      clearApplicationCache().catch(console.error);
    }
  };

  // Listen for storage events to sync cache clearing across tabs
  const handleStorageChange = (e) => {
    if (e.key === 'clear_cache_trigger') {
      clearApplicationCache().catch(console.error);
    }
  };

  // Add event listeners
  window.addEventListener('beforeunload', handleBeforeUnload);
  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('storage', handleStorageChange);

  // Clear cache on initial load
  clearApplicationCache().catch(console.error);

  // Return cleanup function
  return () => {
    window.removeEventListener('beforeunload', handleBeforeUnload);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('storage', handleStorageChange);
  };
};

/**
 * Trigger cache clearing across all tabs
 */
export const triggerCacheClearAcrossTabs = () => {
  localStorage.setItem('clear_cache_trigger', Date.now().toString());
  localStorage.removeItem('clear_cache_trigger');
};

/**
 * Add no-cache headers to prevent browser caching
 */
export const addNoCacheHeaders = () => {
  // Add meta tags to prevent caching
  const addMetaTag = (name, content) => {
    const existing = document.querySelector(`meta[name="${name}"]`);
    if (existing) {
      existing.setAttribute('content', content);
    } else {
      const meta = document.createElement('meta');
      meta.setAttribute('name', name);
      meta.setAttribute('content', content);
      document.head.appendChild(meta);
    }
  };

  addMetaTag('cache-control', 'no-cache, no-store, must-revalidate');
  addMetaTag('pragma', 'no-cache');
  addMetaTag('expires', '0');
};

/**
 * Enhanced fetch wrapper that adds no-cache headers
 */
export const fetchWithNoCache = (url, options = {}) => {
  const noCacheOptions = {
    ...options,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      ...options.headers
    }
  };

  return fetch(url, noCacheOptions);
};

/**
 * Clear specific cache by key
 */
export const clearSpecificCache = (cacheKey) => {
  try {
    localStorage.removeItem(cacheKey);
    sessionStorage.removeItem(cacheKey);
    console.log(`Cache cleared for key: ${cacheKey}`);
  } catch (error) {
    console.error(`Error clearing cache for key ${cacheKey}:`, error);
  }
};

/**
 * Check if cache should be cleared based on version or timestamp
 */
export const shouldClearCache = () => {
  const lastClearTime = localStorage.getItem('last_cache_clear');
  const currentTime = Date.now();
  const twentyFourHours = 24 * 60 * 60 * 1000;

  // Clear cache if it's been more than 24 hours or if it's the first visit
  return !lastClearTime || (currentTime - parseInt(lastClearTime)) > twentyFourHours;
};

/**
 * Update last cache clear timestamp
 */
export const updateLastClearTime = () => {
  localStorage.setItem('last_cache_clear', Date.now().toString());
}; 