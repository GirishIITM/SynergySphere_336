import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import './App.css';
import './styles/navbar.css';
import Register from './pages/Register';
import Login from './pages/Login';
import Tasks from './pages/solutions/Tasks';
import NavSidebar from './components/NavSidebar';
import Projects from './pages/solutions/Projects';
import About from './pages/About';
import Home from './pages/Home';

function App() {
  return (
    <BrowserRouter>
      <div className="app-container">
        <main>
          <Routes>
            <Route path='/register' element={<Register />} />
            <Route path='/login' element={<Login />} />
            <Route path='/' element={
              <Navbar>
                <Home />
              </Navbar>
            } />
            <Route path='/about' element={
              <Navbar>
                <About />
              </Navbar>
            } />
            <Route path='/solutions/tasks' element={
              <NavSidebar>
                <Tasks />
              </NavSidebar>
            } />
            <Route path='/solutions/projects' element={
              <NavSidebar>
                <Projects />
              </NavSidebar>
            } />

          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
