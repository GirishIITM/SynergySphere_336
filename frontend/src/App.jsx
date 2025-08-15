import { useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import './App.css';
import LoadingIndicator from './components/LoadingIndicator';
import Navbar from './components/Navbar';
import PrivateRoute from './components/PrivateRoute';
import { setupCacheClearingOnRefresh, addNoCacheHeaders } from './utils/cacheManager';
import TaskList from './components/TaskList';
import socketService from './utils/socketService';
import { Toaster } from "@/components/ui/sonner"
import AdminPanelLayout from './components/admin-panel/admin-panel-layout';
import { ContentLayout } from './components/admin-panel/content-layout';
import About from './pages/About';
import Analytics from './pages/Analytics';
import Dashboard from './pages/Dashboard';
import Finance from './pages/Finance';
import ForgotPassword from './pages/ForgotPassword';
import Home from './pages/Home';
import Login from './pages/Login';
import Profile from './pages/Profile';
import Register from './pages/Register';
import ResetPassword from './pages/ResetPassword';
import Settings from './pages/Settings';
import ProjectCreate from './pages/solutions/ProjectCreate';
import ProjectDetail from './pages/solutions/ProjectDetail';
import ProjectEdit from './pages/solutions/ProjectEdit';
import Projects from './pages/solutions/Projects';
import ProjectAnalytics from './pages/solutions/ProjectAnalytics';
import ProjectFinance from './pages/solutions/ProjectFinance';
import TaskCreate from './pages/solutions/TaskCreate';
import TaskDetail from './pages/solutions/TaskDetail';
import TaskEdit from './pages/solutions/TaskEdit.jsx';
import Tasks from './pages/solutions/Tasks';
import TaskBoard from './pages/solutions/TaskBoard';
import VerifyOTP from './pages/VerifyOTP';
import { authState, isAuthenticated } from './utils/apiCalls/auth';
import Inbox from './pages/solutions/InBox';


function App() {
  const [authenticated, setAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Set up cache clearing on refresh
    const cleanupCacheClearing = setupCacheClearingOnRefresh();
    
    // Add no-cache headers to prevent browser caching
    addNoCacheHeaders();
    
    // Subscribe to authentication state changes
    const unsubscribe = authState.subscribe((isAuth) => {
      setAuthenticated(isAuth);
      
      if (isAuth) {
        // Connect to Socket.IO when user is authenticated
        try {
          socketService.connect();
          socketService.requestNotificationPermission();
          console.log('Socket.IO initialized for authenticated user');
        } catch (error) {
          console.error('Failed to initialize Socket.IO:', error);
        }
      } else {
        // Disconnect when user logs out
        try {
          socketService.disconnect();
          console.log('Socket.IO disconnected for unauthenticated user');
        } catch (error) {
          console.error('Error disconnecting Socket.IO:', error);
        }
      }
    });
    
    // Initial authentication check
    const checkAuth = () => {
      const isAuth = isAuthenticated();
      setAuthenticated(isAuth);
      setIsLoading(false);
    };
    
    checkAuth();
    
    return () => {
      unsubscribe();
      cleanupCacheClearing();
      try {
        socketService.disconnect();
      } catch (error) {
        console.error('Error in cleanup:', error);
      }
    };
  }, []);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <BrowserRouter>
      <div className="app-container">
        <main>
          <LoadingIndicator loading={isLoading}>
            <Routes>
              <Route path='/register' element={
                <>
                  <Navbar />
                  {authenticated ? <Navigate to="/dashboard" replace /> : <Register />}
                </>
              } />
              
              <Route path='/verify-otp' element={
                <>
                  <Navbar />
                  {authenticated ? <Navigate to="/dashboard" replace /> : <VerifyOTP />}
                </>
              } />
              
              <Route path='/login' element={
                <>
                  <Navbar />
                  {authenticated ? <Navigate to="/dashboard" replace /> : <Login />}
                </>
              } />
              
              <Route path='/about' element={
                <>
                  <Navbar showWhenAuthenticated/>
                  <About />
                </>
              } />

              <Route path="/auth/google/callback" element={<GoogleOAuthCallback />} />

              <Route path="/forgot-password" element={
                <>
                  <Navbar />
                  {authenticated ? <Navigate to="/dashboard" replace /> : <ForgotPassword />}
                </>
              } />

              <Route path="/reset-password" element={
                <>
                  <Navbar />
                  <ResetPassword />
                </>
              } />

              <Route path='/' element={
                <>
                  <Navbar showWhenAuthenticated={true} />
                  <Home />
                </>
              } />

              <Route path='/dashboard' element={
                <PrivateRoute>
                  <AdminPanelLayout>
                    <ContentLayout title="Dashboard">
                      <Dashboard />
                    </ContentLayout>
                  </AdminPanelLayout>
                </PrivateRoute>
              } />


              <Route path='/solutions/tasks' element={
                <PrivateRoute>
                  <AdminPanelLayout>
                    <ContentLayout title="Tasks">
                      <Tasks />
                    </ContentLayout>
                  </AdminPanelLayout>
                </PrivateRoute>
              } />
              
              <Route path='/solutions/projects' element={
                <PrivateRoute>
                  <AdminPanelLayout>
                    <ContentLayout title="Projects">
                      <Projects />
                    </ContentLayout>
                  </AdminPanelLayout>
                </PrivateRoute>
              } />

              <Route path='/solutions/InBox' element={
                <PrivateRoute>
                  <AdminPanelLayout>
                    <ContentLayout title="InBox">
                      <Inbox />
                    </ContentLayout>
                  </AdminPanelLayout>
                </PrivateRoute>
              } />

              <Route path='/solutions/projects/create' element={
                <PrivateRoute>
                  <AdminPanelLayout>
                    <ContentLayout title="Create Project">
                      <ProjectCreate />
                    </ContentLayout>
                  </AdminPanelLayout>
                </PrivateRoute>
              } />

              <Route path='/solutions/projects/edit/:id' element={
                <PrivateRoute>
                  <AdminPanelLayout>
                    <ContentLayout title="Edit Project">
                      <ProjectEdit />
                    </ContentLayout>
                  </AdminPanelLayout>
                </PrivateRoute>
              } />

              <Route path='/solutions/projects/:id' element={
                <PrivateRoute>
                  <AdminPanelLayout>
                    <ContentLayout title="Project Details">
                      <ProjectDetail />
                    </ContentLayout>
                  </AdminPanelLayout>
                </PrivateRoute>
              } />

              <Route path='/solutions/projects/:projectId/finance' element={
                <PrivateRoute>
                  <AdminPanelLayout>
                    <ContentLayout title="Project Finance">
                      <ProjectFinance />
                    </ContentLayout>
                  </AdminPanelLayout>
                </PrivateRoute>
              } />

              <Route path='/solutions/projects/:projectId/analytics' element={
                <PrivateRoute>
                  <AdminPanelLayout>
                    <ContentLayout title="Project Analytics">
                      <ProjectAnalytics />
                    </ContentLayout>
                  </AdminPanelLayout>
                </PrivateRoute>
              } />

              <Route path='/analytics' element={
                <PrivateRoute>
                  <AdminPanelLayout>
                    <ContentLayout title="Analytics">
                      <Analytics />
                    </ContentLayout>
                  </AdminPanelLayout>
                </PrivateRoute>
              } />

              <Route path='/finance' element={
                <PrivateRoute>
                  <AdminPanelLayout>
                    <ContentLayout title="Finance">
                      <Finance />
                    </ContentLayout>
                  </AdminPanelLayout>
                </PrivateRoute>
              } />

              <Route path='/solutions/tasks/create' element={
                <PrivateRoute>
                  <AdminPanelLayout>
                    <ContentLayout title="Create Task">
                      <TaskCreate />
                    </ContentLayout>
                  </AdminPanelLayout>
                </PrivateRoute>
              } />

              <Route path='/solutions/tasks/:taskId' element={
                <PrivateRoute>
                  <AdminPanelLayout>
                    <ContentLayout title="Task Details">
                      <TaskDetail />
                    </ContentLayout>
                  </AdminPanelLayout>
                </PrivateRoute>
              } />

              <Route path='/solutions/tasks/edit/:id' element={
                <PrivateRoute>
                  <AdminPanelLayout>
                    <ContentLayout title="Edit Task">
                      <TaskEdit />
                    </ContentLayout>
                  </AdminPanelLayout>
                </PrivateRoute>
              } />

              <Route path='/solutions/tasks/board' element={
                <PrivateRoute>
                  <AdminPanelLayout>
                    <ContentLayout title="Task Board">
                      <TaskBoard />
                    </ContentLayout>
                  </AdminPanelLayout>
                </PrivateRoute>
              } />

              <Route path='/settings' element={
                <PrivateRoute>
                  <AdminPanelLayout>
                    <ContentLayout title="Settings">
                      <Settings />
                    </ContentLayout>
                  </AdminPanelLayout>
                </PrivateRoute>
              } />

              {/* Profile route - protected and with AdminPanelLayout */}
              <Route path='/profile' element={
                <PrivateRoute>
                  <AdminPanelLayout>
                    <ContentLayout title="Profile">
                      <Profile />
                    </ContentLayout>
                  </AdminPanelLayout>
                </PrivateRoute>
              } />

              {/* Catch all route */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </LoadingIndicator>
          <Toaster richColors closeButton />
        </main>
        <TaskList />
      </div>
    </BrowserRouter>
  );
}

// Google OAuth callback component for handling popup authentication
const GoogleOAuthCallback = () => {
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const error = urlParams.get('error');
    const state = urlParams.get('state');

    if (error) {
      window.opener?.postMessage({
        type: 'GOOGLE_AUTH_ERROR',
        error: error
      }, window.location.origin);
      window.close();
      return;
    }

    if (code) {
      // Convert authorization code to credential token via backend
      fetch(`${window.location.origin}/api/auth/google/exchange`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code, state })
      })
      .then(response => response.json())
      .then(data => {
        if (data.credential) {
          window.opener?.postMessage({
            type: 'GOOGLE_AUTH_SUCCESS',
            credential: data.credential
          }, window.location.origin);
        } else {
          window.opener?.postMessage({
            type: 'GOOGLE_AUTH_ERROR',
            error: 'Failed to exchange authorization code'
          }, window.location.origin);
        }
        window.close();
      })
      .catch(error => {
        window.opener?.postMessage({
          type: 'GOOGLE_AUTH_ERROR',
          error: error.message || 'Authentication failed'
        }, window.location.origin);
        window.close();
      });
    }
  }, []);

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      fontSize: '16px'
    }}>
      Processing authentication...
    </div>
  );
};

export default App;
