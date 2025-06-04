import { API_BASE_URL, apiRequest, loadingState } from "/src/utils/apiCalls/apiRequest.js";

// Client ID cache with connection-aware management
const googleClientCache = {
  clientId: null,
  lastFetchTime: null,
  isValid: false,
  lastError: null,
  CACHE_DURATION: 24 * 60 * 60 * 1000, // 24 hours
  RETRY_DELAY: 5 * 60 * 1000, // 5 minutes after error

  isExpired() {
    if (!this.lastFetchTime) return true;
    return Date.now() - this.lastFetchTime > this.CACHE_DURATION;
  },

  canRetry() {
    if (!this.lastError) return true;
    return Date.now() - this.lastError > this.RETRY_DELAY;
  },

  setClientId(clientId) {
    this.clientId = clientId;
    this.lastFetchTime = Date.now();
    this.isValid = true;
    this.lastError = null;
  },

  setError() {
    this.lastError = Date.now();
    this.isValid = false;
  },

  clear() {
    this.clientId = null;
    this.lastFetchTime = null;
    this.isValid = false;
    this.lastError = null;
  }
};

/**
 * Check if token is expired
 * @param {string} token - JWT token
 * @returns {boolean} - True if expired
 */
const isTokenExpired = (token) => {
  if (!token) return true;

  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    const currentTime = Date.now() / 1000;
    return payload.exp < currentTime;
  } catch (error) {
    return true;
  }
};

/**
 * Ensure we have a valid access token
 */
const ensureValidToken = async () => {
  const accessToken = localStorage.getItem("access_token");
  const refreshToken = localStorage.getItem("refresh_token");

  if (!accessToken || !refreshToken) {
    return;
  }

  if (isTokenExpired(accessToken)) {
    handleTokenRefresh();
  }
};

/**
 * Handle token refresh
 * @returns {boolean} - True if refresh successful, false otherwise
 */
const handleTokenRefresh = async () => {
  const refreshToken = localStorage.getItem("refresh_token");

  if (!refreshToken || isTokenExpired(refreshToken)) {
    console.log("Refresh token is missing or expired");
    clearAuthData();
    window.location.href = "/login";
    return false;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${refreshToken}`,
      },
    });

    const result = await response.json();

    if (response.ok && result.access_token) {
      localStorage.setItem("access_token", result.access_token);
      // Update refresh token if provided (token rotation)
      if (result.refresh_token) {
        localStorage.setItem("refresh_token", result.refresh_token);
      }
      console.log("Token refreshed successfully");
      return true;
    } else {
      console.log("Token refresh failed:", result.msg || "Unknown error");
      clearAuthData();
      window.location.href = "/login";
      return false;
    }
  } catch (error) {
    console.error("Token refresh failed:", error);
    clearAuthData();
    window.location.href = "/login";
    return false;
  }
};

/**
 * Authentication state management
 */
const authState = {
  listeners: new Set(),
  isAuthenticated: false,

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  },

  notify() {
    this.listeners.forEach((callback) => callback(this.isAuthenticated));
  },

  setAuthenticated(value) {
    if (this.isAuthenticated !== value) {
      this.isAuthenticated = value;
      this.notify();
    }
  },
};

/**
 * Clear authentication data from local storage
 * @returns {void}
 */
const clearAuthData = () => {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("user");
  loadingState.reset();
  authState.setAuthenticated(false);
};

/**
 * Get the current user from local storage
 * @returns {object|null} - User object or null if not found
 */
const getCurrentUser = () => {
  const user = localStorage.getItem("user");
  return user ? JSON.parse(user) : null;
};

/**
 * Check if the user is authenticated
 * @returns {boolean} - True if authenticated, false otherwise
 */
const isAuthenticated = () => {
  const accessToken = localStorage.getItem("access_token");
  const refreshToken = localStorage.getItem("refresh_token");
  const isAuth = !!(
    accessToken &&
    refreshToken &&
    !isTokenExpired(refreshToken)
  );
  authState.setAuthenticated(isAuth);
  return isAuth;
};

/**
 * Authentication API functions
 */
const authAPI = {
  /**
   * Register a new user (sends OTP)
   * @param {string} fullName - User's full name
   * @param {string} username - Username
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise} - Registration response
   */
  register: (fullName, username, email, password) => {
    return apiRequest(
      "/auth/register",
      "POST",
      { full_name: fullName, username, email, password },
      "auth-register"
    );
  },

  /**
   * Verify OTP and complete registration
   * @param {string} email - User email
   * @param {string} otp - OTP code
   * @param {string} fullName - User's full name
   * @param {string} username - Username
   * @param {string} password - User password
   * @returns {Promise} - Verification response
   */
  verifyOTP: (email, otp, fullName, username, password) => {
    return apiRequest(
      "/auth/verify-otp",
      "POST",
      { email, otp, full_name: fullName, username, password },
      "auth-verify-otp"
    );
  },

  /**
   * Resend OTP for email verification
   * @param {string} email - User email
   * @param {string} username - Username (optional)
   * @returns {Promise} - Resend OTP response
   */
  resendOTP: (email, username = "User") => {
    return apiRequest(
      "/auth/resend-otp",
      "POST",
      { email, username },
      "auth-resend-otp"
    );
  },

  /**
   * Login an existing user
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise} - Login response with token and user data
   */
  login: (email, password) => {
    return apiRequest(
      "/auth/login",
      "POST",
      { email, password },
      "auth-login"
    );
  },

  /**
   * Request password reset for an email
   * @param {string} email - User email
   * @returns {Promise} - Password reset response
   */
  forgotPassword: (email) => {
    return apiRequest(
      "/auth/forgot-password",
      "POST",
      { email },
      "auth-forgot-password"
    );
  },

  /**
   * Verify password reset token
   * @param {string} token - Reset token
   * @returns {Promise} - Token verification response
   */
  verifyResetToken: (token) => {
    return apiRequest(
      "/auth/verify-reset-token",
      "POST",
      { token },
      "auth-verify-reset-token"
    );
  },

  /**
   * Reset password with token
   * @param {string} token - Reset token
   * @param {string} new_password - New password
   * @returns {Promise} - Reset password response
   */
  resetPassword: (token, new_password) => {
    return apiRequest(
      "/auth/reset-password",
      "POST",
      { token, new_password },
      "auth-reset-password"
    );
  },

  /**
   * Logout the current user
   * @returns {Promise} - Logout response
   */
  logout: () => {
    return apiRequest("/auth/logout", "DELETE", null, "auth-logout");
  },

  /**
   * Update user settings
   * @param {object} settings - Settings object (notify_email, notify_in_app)
   * @returns {Promise} - Settings update response
   */
  updateSettings: (settings) => {
    return apiRequest(
      "/auth/settings",
      "PUT",
      settings,
      "auth-update-settings"
    );
  },

  /**
   * Register with Google OAuth
   * @param {string} googleToken - Google OAuth token
   * @returns {Promise} - Google register response
   */
  googleRegister: (googleToken) => {
    return apiRequest(
      "/auth/google-register",
      "POST",
      { token: googleToken },
      "auth-google-register"
    );
  },

  /**
   * Login with Google OAuth
   * @param {string} googleToken - Google OAuth token
   * @returns {Promise} - Google login response
   */
  googleLogin: (googleToken) => {
    return apiRequest(
      "/auth/google-login",
      "POST",
      { token: googleToken },
      "auth-google-login"
    );
  },

  /**
   * Get Google OAuth client ID with caching and connection management
   * @returns {Promise} - Client ID response
   */
  getGoogleClientId: async () => {
    // Return cached client ID if valid and not expired
    if (googleClientCache.isValid && !googleClientCache.isExpired()) {
      return Promise.resolve({ client_id: googleClientCache.clientId });
    }

    // Don't retry if we recently failed and retry delay hasn't passed
    if (!googleClientCache.canRetry()) {
      const timeUntilRetry = Math.ceil((googleClientCache.RETRY_DELAY - (Date.now() - googleClientCache.lastError)) / 1000);
      throw new Error(`Google client ID unavailable. Retry in ${timeUntilRetry} seconds.`);
    }

    try {
      const response = await apiRequest(
        "/auth/google/client-id",
        "GET",
        null,
        "auth-google-client-id"
      );
      
      // Cache the successful response
      googleClientCache.setClientId(response.client_id);
      return response;
    } catch (error) {
      // Mark error and don't retry immediately
      googleClientCache.setError();
      throw error;
    }
  },

  /**
   * Get current user from backend
   * @returns {Promise} - User data response
   */
  getCurrentUserFromBackend: () => {
    return apiRequest('/auth/me', 'GET', null, 'auth-get-current-user');
  },
};

/**
 * Save authentication data to local storage
 * @param {string} accessToken - Access token
 * @param {string} refreshToken - Refresh token
 * @param {object} user - User object
 * @returns {void}
 */
const saveAuthData = (accessToken, refreshToken, user) => {
  localStorage.setItem("access_token", accessToken);
  localStorage.setItem("refresh_token", refreshToken);
  localStorage.setItem("user", JSON.stringify(user));
  authState.setAuthenticated(true);
};

export {
  authAPI,
  authState,
  clearAuthData, ensureValidToken, getCurrentUser, googleClientCache, handleTokenRefresh, isAuthenticated,
  saveAuthData
};

