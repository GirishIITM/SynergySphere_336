import { useEffect, useState } from 'react';
import { getCurrentUser } from '../../../utils/apicall';
import Footer from '../components/Footer';
import '../styles/Profile.css';

const Profile = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  // Removed activeTab state since we no longer need tabs

  useEffect(() => {
    // Get current user data from local storage
    const userData = getCurrentUser();
    if (userData) {
      setUser(userData);
    }
    setLoading(false);
  }, []);

  if (loading) {
    return <div className="profile-loading">Loading profile information...</div>;
  }

  if (!user) {
    return <div className="profile-error">You must be logged in to view this page.</div>;
  }

  return (
    <div className="profile-page">
      <div className="profile-header">
        <div className="profile-avatar">
          {user.name?.charAt(0).toUpperCase() || 'U'}
        </div>
        <h1>{user.name}</h1>
        <p className="profile-email">{user.email}</p>
      </div>

      {/* Removed tabs section */}

      <div className="profile-content">
        <div className="profile-section">
          <h2>Personal Information</h2>
          <div className="profile-info-card">
            <div className="profile-info-item">
              <span className="profile-info-label">Full Name</span>
              <span className="profile-info-value">{user.name}</span>
            </div>
            <div className="profile-info-item">
              <span className="profile-info-label">Email Address</span>
              <span className="profile-info-value">{user.email}</span>
            </div>
            <div className="profile-info-item">
              <span className="profile-info-label">User ID</span>
              <span className="profile-info-value">{user.id}</span>
            </div>
            <div className="profile-info-item">
              <span className="profile-info-label">Role</span>
              <span className="profile-info-value">{user.role || 'Regular User'}</span>
            </div>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default Profile;