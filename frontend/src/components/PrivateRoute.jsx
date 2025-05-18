import { Navigate, useLocation } from 'react-router-dom';
import { isAuthenticated } from '../../../utils/apicall';

/**
 * PrivateRoute component that redirects to login if user is not authenticated
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components to render if authenticated
 * @returns {React.ReactNode} - Either the children or a redirect to login page
 */
const PrivateRoute = ({ children }) => {
  const location = useLocation();
  
  // Force re-evaluation of authentication state
  const authenticated = isAuthenticated();
  
  if (!authenticated) {
    // Redirect to login page with the return URL
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  
  return children;
};

export default PrivateRoute;
