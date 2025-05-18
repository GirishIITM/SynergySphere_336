// pages/HomePage.jsx
import Footer from '../components/Footer';
import './HomePage.css';

const HomePage = () => {
  return (
    <div className="home-page">
    
      <section className="features">
        <h2>Why Choose SynergySphere?</h2>
        <div className="feature-cards">
          <div className="feature-card">
            <h3>Centralized Information</h3>
            <p>Keep all your important files, chats, and decisions in one place, making it easy to track and access information.</p>
          </div>
          
          <div className="feature-card">
            <h3>Clear Progress Tracking</h3>
            <p>Gain visibility into tasks and project progress, identifying bottlenecks before they become problems.</p>
          </div>
          
          <div className="feature-card">
            <h3>Efficient Resource Management</h3>
            <p>Optimize assignments and prevent overload or confusion among team members.</p>
          </div>
          
          <div className="feature-card">
            <h3>Proactive Deadline Management</h3>
            <p>Get early warnings about potential delays, allowing you to address issues before deadlines are missed.</p>
          </div>
          
          <div className="feature-card">
            <h3>Seamless Communication</h3>
            <p>Ensure everyone stays in the loop with integrated communication tools that prevent information gaps.</p>
          </div>
        </div>
      </section>
      
      <section className="cta-section">
        <h2>Ready to Transform Your Team's Collaboration?</h2>
        <p>Join SynergySphere today and experience the difference in how your team works together.</p>
        <button className="cta-button">Start Free Trial</button>
      </section>
      
      <Footer />
    </div>
  );
};

export default HomePage;
