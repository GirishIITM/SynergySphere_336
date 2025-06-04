// components/Footer.jsx
import { FaFacebook, FaInstagram, FaLinkedin, FaTwitter } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import './styles/Footer.css';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-section brand">
          <h2>SynergySphere</h2>
          <p className="tagline">Empowering People, Delivering Excellence</p>
          <div className="social-icons">
            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
              <FaFacebook className="social-icon" />
            </a>
            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" aria-label="Twitter">
              <FaTwitter className="social-icon" />
            </a>
            <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
              <FaLinkedin className="social-icon" />
            </a>
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
              <FaInstagram className="social-icon" />
            </a>
          </div>
        </div>

        <div className="footer-section links">
          <h3>Quick Links</h3>
          <ul>
            <li><Link to="/">Home</Link></li>
            <li><Link to="/about">About Us</Link></li>
            <li><Link to="#services">Services</Link></li>
            <li><Link to="/contact">Contact</Link></li>
          </ul>
        </div>

        <div className="footer-section contact">
          <h3>Contact Us</h3>
          <address>
            <p><span className="icon">📍</span> SynergySphere Tower, Cyber City</p>
            <p>New Delhi, 110010, India</p>
            <p><span className="icon">✉️</span> Email: <a href="mailto:hr@synergysphere.co.in">hr@synergysphere.co.in</a></p>
            <p><span className="icon">📞</span> Phone: <a href="tel:+919953232678">+91 99532 32678</a></p>
          </address>
        </div>
      </div>

      <div className="footer-bottom">
        <p>© {new Date().getFullYear()} SynergySphere. All rights reserved.</p>
        <div className="footer-bottom-links">
          <Link to="#privacy">Privacy Policy</Link>
          <Link to="#terms">Terms of Service</Link>
          <Link to="#cookies">Cookie Policy</Link>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
