import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import LoadingIndicator from '../components/LoadingIndicator';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import '../styles/login.css';
import { authAPI, loadingState } from '../utils/apiCalls';

export default function ForgotPassword() {
  const [formData, setFormData] = useState({
    email: ''
  });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const checkLoadingState = () => {
      setIsLoading(loadingState.isLoading('auth-forgot-password'));
    };
    
    checkLoadingState();
    
    const interval = setInterval(checkLoadingState, 100);
    
    return () => clearInterval(interval);
  }, []);

  const validateForm = () => {
    const newErrors = {};

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setMessage('');
    
    if (!validateForm()) {
      return;
    }
    
    try {
      const response = await authAPI.forgotPassword(formData.email.trim().toLowerCase());
      setMessage(response.message || 'If the email exists, a password reset link has been sent');
      setSubmitted(true);
    } catch (error) {
      setErrors({ 
        general: error.message || 'Failed to process your request. Please try again.' 
      });
    }
  };

  return (
    <div className="login-split-page">
      <div className="login-right">
        <LoadingIndicator loading={isLoading}>
          <div className="login-container">
            <h1 className="login-title">Forgot Password</h1>
            
            {errors.general && <div className="error-message">{errors.general}</div>}
            {message && <div className="success-message">{message}</div>}
            
            {!submitted ? (
              <form className="login-form" onSubmit={handleSubmit}>
                <div className="form-group">
                  <label htmlFor="forgot-email">Email:</label>
                  <Input
                    type="email" 
                    id="forgot-email" 
                    name="email" 
                    value={formData.email}
                    onChange={handleChange}
                    className={errors.email ? 'error' : ''}
                    placeholder="Enter your registered email"
                    autoComplete="email"
                    required 
                  />
                  {errors.email && <span className="field-error">{errors.email}</span>}
                </div>
                <Button 
                  type="submit" 
                  disabled={isLoading}
                  className="w-full"
                >
                  {isLoading ? 'Sending...' : 'Send Reset Link'}
                </Button>
              </form>
            ) : (
              <div className="form-submitted" style={{ textAlign: 'center', padding: '2rem 0' }}>
                <p style={{ marginBottom: '1rem' }}>
                  If an account with that email exists, we've sent you a password reset link.
                </p>
                <p style={{ marginBottom: '2rem', color: '#666' }}>
                  Please check your email and follow the instructions to reset your password.
                </p>
                <Button 
                  onClick={() => {
                    setSubmitted(false);
                    setMessage('');
                    setFormData({ email: '' });
                  }}
                  variant="outline"
                  className="w-full"
                >
                  Send Another Reset Link
                </Button>
              </div>
            )}
            
            <p className="login-link-text">
              <Link to="/login">Return to Login</Link>
            </p>
          </div>
        </LoadingIndicator>
      </div>
    </div>
  );
}
