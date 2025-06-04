import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import registerSvg from '../assets/register.svg';
import GoogleLoginButton from '../components/GoogleLoginButton';
import LoadingIndicator from '../components/LoadingIndicator';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import '../styles/register.css';
import { authAPI, connectionState, loadingState, saveAuthData } from '../utils/apiCalls';

export default function Register() {
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [passwordValidation, setPasswordValidation] = useState({
    minLength: false,
    hasUppercase: false,
    hasLowercase: false,
    hasNumber: false,
    hasSpecialChar: false,
    isValid: false
  });
  const [showPasswordHints, setShowPasswordHints] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptWeakPassword, setAcceptWeakPassword] = useState(false);
  const [connectionError, setConnectionError] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const navigate = useNavigate();

  // Check loading state from the API
  useEffect(() => {
    const checkLoadingState = () => {
      setIsLoading(loadingState.isLoading('auth-register') || loadingState.isLoading('auth-google-register'));
    };

    checkLoadingState();
    const interval = setInterval(checkLoadingState, 100);

    return () => {
      clearInterval(interval);
    };
  }, []);

  // Subscribe to connection state
  useEffect(() => {
    const checkLoadingState = () => {
      setIsLoading(loadingState.isLoading('auth-register') || loadingState.isLoading('auth-google-register'));
    };

    // Set initial state
    checkLoadingState();

    // Set up an interval to check the loading state
    const interval = setInterval(checkLoadingState, 100);

    // Subscribe to connection state
    const unsubscribeConnection = connectionState.subscribe((isOnline) => {
      setConnectionError(!isOnline);
      if (isOnline && isRetrying) {
        setIsRetrying(false);
        setErrors(prev => ({ ...prev, general: '' }));
      }
    });

    return () => {
      clearInterval(interval);
      unsubscribeConnection();
    };
  }, [isRetrying]);

  // Validate password in real-time
  useEffect(() => {
    const password = formData.password;
    const validation = {
      minLength: password.length >= 8,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumber: /\d/.test(password),
      hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };
    validation.isValid = Object.values(validation).every(Boolean);
    setPasswordValidation(validation);
  }, [formData.password]);

  // Generate username from full name
  useEffect(() => {
    if (formData.fullName && !formData.username) {
      const generatedUsername = formData.fullName
        .toLowerCase()
        .replace(/\s+/g, '')
        .replace(/[^a-z0-9]/g, '');
      setFormData(prev => ({ ...prev, username: generatedUsername }));
    }
  }, [formData.fullName, formData.username]);

  const validateForm = () => {
    const newErrors = {};

    // Full name validation
    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    } else if (formData.fullName.trim().length < 2) {
      newErrors.fullName = 'Full name must be at least 2 characters';
    }

    // Username validation
    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      newErrors.username = 'Username can only contain letters, numbers, and underscores';
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Password validation - only require minimum length and weak password acceptance
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    } else if (!passwordValidation.isValid && !acceptWeakPassword) {
      newErrors.password = 'Please use a strong password or check "Accept weak password"';
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
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
    setSuccess('');

    if (!validateForm()) {
      return;
    }

    try {
      setConnectionError(false);
      setIsRetrying(false);
      
      const response = await authAPI.register(
        formData.fullName.trim(),
        formData.username.trim(),
        formData.email.trim().toLowerCase(),
        formData.password
      );

      if (response.msg && response.msg.includes('OTP sent')) {
        setSuccess('Registration successful! Redirecting to email verification...');
        setTimeout(() => {
          navigate('/verify-otp', {
            state: {
              email: formData.email.trim().toLowerCase(),
              fullName: formData.fullName.trim(),
              username: formData.username.trim(),
              password: formData.password
            }
          });
        }, 1500);
      }
    } catch (error) {
      const errorMessage = error.message || 'Failed to register. Please try again.';
      
      // Handle connection errors
      if (errorMessage.includes('Unable to connect to server') || 
          errorMessage.includes('Network Error')) {
        setConnectionError(true);
        setIsRetrying(true);
        setErrors({ 
          general: 'Unable to connect to server. Please check your internet connection and try again.' 
        });
      } else if (errorMessage.includes('Username already exists')) {
        setErrors({ username: 'This username is already taken' });
      } else if (errorMessage.includes('Email already exists')) {
        setErrors({ email: 'An account with this email already exists' });
      } else if (errorMessage.includes('Invalid email')) {
        setErrors({ email: 'Please enter a valid email address' });
      } else {
        setErrors({ general: errorMessage });
      }
    }
  };

  const handleRetryConnection = () => {
    setConnectionError(false);
    setIsRetrying(true);
    setErrors(prev => ({ ...prev, general: '' }));
  };

  const handleGoogleSuccess = (response) => {
    saveAuthData(response.access_token, response.refresh_token, response.user);
    navigate('/solutions/tasks', { replace: true });
  };

  const handleGoogleError = (error) => {
    setErrors({ general: error || 'Google registration failed. Please try again.' });
  };

  return (
    <div className="register-split-page">
      <div className="register-left">
        <div className="content">
          <h2>New here?</h2>
          <p>
            Create and manage projects, 
            Collaborate with team members,
            Track tasks and progress,
            Send and receive notifications,
          </p>
          <Link to="/login" id="login-btn">
            <Button className="btn transparent" variant="outline">login</Button>
          </Link>
        </div>
        <img src={registerSvg} alt="Register illustration" className="register-svg-img" />
      </div>
      <div className="register-right">
        <LoadingIndicator loading={isLoading}>
          <div className="register-container">
            <h1 className="register-title">Create an account</h1>
            
            {errors.general && (
              <div className="error-message">
                {errors.general}
                {connectionError && (
                  <Button
                    type="button"
                    onClick={handleRetryConnection}
                    variant="outline"
                    size="sm"
                    disabled={isRetrying}
                  >
                    {isRetrying ? 'Retrying...' : 'Retry'}
                  </Button>
                )}
              </div>
            )}
            {success && <div className="success-message">{success}</div>}
            
            <div className="google-auth-section">
              <GoogleLoginButton
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                disabled={isLoading}
                mode="register"
              />
              <div className="divider">
                <span>OR</span>
              </div>
            </div>

            <form className="register-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="register-fullName">Full Name:</label>
                <Input
                  type="text"
                  id="register-fullName"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  className={errors.fullName ? 'error' : ''}
                  placeholder="Enter your full name"
                  required
                />
                {errors.fullName && <span className="field-error">{errors.fullName}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="register-username">Username:</label>
                <Input
                  type="text"
                  id="register-username"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  className={errors.username ? 'error' : ''}
                  placeholder="Choose a username"
                  required
                />
                {errors.username && <span className="field-error">{errors.username}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="register-email">Email:</label>
                <Input
                  type="email"
                  id="register-email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={errors.email ? 'error' : ''}
                  placeholder="Enter your email"
                  required
                />
                {errors.email && <span className="field-error">{errors.email}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="register-password">Password:</label>
                <div className="password-input-container">
                  <Input
                    type={showPassword ? "text" : "password"}
                    id="register-password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    onFocus={() => setShowPasswordHints(true)}
                    className={errors.password ? 'error' : ''}
                    placeholder="Create a password"
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
                
                {showPasswordHints && (
                  <div className="password-hints">
                    <div className="password-strength-title">Password Strength:</div>
                    <div className={`hint ${passwordValidation.minLength ? 'valid' : 'invalid'}`}>
                      At least 8 characters
                    </div>
                    <div className={`hint ${passwordValidation.hasUppercase ? 'valid' : 'invalid'}`}>
                      One uppercase letter
                    </div>
                    <div className={`hint ${passwordValidation.hasLowercase ? 'valid' : 'invalid'}`}>
                      One lowercase letter
                    </div>
                    <div className={`hint ${passwordValidation.hasNumber ? 'valid' : 'invalid'}`}>
                      One number
                    </div>
                    <div className={`hint ${passwordValidation.hasSpecialChar ? 'valid' : 'invalid'}`}>
                      One special character (!@#$%^&*)
                    </div>
                    
                    <div className="weak-password-option">
                      <label className="weak-password-checkbox">
                        <Input
                          type="checkbox"
                          checked={acceptWeakPassword}
                          onChange={(e) => setAcceptWeakPassword(e.target.checked)}
                        />
                        <span className="checkmark"></span>
                        Accept weak password
                      </label>
                    </div>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="register-confirm-password">Confirm Password:</label>
                <div className="password-input-container">
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    id="register-confirm-password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className={errors.confirmPassword ? 'error' : ''}
                    placeholder="Confirm your password"
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? (
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
                {errors.confirmPassword && <span className="field-error">{errors.confirmPassword}</span>}
              </div>

              <Button 
                type="submit" 
                disabled={isLoading}
                className="w-full"
              >
                Create an account
              </Button>
            </form>
            <div className="contentt mobile-only">
              <p className="center-text">
                have an account?
                <Link className="btnn" id="sign-up-btn" to="/login">login</Link>
              </p>
            </div>
          </div>
        </LoadingIndicator>
      </div>
    </div>
  );
}