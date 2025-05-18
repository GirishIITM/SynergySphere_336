const API_BASE_URL =  'http://localhost:5000';

/**
 * Loading state management
 */
export const loadingState = {
  // Store loading states for different request types
  states: {},
  
  // Store event listeners
  listeners: {},
  
  /**
   * Set loading state for a specific request type
   * @param {string} requestKey - Unique key to identify the request
   * @param {boolean} isLoading - Loading status
   */
  setLoading: (requestKey, isLoading) => {
    loadingState.states[requestKey] = isLoading;
    
    // Notify any listeners for this request
    if (loadingState.listeners[requestKey]) {
      loadingState.listeners[requestKey].forEach(callback => callback(isLoading));
    }
  },
  
  /**
   * Get loading state for a specific request
   * @param {string} requestKey - Unique key to identify the request
   * @returns {boolean} - Current loading state (defaults to false)
   */
  isLoading: (requestKey) => {
    return !!loadingState.states[requestKey];
  },
  
  /**
   * Check if any requests are currently loading
   * @returns {boolean} - True if any request is loading
   */
  isAnyLoading: () => {
    return Object.values(loadingState.states).some(state => state === true);
  },
  
  /**
   * Subscribe to loading state changes
   * @param {string} requestKey - Unique key to identify the request
   * @param {function} callback - Function to call when loading state changes
   * @returns {function} - Unsubscribe function
   */
  subscribe: (requestKey, callback) => {
    if (!loadingState.listeners[requestKey]) {
      loadingState.listeners[requestKey] = [];
    }
    
    loadingState.listeners[requestKey].push(callback);
    
    // Return unsubscribe function
    return () => {
      loadingState.listeners[requestKey] = 
        loadingState.listeners[requestKey].filter(cb => cb !== callback);
    };
  }
};

/**
 * Enhanced API request with loading state tracking
 * @param {string} endpoint - API endpoint
 * @param {string} method - HTTP method
 * @param {object} data - Request payload
 * @param {string} loadingKey - Optional key to track loading state
 * @returns {Promise} - Response promise
 */
const apiRequest = async (endpoint, method = 'GET', data = null, loadingKey = null) => {
  // Set loading state if loadingKey is provided
  if (loadingKey) {
    loadingState.setLoading(loadingKey, true);
  }
  
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  // Add token to headers if available
  const token = localStorage.getItem('token');
  if (token) {
    options.headers.Authorization = `Bearer ${token}`;
  }

  if (data) {
    options.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'An error occurred');
    }
    
    // Reset loading state
    if (loadingKey) {
      loadingState.setLoading(loadingKey, false);
    }
    
    return result;
  } catch (error) {
    console.error('API request error:', error);
    
    // Reset loading state on error too
    if (loadingKey) {
      loadingState.setLoading(loadingKey, false);
    }
    
    throw error;
  }
};

/**
 * Authentication API functions
 */
export const authAPI = {
  /**
   * Register a new user
   * @param {string} email - User email
   * @param {string} password - User password
   * @param {string} name - User name
   * @returns {Promise} - Registration response
   */
  register: (email, password, name) => {
    return apiRequest('/auth/register', 'POST', { email, password, name }, 'auth-register');
  },

  /**
   * Login an existing user
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise} - Login response with token and user data
   */
  login: (email, password) => {
    return apiRequest('/auth/login', 'POST', { email, password }, 'auth-login');
  },

  /**
   * Request password reset for an email
   * @param {string} email - User email
   * @returns {Promise} - Password reset response
   */
  forgotPassword: async (email) => {
    loadingState.setLoading('auth-forgot-password', true);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email })
      });
      
      loadingState.setLoading('auth-forgot-password', false);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to process password reset request');
      }
      
      return data;
    } catch (error) {
      loadingState.setLoading('auth-forgot-password', false);
      throw error;
    }
  },

  /**
   * Logout the current user
   * @param {string} email - User email
   * @returns {Promise} - Logout response
   */
  logout: () => {
    // Get the current user's email from local storage to pass in the request
    const user = getCurrentUser();
    const email = user ? user.email : '';
    return apiRequest('/auth/logout', 'POST', { email }, 'auth-logout');
  }
};

/**
 * Project related API functions
 */
export const projectAPI = {
  /**
   * Get all projects
   * @returns {Promise} - Projects list response
   */
  getAllProjects: () => {
    return apiRequest('/auth/projects', 'GET', null, 'projects-get-all');
  },

  /**
   * Create a new project
   * @param {string} name - Project name
   * @param {number} creator_id - ID of the user creating the project
   * @returns {Promise} - Created project response
   */
  createProject: (name, creator_id) => {
    return apiRequest('/auth/projects', 'POST', { name, creator_id }, 'projects-create');
  },

  /**
   * Update an existing project
   * @param {number} projectId - Project ID
   * @param {object} projectData - Updated project data
   * @returns {Promise} - Updated project response
   */
  updateProject: (projectId, projectData) => {
    return apiRequest(`/auth/projects/${projectId}`, 'PUT', projectData, `projects-update-${projectId}`);
  },

  /**
   * Delete a project
   * @param {number} projectId - Project ID
   * @returns {Promise} - Delete response
   */
  deleteProject: (projectId) => {
    return apiRequest(`/auth/projects/${projectId}`, 'DELETE', null, `projects-delete-${projectId}`);
  }
};

/**
 * Task related API functions
 */
export const taskAPI = {
  /**
   * Get all tasks
   * @returns {Promise} - Tasks list response
   */
  getAllTasks: () => {
    return apiRequest('/auth/tasks', 'GET', null, 'tasks-get-all');
  },

  /**
   * Create a new task
   * @param {number} project_id - Project ID
   * @param {string} title - Task title
   * @param {string} description - Task description
   * @param {string} due_date - Due date in YYYY-MM-DD format
   * @param {string} status - Task status
   * @returns {Promise} - Created task response
   */
  createTask: (project_id, title, description, due_date, status) => {
    return apiRequest(
      '/auth/tasks', 
      'POST', 
      { project_id, title, description, due_date, status }, 
      'tasks-create'
    );
  },

  /**
   * Update an existing task
   * @param {number} taskId - Task ID
   * @param {number} project_id - Project ID
   * @param {string} title - Task title
   * @param {string} description - Task description
   * @param {string} due_date - Due date in YYYY-MM-DD format
   * @param {string} status - Task status
   * @returns {Promise} - Updated task response
   */
  updateTask: (taskId, project_id, title, description, due_date, status) => {
    return apiRequest(
      `/auth/tasks/${taskId}`, 
      'PUT', 
      { project_id, title, description, due_date, status }, 
      `tasks-update-${taskId}`
    );
  },

  /**
   * Delete a task
   * @param {number} taskId - Task ID
   * @param {number} project_id - Project ID the task belongs to
   * @returns {Promise} - Delete response
   */
  deleteTask: (taskId, project_id) => {
    return apiRequest(`/auth/tasks/${taskId}`, 'DELETE', { project_id }, `tasks-delete-${taskId}`);
  }
};

/**
 * Store authentication data in localStorage
 * @param {string} token - JWT token
 * @param {object} userData - User information
 */
export const saveAuthData = (token, userData) => {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(userData));
};

/**
 * Clear authentication data from localStorage
 */
export const clearAuthData = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

/**
 * Check if user is authenticated
 * @returns {boolean} - Authentication status
 */
export const isAuthenticated = () => {
  return !!localStorage.getItem('token');
};

/**
 * Get current user data
 * @returns {object|null} - User data or null if not logged in
 */
export const getCurrentUser = () => {
  const userData = localStorage.getItem('user');
  return userData ? JSON.parse(userData) : null;
};

export default {
  authAPI,
  projectAPI,
  taskAPI,
  saveAuthData,
  clearAuthData,
  isAuthenticated,
  getCurrentUser,
  loadingState
};
