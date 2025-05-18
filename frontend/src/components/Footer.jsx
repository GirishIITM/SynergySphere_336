// components/Footer.jsx
import { Link } from 'react-router-dom';
import './styles/Footer.css';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-section">
          <h3>SynergySphere</h3>
          <p>Empowering people, Delivering Excellence</p>
          <p>© {new Date().getFullYear()} SynergySphere. All rights reserved.</p>
        </div>
        
        <div className="footer-section">
          <h3>Quick Links</h3>
          <ul>
            <li><Link to="/">Home</Link></li>
            <li><Link to="/about">About Us</Link></li>
            <li><Link to="/services">Services</Link></li>
            <li><Link to="/contact">Contact</Link></li>
          </ul>
        </div>
        
        <div className="footer-section">
          <h3>Contact Us</h3>
          <p>New Delhi, 110010, India</p>
          <p>Email: hr@synergysphere.co.in</p>
          <p>Phone: +91 99532 32678</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
