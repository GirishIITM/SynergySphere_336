import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import LoadingIndicator from '../components/LoadingIndicator';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import '../styles/login.css';
import { authAPI, loadingState } from '../utils/apiCalls';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();

  const token = searchParams.get('token');

  // Check loading states
  useEffect(() => {
    const checkLoadingState = () => {
      setIsLoading(
        loadingState.isLoading('auth-reset-password') || 
        loadingState.isLoading('auth-verify-reset-token')
      );
    };
    checkLoadingState();
    const interval = setInterval(checkLoadingState, 100);
    return () => clearInterval(interval);
  }, []);

  // Verify token on component mount
  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setErrors({ general: 'No reset token provided. Please check your email link.' });
        setIsVerifying(false);
        return;
      }

      try {
        const response = await authAPI.verifyResetToken(token);
        if (response.valid) {
          setTokenValid(true);
        } else {
          setErrors({ general: response.msg || 'Invalid or expired reset token.' });
        }
      } catch (error) {
        setErrors({ 
          general: error.message || 'Invalid or expired reset token. Please request a new password reset.' 
        });
      } finally {
        setIsVerifying(false);
      }
    };

    verifyToken();
  }, [token]);

  const validateForm = () => {
    const newErrors = {};

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
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
    
    if (!validateForm()) {
      return;
    }

    try {
      const response = await authAPI.resetPassword(token, formData.password);
      
      // Success - redirect to login with success message
      navigate('/login', { 
        state: { 
          message: 'Password reset successful! Please log in with your new password.' 
        } 
      });
    } catch (error) {
      const errorMessage = error.message || 'Failed to reset password. Please try again.';
      
      if (errorMessage.includes('expired') || errorMessage.includes('invalid')) {
        setErrors({ 
          general: 'Reset token has expired or is invalid. Please request a new password reset.' 
        });
      } else {
        setErrors({ general: errorMessage });
      }
    }
  };

  if (isVerifying) {
    return (
      <div className="login-split-page">
        <div className="login-right">
          <LoadingIndicator loading={true}>
            <div className="login-container">
              <h1 className="login-title">Verifying Reset Token</h1>
              <p style={{ textAlign: 'center', color: '#666' }}>
                Please wait while we verify your password reset link...
              </p>
            </div>
          </LoadingIndicator>
        </div>
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div className="login-split-page">
        <div className="login-right">
          <div className="login-container">
            <h1 className="login-title">Invalid Reset Link</h1>
            
            {errors.general && <div className="error-message">{errors.general}</div>}
            
            <div style={{ textAlign: 'center', marginTop: '2rem' }}>
              <p>The password reset link is invalid or has expired.</p>
              <p>Please request a new password reset.</p>
              
              <div className="text-center mt-6">
                <Button asChild variant="outline">
                  <Link to="/forgot-password">
                    Request New Reset Link
                  </Link>
                </Button>
              </div>
              
              <p className="login-link-text" style={{ marginTop: '1rem' }}>
                <Link to="/login">Return to Login</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-split-page">
      <div className="login-right">
        <LoadingIndicator loading={isLoading}>
          <div className="login-container">
            <h1 className="login-title">Reset Your Password</h1>
            
            {errors.general && <div className="error-message">{errors.general}</div>}
            
            <form className="login-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="reset-password">New Password:</label>
                <div className="password-input-container">
                  <Input
                    type={showPassword ? "text" : "password"}
                    id="reset-password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className={errors.password ? 'error' : ''}
                    placeholder="Enter your new password"
                    autoComplete="new-password"
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

              <div className="form-group">
                <label htmlFor="reset-confirm-password">Confirm New Password:</label>
                <div className="password-input-container">
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    id="reset-confirm-password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className={errors.confirmPassword ? 'error' : ''}
                    placeholder="Confirm your new password"
                    autoComplete="new-password"
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
                {isLoading ? 'Resetting Password...' : 'Reset Password'}
              </Button>
            </form>
            
            <p className="login-link-text">
              <Link to="/login">Return to Login</Link>
            </p>
          </div>
        </LoadingIndicator>
      </div>
    </div>
  );
}