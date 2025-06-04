import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import GoogleLoginButton from '../components/GoogleLoginButton';
import LoadingIndicator from '../components/LoadingIndicator';
import '../styles/login.css';

import registerSvg from '../assets/log.svg';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { authAPI, loadingState, saveAuthData } from '../utils/apiCalls';

export default function Login() {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from || "/dashboard"; 

  useEffect(() => {
    const checkLoadingState = () => {
      setIsLoading(loadingState.isLoading('auth-login') || loadingState.isLoading('auth-google-login'));
    };
    checkLoadingState();
    const interval = setInterval(checkLoadingState, 100);
    return () => clearInterval(interval);
  }, []);

  const validateForm = () => {
    const newErrors = {};

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear specific error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      const response = await authAPI.login(
        formData.email.trim().toLowerCase(), 
        formData.password
      );
      
      saveAuthData(response.access_token, response.refresh_token, response.user);
      navigate(from, { replace: true });
    } catch (error) {
      const errorMessage = error.message || 'Failed to login. Please check your credentials.';
      
      // Handle specific backend errors
      if (errorMessage.includes('Invalid credentials') || 
          errorMessage.includes('User not found') ||
          errorMessage.includes('Invalid password')) {
        setErrors({ 
          general: 'Invalid email or password. Please check your credentials and try again.' 
        });
      } else if (errorMessage.includes('Account not verified')) {
        setErrors({ 
          general: 'Please verify your email before logging in. Check your inbox for the verification link.' 
        });
      } else if (errorMessage.includes('Account disabled')) {
        setErrors({ 
          general: 'Your account has been disabled. Please contact support.' 
        });
      } else if (errorMessage.includes('server')) {
        setErrors({ 
          general: 'Unable to connect to the server. Please try again later.' 
        });
      } else {
        setErrors({ general: errorMessage });
      }
    }
  };

  const handleGoogleSuccess = (response) => {
    saveAuthData(response.access_token, response.refresh_token, response.user);
    navigate(from, { replace: true });
  };

  const handleGoogleError = (error) => {
    setErrors({ general: error || 'Google login failed. Please try again.' });
  };

  return (
    <div className="login-split-page">
      <div className="login-left hide-in-mobile">
        <div className="content">
          <h2>Welcome Back!</h2>
          <p>
            To keep connected with us please login with your personal info.
          </p>
          <Link to="/register" className="btn transparent" id="sign-up-btn">
            Sign up
          </Link>
        </div>
        <img src={registerSvg} alt="Login illustration" className="login-svg-img" />
      </div>
      <div className="login-right">
        <LoadingIndicator loading={isLoading}>
          <div className="login-container">
            <h1 className="login-title">Login into account</h1>
            
            {errors.general && <div className="error-message">{errors.general}</div>}
            {location.state?.message && <div className="success-message">{location.state.message}</div>}
            
            <div className="google-auth-section">
              <GoogleLoginButton
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                disabled={isLoading}
              />
              <div className="divider">
                <span>OR</span>
              </div>
            </div>
            
            <form className="login-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="login-email">Email:</label>
                <Input
                  type="email"
                  id="login-email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={errors.email ? 'error' : ''}
                  placeholder="Enter your email"
                  autoComplete="email"
                  required
                />
                {errors.email && <span className="field-error">{errors.email}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="login-password">Password:</label>
                <div className="password-input-container">
                  <Input
                    type={showPassword ? "text" : "password"}
                    id="login-password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className={errors.password ? 'error' : ''}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                      </svg>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
                {errors.password && <span className="field-error">{errors.password}</span>}
              </div>

              <div className="form-options">
                <label className="remember-me">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <span className="checkmark"></span>
                  Remember me
                </label>
                <Link to="/forgot-password" className="forgot-password-link">
                  Forgot Password?
                </Link>
              </div>

              <Button type="submit" className="w-full mt-1" disabled={isLoading}>
                {isLoading ? 'Signing in...' : 'Login'}
              </Button>
            </form>
            
            <div className="contentt mobile-only">
              <p className="center-text">
                Don't have an account?
                <Link className="btnn" id="sign-up-btn" to="/register">Sign up</Link>
              </p>
            </div>
          </div>
        </LoadingIndicator>
      </div>
    </div>
  );
}