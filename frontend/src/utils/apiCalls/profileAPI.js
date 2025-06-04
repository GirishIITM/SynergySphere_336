import { apiRequest } from './apiRequest.js';

export const profileAPI = {
  getProfile: () => apiRequest('/profile', 'GET', null, 'profile-get'),

  updateProfile: (data) => apiRequest('/profile', 'PUT', data, 'profile-update'),

  uploadProfileImage: (file) => {
    const formData = new FormData();
    formData.append('profile_image', file);
    return apiRequest('/profile/upload-image', 'POST', formData, 'profile-upload-image', false);
  },

  updateAbout: (about) => apiRequest('/profile', 'PUT', { about }, 'profile-update-about'),

  updateUsername: (username) => apiRequest('/profile', 'PUT', { username }, 'profile-update-username')
};
