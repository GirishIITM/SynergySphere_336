import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { authState, isAuthenticated } from '../utils/apiCalls/auth';

/**
 * PrivateRoute component that redirects to login if user is not authenticated
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components to render if authenticated
 * @returns {React.ReactNode} - Either the children or a redirect to login page
 */
const PrivateRoute = ({ children }) => {
  const location = useLocation();
  const [authenticated, setAuthenticated] = useState(isAuthenticated);
  
  useEffect(() => {
    // Subscribe to authentication state changes
    const unsubscribe = authState.subscribe((isAuth) => {
      setAuthenticated(isAuth);
    });
    
    // Initial check
    setAuthenticated(isAuthenticated());
    
    return unsubscribe;
  }, []);
  
  if (!authenticated) {
    // Redirect to login page with the return URL
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  
  return children;
};

export default PrivateRoute;
