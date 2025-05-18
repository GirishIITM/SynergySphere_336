import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { authAPI, loadingState, saveAuthData } from '../../../utils/apicall';
import LoadingIndicator from '../components/LoadingIndicator';
import '../styles/login.css';

export default function Login() {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Check for message passed from register page or previous navigation
  const from = location.state?.from || "/solutions/tasks"; // Default redirect to tasks

  // Check loading state from the API
  useEffect(() => {
    const checkLoadingState = () => {
      setIsLoading(loadingState.isLoading('auth-login'));
    };
    
    // Set initial state
    checkLoadingState();
    
    // Set up an interval to check the loading state
    const interval = setInterval(checkLoadingState, 100);
    
    return () => clearInterval(interval);
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      const response = await authAPI.login(formData.email, formData.password);
      
      // Save authentication data
      saveAuthData(response.token, response.user);
      
      // Redirect to tasks or the page the user was trying to access
      navigate(from, { replace: true });
    } catch (error) {
      setError(error.message || 'Failed to login. Please check your credentials.');
    }
  };

  return (
    <LoadingIndicator loading={isLoading}>
      <div className="login-container">
        <h1 className="login-title">Login into account</h1>
        {error && <div className="error-message">{error}</div>}
        {location.state?.message && <div className="success-message">{location.state.message}</div>}
        
        <form className="login-form" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="login-email">Email:</label>
            <input 
              type="email" 
              id="login-email" 
              name="email" 
              value={formData.email}
              onChange={handleChange}
              required 
            />
          </div>
          <div>
            <label htmlFor="login-password">Password:</label>
            <input 
              type="password" 
              id="login-password" 
              name="password" 
              value={formData.password}
              onChange={handleChange}
              required 
            />
          </div>
          <button type="submit" disabled={isLoading}>Login</button>
        </form>
        <p className="login-link-text">
          <Link to="/forgot-password">Forgot Password?</Link>
        </p>
        <p className="login-link-text">
          Don't have an account?{" "}
          <Link to="/register" id="signup-link">
            Sign Up
          </Link>
        </p>
      </div>
    </LoadingIndicator>
  );
}
