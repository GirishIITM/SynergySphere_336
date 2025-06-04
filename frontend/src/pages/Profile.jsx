import { useEffect, useState } from 'react';
import penIcon from '../assets/pen.png';
import LoadingIndicator from '../components/LoadingIndicator';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import '../styles/Profile.css';
import { profileAPI } from '../utils/apiCalls';

const Profile = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [editingUsername, setEditingUsername] = useState(false);
  const [editingAbout, setEditingAbout] = useState(false);
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [about, setAbout] = useState('');
  const [profileImage, setProfileImage] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      setError('');
      const userData = await profileAPI.getProfile();
      setUser(()=>userData);
      console.log(userData.full_name)
      setFullName(()=>userData.full_name || '');
      setUsername(()=>userData.username || '');
      setAbout(()=>userData.about || '');
      setProfileImage(()=>userData.profile_picture || null);
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      setError('Failed to load profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveName = async () => {
    try {
      const response = await profileAPI.updateProfile({ full_name: fullName });
      
      setUser(prevUser => ({ ...prevUser, full_name: fullName }));
      setEditingName(false);
      
    } catch (error) {
      console.error('Failed to update name:', error);
      alert('Failed to update name. Please try again.');
    }
  };

  const handleSaveUsername = async () => {
    try {
      const response = await profileAPI.updateProfile({ username: username });
      
      setUser(prevUser => ({ ...prevUser, username: username }));
      setEditingUsername(false);
      
    } catch (error) {
      console.error('Failed to update username:', error);
      alert('Failed to update username. Please try again.');
    }
  };

  const handleSaveAbout = async () => {
    try {
      const response = await profileAPI.updateProfile({ about: about });
      
      setUser(prevUser => ({ ...prevUser, about: about }));
      setEditingAbout(false);
      
    } catch (error) {
      console.error('Failed to update about:', error);
      alert('Failed to update about. Please try again.');
    }
  };

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setUploadError('Please select a valid image file (JPG, PNG, GIF, or WEBP)');
      return;
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setUploadError('File size must be less than 5MB');
      return;
    }

    setUploadingImage(true);
    setUploadError('');

    try {
      const result = await profileAPI.uploadProfileImage(file);
      
      if (result && result.profile_picture) {
        setUser(prevUser => ({ ...prevUser, profile_picture: result.profile_picture }));
        setProfileImage(result.profile_picture);
      }
    } catch (error) {
      console.error('Image upload failed:', error);
      setUploadError(error.message || 'Failed to upload image. Please try again.');
    } finally {
      setUploadingImage(false);
    }
  };

  if (loading) {
    return <div className="profile-loading">Loading profile information...</div>;
  }

  if (error) {
    return (
      <div className="profile-error">
        <p>{error}</p>
        <Button onClick={fetchUserProfile} variant="outline">Retry</Button>
      </div>
    );
  }

  if (!user) {
    return <div className="profile-error">You must be logged in to view this page.</div>;
  }

  const defaultAboutText = `Hey there! This is your space to manage your profile and stay on top of your tasks. Keep growing, stay focused, and make the most of every opportunity.`;

  let joinedDate = null;
  if (user.created_at) {
    joinedDate = new Date(user.created_at).toLocaleDateString(undefined, {
      year: 'numeric', month: 'long', day: 'numeric'
    });
  }

  return (
    <div className="profile-page">
      <LoadingIndicator loading={loading || uploadingImage}>
        <div className="profile-header">
          <div className="profile-avatar-wrapper">
            {profileImage ? (
              <img
                key={profileImage}
                src={profileImage}
                alt="Profile"
                className="profile-avatar-image"
              />
            ) : (
              <div className="profile-avatar">
                {user.name?.charAt(0).toUpperCase() || 'U'}
              </div>
            )}

            <Input
              id="profile-pic-upload"
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
              style={{ display: 'none' }}
              onChange={handleImageChange}
              disabled={uploadingImage}
            />

            <img
              src={penIcon}
              alt="Edit Profile"
              className={`edit-image-icon ${uploadingImage ? 'uploading' : ''}`}
              onClick={() => !uploadingImage && document.getElementById('profile-pic-upload').click()}
              style={{ opacity: uploadingImage ? 0.5 : 1, cursor: uploadingImage ? 'not-allowed' : 'pointer' }}
            />

            {uploadingImage && (
              <div className="upload-spinner">Uploading...</div>
            )}
          </div>

          {uploadError && (
            <div className="upload-error">{uploadError}</div>
          )}

          <h1>{user.name}</h1>
          <p className="profile-email">{user.email}</p>
          {joinedDate && (
            <div className="profile-joined">Joined: {joinedDate}</div>
          )}
        </div>

        <div className="profile-content">
          <div className="profile-section">
            <h2>About</h2>
            <div className={`profile-about-card ${editingAbout ? 'editing' : ''}`}>
              {editingAbout ? (
                <>
                  <textarea
                    value={about}
                    onChange={(e) => setAbout(e.target.value)}
                    className="profile-about-textarea"
                    placeholder="Tell us about yourself..."
                  />
                  <div className="edit-buttons">
                    <button onClick={handleSaveAbout}>Save</button>
                    <button onClick={() => { setAbout(user.about || ''); setEditingAbout(false); }}>Cancel</button>
                  </div>
                </>
              ) : (
                <>
                  {user.about || defaultAboutText}
                  <button
                    className="edit-icon-button"
                    onClick={() => setEditingAbout(true)}
                    aria-label="Edit About"
                    style={{ float: 'right', marginTop: '-8px' }}
                  >
                    <img src={penIcon} alt="Edit" className="edit-icon" />
                  </button>
                </>
              )}
            </div>
          </div>
          <div className="profile-section">
            <h2>Personal Information</h2>
            <div className="profile-info-card">
              <div className="profile-info-item">
                <span className="profile-info-label">Full Name</span>
                {editingName ? (
                  <>
                    <Input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="profile-input"
                    />
                    <button onClick={handleSaveName}>Save</button>
                    <button onClick={() => { setFullName(user.full_name); setEditingName(false); }}>Cancel</button>
                  </>
                ) : (
                  <span className="profile-info-value">
                    {user.full_name}
                    <button
                      className="edit-icon-button"
                      onClick={() => setEditingName(true)}
                      aria-label="Edit Full Name"
                    >
                      <img src={penIcon} alt="Edit" className="edit-icon" />
                    </button>
                  </span>
                )}
              </div>
              <div className="profile-info-item">
                <span className="profile-info-label">Username</span>
                {editingUsername ? (
                  <>
                    <Input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="profile-input"
                    />
                    <button onClick={handleSaveUsername}>Save</button>
                    <button onClick={() => { setUsername(user.username); setEditingUsername(false); }}>Cancel</button>
                  </>
                ) : (
                  <span className="profile-info-value">
                    {user.username}
                    <button
                      className="edit-icon-button"
                      onClick={() => setEditingUsername(true)}
                      aria-label="Edit Username"
                    >
                      <img src={penIcon} alt="Edit" className="edit-icon" />
                    </button>
                  </span>
                )}
              </div>
              <div className="profile-info-item">
                <span className="profile-info-label">Email Address</span>
                <span className="profile-info-value">{user.email}</span>
              </div>
              <div className="profile-info-item">
                <span className="profile-info-label">User ID</span>
                <span className="profile-info-value">{user.id}</span>
              </div>
            </div>
          </div>
        </div>
      </LoadingIndicator>
    </div>
  );
};

export default Profile;
