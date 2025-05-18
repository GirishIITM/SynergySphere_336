// pages/AboutPage.jsx
import Footer from '../components/Footer';
import '../styles/AboutPage.css';

const AboutPage = () => {
  return (
    <div className="about-page">
      <section className="about-hero">
        <h1>About SynergySphere</h1>
        <p>A comprehensive project management platform designed to enhance team collaboration, streamline workflows, and boost productivity.</p>
      </section>
      
      <section className="mission-vision">
        <div className="mission">
          <h2>Our Mission</h2>
          <p>To empower teams of all sizes with intuitive project management tools that simplify complex workflows and foster effective collaboration.</p>
        </div>
        
        <div className="vision">
          <h2>Our Vision</h2>
          <p>To become the leading project management solution that transforms how teams work together, enabling them to achieve more with less effort and stress.</p>
        </div>
      </section>
      
      <section className="history">
        <h2>Our History</h2>
        <p>SynergySphere was born from the frustration of its founders with existing project management tools that were either too complex or too simplistic. Founded in 2024, we set out to create a solution that strikes the perfect balance between functionality and usability.</p>
        <p>Today, SynergySphere serves teams across multiple industries including technology, marketing, education, construction, healthcare, and creative agencies.</p>
      </section>
      
      <section className="what-we-do">
        <h2>What We Offer</h2>
        <div className="services-grid">
          <div className="service-card">
            <h3>Task & Project Management</h3>
            <p>Our core functionality enables teams to create, assign, and track tasks within projects, set dependencies, and visualize progress through multiple views including Kanban boards, Gantt charts, and calendars.</p>
          </div>
          
          <div className="service-card">
            <h3>Collaboration Tools</h3>
            <p>Built-in communication features including comments, @mentions, file sharing, and real-time updates ensure everyone stays informed and aligned without switching between applications.</p>
          </div>
          
          <div className="service-card">
            <h3>Workflow Automation</h3>
            <p>Reduce manual work with customizable automation rules that handle routine tasks, notifications, and status updates based on triggers you define for your team's specific needs.</p>
          </div>
        </div>
      </section>
      
      <section className="team">
        <h2>Our Team</h2>
        <p>Our diverse team of developers, designers, and project management experts is dedicated to continuously improving SynergySphere based on user feedback and the latest best practices in team collaboration.</p>
      </section>
      
      <Footer />
    </div>
  );
};

export default AboutPage;
