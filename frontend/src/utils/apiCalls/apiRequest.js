// export const API_BASE_URL = "https://odoo336-akhta2hvagf3czda.southindia-01.azurewebsites.net"
export const API_BASE_URL = "http://localhost:5000";

export const loadingState = {
  states: {},
  listeners: {},

  setLoading: (requestKey, isLoading) => {
    loadingState.states[requestKey] = isLoading;
    if (loadingState.listeners[requestKey]) {
      loadingState.listeners[requestKey].forEach(callback => callback(isLoading));
    }
  },

  isLoading: (requestKey) => {
    return !!loadingState.states[requestKey];
  },

  isAnyLoading: () => {
    return Object.values(loadingState.states).some(loading => loading);
  },

  reset: () => {
    loadingState.states = {};
  },

  subscribe: (requestKey, callback) => {
    if (!loadingState.listeners[requestKey]) {
      loadingState.listeners[requestKey] = [];
    }
    loadingState.listeners[requestKey].push(callback);
    
    return () => {
      loadingState.listeners[requestKey] = loadingState.listeners[requestKey].filter(cb => cb !== callback);
    };
  }
};

// Simple connection state
export const connectionState = {
  isOnline: true,
  listeners: new Set(),

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  },

  setOnline(isOnline) {
    if (this.isOnline !== isOnline) {
      this.isOnline = isOnline;
      this.listeners.forEach(callback => callback(isOnline));
    }
  }
};

/**
 * Enhanced API request with loading state tracking and token refresh
 * @param {string} endpoint - API endpoint
 * @param {string} method - HTTP method
 * @param {object} data - Request payload
 * @param {string} loadingKey - Optional key to track loading state
 * @returns {Promise} - Response promise
 */
export const apiRequest = async (endpoint, method = 'GET', data = null, loadingKey = null) => {
  if (loadingKey) {
    loadingState.setLoading(loadingKey, true);
  }

  const options = {
    method,
    headers: {},
  };

  if (data instanceof FormData) {
    options.body = data;
  } else if (data) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(data);
  } else {
    options.headers['Content-Type'] = 'application/json';
  }

  const token = localStorage.getItem('access_token');
  if (token && !endpoint.startsWith('/auth/login') && !endpoint.startsWith('/auth/register')) {
    options.headers.Authorization = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, options);

    let result;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      result = await response.json();
    } else {
      const text = await response.text();
      result = { error: `Server returned non-JSON response: ${response.status}` };
    }

    if (loadingKey) {
      loadingState.setLoading(loadingKey, false);
    }

    connectionState.setOnline(true);

    if (response.status === 401 && (result.msg === "Token has expired" || result.error === "Token has expired")) {
      console.log("Access token expired, attempting refresh...");
      const { handleTokenRefresh } = await import('./auth.js');
      const refreshSuccess = await handleTokenRefresh();
      if (refreshSuccess) {
        console.log("Token refreshed, retrying request...");
        return apiRequest(endpoint, method, data, loadingKey);
      } else {
        throw new Error("Session expired. Please login again.");
      }
    }

    if (!response.ok) {
      throw new Error(result.error || result.msg || 'An error occurred');
    }

    return result;
  } catch (error) {
    console.error('API request error:', error);

    if (loadingKey) {
      loadingState.setLoading(loadingKey, false);
    }

    // Update connection state for network errors
    if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
      connectionState.setOnline(false);
      throw new Error('Unable to connect to server. Please check your internet connection.');
    }

    if (error.name === 'AbortError') {
      throw new Error('Request timeout: The server took too long to respond.');
    }

    throw error;
  }
};
