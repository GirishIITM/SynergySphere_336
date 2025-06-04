import Footer from '../components/Footer';
import { Button } from '../components/ui/button';
import { Link } from 'react-router-dom';
import './HomePage.css';

const HomePage = () => {
  return (
    <div className="home-page">
      <nav className="home-nav">
        <div className="nav-content-vertical">
          <span className="nav-message">Login to start</span>
          <div className="nav-links-vertical">
            <Link to="/login" className="nav-link">Login</Link>
            <Link to="/register" className="nav-link">Register</Link>
          </div>
        </div>
      </nav>
      <section className="features">
        <h2>Why Choose SynergySphere?</h2>
        <div className="feature-cards">
          <div className="feature-card">
            <h3>Task Management</h3>
            <p>Create, assign, and track tasks with ease. Set priorities, deadlines, and monitor progress in real-time.</p>
          </div>
          
          <div className="feature-card">
            <h3>Project Dashboards</h3>
            <p>Get a comprehensive view of all your projects with intuitive dashboards showing progress, timelines, and resource allocation.</p>
          </div>
          
          <div className="feature-card">
            <h3>Team Collaboration</h3>
            <p>Foster teamwork with shared workspaces, file sharing, comments, and integrated communication tools.</p>
          </div>
          
          <div className="feature-card">
            <h3>Deadline Tracking</h3>
            <p>Never miss a deadline with automated reminders, calendar integration, and visual progress indicators.</p>
          </div>
          
          <div className="feature-card">
            <h3>Reporting & Analytics</h3>
            <p>Make data-driven decisions with customizable reports on team productivity, project status, and resource utilization.</p>
          </div>
        </div>
      </section>
      
      <section className="cta-section">
        <h2>Ready to Streamline Your Project Management?</h2>
        <p>Join SynergySphere today and transform how your team collaborates on tasks and projects.</p>
        <Button className="cta-button">Start Free Trial</Button>
      </section>
      
      <Footer />
    </div>
  );
};

export default HomePage;
