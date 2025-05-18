// pages/AboutPage.jsx
import Footer from '../components/Footer';
import '../styles/AboutPage.css';

const AboutPage = () => {
  return (
    <div className="about-page">
      <section className="about-hero">
        <h1>About SynergySphere</h1>
        <p>A modern technology firm dedicated to futurifying businesses with Design, Technology, and Digital Engineering.</p>
      </section>
      
      <section className="mission-vision">
        <div className="mission">
          <h2>Our Mission</h2>
          <p>To empower businesses by delivering comprehensive and customized solutions that address their specific challenges and enhance their sustainable growth.</p>
        </div>
        
        <div className="vision">
          <h2>Our Vision</h2>
          <p>To be recognized as the strategic partner of reference for companies of all sizes and sectors, standing out for our ability to offer innovative and effective solutions that drive business success.</p>
        </div>
      </section>
      
      <section className="history">
        <h2>Our History</h2>
        <p>SynergySphere was born from the shared vision of a group of professionals passionate about technology, business consulting, and digital marketing. Founded in 2024, our company started as a small consulting firm focused on providing strategic advisory services and technology platform development for startups.</p>
        <p>Today, we've grown into a comprehensive technology firm with expertise in BPO, IT, SAP/ERP, Financial, Insurance, BFSI, Health Care, Automotive, Oil & Gas, Power, and Manufacturing industries.</p>
      </section>
      
      <section className="what-we-do">
        <h2>What We Do</h2>
        <div className="services-grid">
          <div className="service-card">
            <h3>Business Consulting</h3>
            <p>We provide your company with the tools and strategies necessary to successfully meet current and future business challenges, from strategic consulting to advanced technology implementation.</p>
          </div>
          
          <div className="service-card">
            <h3>Professional Development</h3>
            <p>Our Professional Development service helps your employees reach their full potential through customized programs that strengthen key skills and foster a continuous learning environment.</p>
          </div>
          
          <div className="service-card">
            <h3>Integrated Technology Solutions</h3>
            <p>We offer integrated technology solutions designed to optimize operations, improve efficiency, and facilitate your company's digital transformation with robust and scalable infrastructure.</p>
          </div>
        </div>
      </section>
      
      <section className="team">
        <h2>Our Team</h2>
        <p>With years of expertise and experience, our team of professionals is dedicated to leveraging the latest technology solutions to improve the quality of life at work, at home, and in every aspect of your business journey.</p>
      </section>
      
      <Footer />
    </div>
  );
};

export default AboutPage;
