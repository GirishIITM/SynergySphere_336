import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import PrivateRoute from './components/PrivateRoute';
import './App.css';

import Tasks from './pages/solutions/Tasks';
import NavSidebar from './components/NavSidebar';
import Projects from './pages/solutions/Projects';
import About from './pages/About';
import Home from './pages/Home';
import Register from './pages/Register';
import Login from './pages/Login';
import { isAuthenticated } from '../../utils/apicall';

function App() {
  return (
    <BrowserRouter>
      <div className="app-container">
        <main>
          <Routes>
            {/* Public routes */}
            <Route path='/register' element={
              <>
                <Navbar />
                {isAuthenticated() ? <Navigate to="/solutions/tasks" replace /> : <Register />}
              </>
            } />
            <Route path='/login' element={
              <>
                <Navbar />
                {isAuthenticated() ? <Navigate to="/solutions/tasks" replace /> : <Login />}
              </>
            } />
            <Route path='/about' element={
              <>
                <Navbar />
                <About />
              </>
            } />
            
            {/* Home redirects to tasks if authenticated, otherwise shows public home */}
            <Route path='/' element={
              <>
                <Navbar />
                {isAuthenticated() ? <Navigate to="/solutions/tasks" replace /> : <Home />}
              </>
            } />

            {/* Protected routes */}
            <Route path='/solutions/tasks' element={
              <PrivateRoute>
                <NavSidebar>
                  <Tasks />
                </NavSidebar>
              </PrivateRoute>
            } />
            <Route path='/solutions/projects' element={
              <PrivateRoute>
                <NavSidebar>
                  <Projects />
                </NavSidebar>
              </PrivateRoute>
            } />

            {/* Catch all route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
