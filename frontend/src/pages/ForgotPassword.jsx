import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { authAPI, loadingState } from '../../../utils/apicall';
import LoadingIndicator from '../components/LoadingIndicator';
import '../styles/login.css';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Check loading state from the API
  useEffect(() => {
    const checkLoadingState = () => {
      setIsLoading(loadingState.isLoading('auth-forgot-password'));
    };
    
    // Set initial state
    checkLoadingState();
    
    // Set up an interval to check the loading state
    const interval = setInterval(checkLoadingState, 100);
    
    return () => clearInterval(interval);
  }, []);

  const handleChange = (e) => {
    setEmail(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    
    try {
      const response = await authAPI.forgotPassword(email);
      setMessage(response.message);
      setSubmitted(true);
    } catch (error) {
      setError(error.message || 'Failed to process your request. Please try again.');
    }
  };

  return (
    <LoadingIndicator loading={isLoading}>
      <div className="login-container">
        <h1 className="login-title">Forgot Password</h1>
        
        {error && <div className="error-message">{error}</div>}
        {message && <div className="success-message">{message}</div>}
        
        {!submitted ? (
          <form className="login-form" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="forgot-email">Email:</label>
              <input 
                type="email" 
                id="forgot-email" 
                name="email" 
                value={email}
                onChange={handleChange}
                required 
                placeholder="Enter your registered email"
              />
            </div>
            <button type="submit" disabled={isLoading}>Request Password Reset</button>
          </form>
        ) : (
          <div className="form-submitted">
            <p>Check your email for further instructions.</p>
          </div>
        )}
        
        <p className="login-link-text">
          <Link to="/login">Return to Login</Link>
        </p>
      </div>
    </LoadingIndicator>
  );
}
