import { ArrowLeft, Save } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import LoadingIndicator from '../../components/LoadingIndicator';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { getCurrentUser, loadingState, projectAPI } from '../../utils/apiCalls';

const ProjectEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    deadline: '',
    project_image: null,
    member_emails: [],
    member_permissions: {}
  });
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [imagePreview, setImagePreview] = useState(null);
  const [existingImageUrl, setExistingImageUrl] = useState('');
  
  // Member selection state
  const [memberQuery, setMemberQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [currentMembers, setCurrentMembers] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchDebounceTimeout, setSearchDebounceTimeout] = useState(null);

  const currentUser = getCurrentUser();

  useEffect(() => {
    fetchProject();
  }, [id]);

  useEffect(() => {
    const checkLoadingState = () => {
      setIsUpdating(loadingState.isLoading('projects-update'));
    };

    checkLoadingState();
    const interval = setInterval(checkLoadingState, 100);

    return () => {
      clearInterval(interval);
    };
  }, []);

  const fetchProject = async () => {
    try {
      setLoading(true);
      const response = await projectAPI.getProject(id);
      const projectData = response.project || response;

      setProject(projectData);
      
      // Set basic form data
      setFormData(prev => ({
        ...prev,
        name: projectData.name || '',
        description: projectData.description || '',
        deadline: projectData.deadline ? projectData.deadline.slice(0, 16) : ''
      }));

      // Set existing image
      if (projectData.project_image) {
        setExistingImageUrl(projectData.project_image);
      }

      // Fetch project members
      if (projectData.id) {
        try {
          const membersResponse = await projectAPI.getProjectMembers(projectData.id);
          const members = membersResponse.members || [];
          setCurrentMembers(members);
          setSelectedMembers(members);
          
          // Set up member permissions
          const permissions = {};
          const emails = [];
          members.forEach(member => {
            emails.push(member.email);
            permissions[member.email] = member.can_edit || false;
          });
          
          setFormData(prev => ({
            ...prev,
            member_emails: emails,
            member_permissions: permissions
          }));
        } catch (err) {
          console.error('Error fetching project members:', err);
        }
      }

      setError('');
    } catch (err) {
      setError('Failed to load project: ' + (err.message || 'Unknown error'));
      console.error('Error fetching project:', err);
    } finally {
      setLoading(false);
    }
  };

  const searchUsers = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    try {
      setIsSearching(true);
      const response = await projectAPI.searchUsers({ q: query, limit: 10 });
      
      const filteredResults = response.users.filter(
        user => !selectedMembers.some(selected => selected.id === user.id)
      );
      
      setSearchResults(filteredResults);
      setShowDropdown(true);
    } catch (err) {
      console.error('User search error:', err);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleMemberSearch = (e) => {
    const query = e.target.value;
    setMemberQuery(query);

    if (searchDebounceTimeout) {
      clearTimeout(searchDebounceTimeout);
    }

    const timeout = setTimeout(() => {
      searchUsers(query);
    }, 300);

    setSearchDebounceTimeout(timeout);
  };

  const addMember = (user) => {
    setSelectedMembers(prev => [...prev, user]);
    setFormData(prev => ({
      ...prev,
      member_emails: [...prev.member_emails, user.email],
      member_permissions: { ...prev.member_permissions, [user.email]: false }
    }));
    setMemberQuery('');
    setSearchResults([]);
    setShowDropdown(false);
  };

  const removeMember = (userId) => {
    const member = selectedMembers.find(m => m.id === userId);
    if (member) {
      setSelectedMembers(prev => prev.filter(m => m.id !== userId));
      setFormData(prev => {
        const newPermissions = { ...prev.member_permissions };
        delete newPermissions[member.email];
        return {
          ...prev,
          member_emails: prev.member_emails.filter(email => email !== member.email),
          member_permissions: newPermissions
        };
      });
    }
  };

  const toggleMemberPermission = (email) => {
    setFormData(prev => ({
      ...prev,
      member_permissions: {
        ...prev.member_permissions,
        [email]: !prev.member_permissions[email]
      }
    }));
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.member-search-container')) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const validateForm = () => {
    const errors = {};

    if (!formData.name.trim()) {
      errors.name = 'Project name is required';
    } else if (formData.name.trim().length < 3) {
      errors.name = 'Project name must be at least 3 characters';
    } else if (formData.name.trim().length > 100) {
      errors.name = 'Project name must be less than 100 characters';
    }

    if (formData.description && formData.description.length > 500) {
      errors.description = 'Description must be less than 500 characters';
    }

    if (formData.deadline) {
      const deadlineDate = new Date(formData.deadline);
      const now = new Date();
      if (deadlineDate <= now) {
        errors.deadline = 'Deadline must be in the future';
      }
    }
    
    if (formData.project_image) {
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      const maxSize = 5 * 1024 * 1024; // 5MB
      
      if (!allowedTypes.includes(formData.project_image.type)) {
        errors.project_image = 'Please select a valid image file (JPG, PNG, GIF, or WEBP)';
      }
      
      if (formData.project_image.size > maxSize) {
        errors.project_image = 'Image size must be less than 5MB';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }

    if (error) {
      setError('');
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData(prev => ({ ...prev, project_image: file }));
      
      const reader = new FileReader();
      reader.onload = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
      
      if (formErrors.project_image) {
        setFormErrors(prev => ({ ...prev, project_image: '' }));
      }
    }
  };

  const removeImage = () => {
    setFormData(prev => ({ ...prev, project_image: null }));
    setImagePreview(null);
    setExistingImageUrl('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setError('');
      setSuccess('');

      // Send basic project data as JSON (not FormData)
      const submitData = {
        name: formData.name,
        description: formData.description,
        deadline: formData.deadline
      };

      await projectAPI.updateProject(id, submitData);

      setSuccess('Project updated successfully! Redirecting...');

      // TODO: Handle image upload and member management separately
      // For now, we're only updating basic project information
      
      // setTimeout(() => {
      //   navigate('/solutions/projects');
      // }, 2000);

    } catch (err) {
      const errorMessage = err.message || 'Failed to update project';

      if (errorMessage.includes('Project name already exists')) {
        setFormErrors({ name: 'A project with this name already exists' });
      } else if (errorMessage.includes('Invalid image')) {
        setFormErrors({ project_image: 'Invalid image file. Please select a different image.' });
      } else {
        setError(errorMessage);
      }
    }
  };

  const handleCancel = () => {
    navigate('/solutions/projects');
  };

  if (loading) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <LoadingIndicator loading={true}>
          <div className="text-center">Loading project...</div>
        </LoadingIndicator>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="text-center">
          <p className="text-red-600 mb-4">Project not found</p>
          <Button asChild>
            <Link to="/solutions/projects">Back to Projects</Link>
          </Button>
        </div>
      </div>
    );
  }

  // Check if user has permission to edit
  if (!project.is_owner && !project.user_can_edit) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="text-center">
          <p className="text-red-600 mb-4">You don't have permission to edit this project</p>
          <Button asChild>
            <Link to="/solutions/projects">Back to Projects</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <Button asChild variant="outline" className="mb-4">
          <Link to="/solutions/projects">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Projects
          </Link>
        </Button>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Edit Project</h1>
        <p className="text-gray-600">Update your project details and manage team members</p>
      </div>

      <LoadingIndicator loading={isUpdating}>
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Project Information */}
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Project Name <span className="text-red-500">*</span>
              </label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Enter project name"
                className={formErrors.name ? 'border-red-300' : ''}
                disabled={isUpdating}
                maxLength={100}
              />
              {formErrors.name && <p className="text-red-500 text-sm mt-1">{formErrors.name}</p>}
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Project description (optional)"
                rows="3"
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  formErrors.description ? 'border-red-300' : 'border-gray-300'
                }`}
                disabled={isUpdating}
                maxLength={500}
              />
              <div className="text-xs text-gray-500 mt-1">
                {formData.description.length}/500 characters
              </div>
              {formErrors.description && <p className="text-red-500 text-sm mt-1">{formErrors.description}</p>}
            </div>

            <div>
              <label htmlFor="deadline" className="block text-sm font-medium text-gray-700 mb-1">
                Deadline
              </label>
              <Input
                id="deadline"
                name="deadline"
                type="datetime-local"
                value={formData.deadline}
                onChange={handleInputChange}
                className={formErrors.deadline ? 'border-red-300' : ''}
                disabled={isUpdating}
                min={new Date().toISOString().slice(0, 16)}
              />
              {formErrors.deadline && <p className="text-red-500 text-sm mt-1">{formErrors.deadline}</p>}
            </div>
          </div>

          {/* Project Image */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Project Image
            </label>
            <div className="space-y-3">
              <input
                id="project-image-input"
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                onChange={handleImageChange}
                className="hidden"
                disabled={isUpdating}
              />
              
              {!imagePreview && !existingImageUrl ? (
                <label 
                  htmlFor="project-image-input" 
                  className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
                >
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <svg className="w-8 h-8 mb-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p className="mb-2 text-sm text-gray-500">
                      <span className="font-semibold">Click to upload</span> project image
                    </p>
                    <p className="text-xs text-gray-500">JPG, PNG, GIF, WEBP (max 5MB)</p>
                  </div>
                </label>
              ) : (
                <div className="relative">
                  <img
                    src={imagePreview || existingImageUrl}
                    alt="Project image"
                    className="w-full h-32 object-cover rounded-lg"
                  />
                  <div className="absolute top-2 right-2 flex space-x-2">
                    <Button
                      type="button"
                      onClick={removeImage}
                      disabled={isUpdating}
                      variant="destructive"
                      size="sm"
                    >
                      Remove
                    </Button>
                    <label htmlFor="project-image-input">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        as="span"
                      >
                        Change
                      </Button>
                    </label>
                  </div>
                </div>
              )}
              
              {formErrors.project_image && <p className="text-red-500 text-sm">{formErrors.project_image}</p>}
            </div>
          </div>

          {/* Team Members */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Team Members
            </label>
            
            <div className="member-search-container relative mb-3">
              <Input
                type="text"
                value={memberQuery}
                onChange={handleMemberSearch}
                placeholder="Search users by name, username, or email..."
                disabled={isUpdating}
              />
              
              {isSearching && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                </div>
              )}
              
              {showDropdown && searchResults.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                  {searchResults.map(user => (
                    <div
                      key={user.id}
                      className="px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center space-x-3"
                      onClick={() => addMember(user)}
                    >
                      <div className="flex-shrink-0">
                        {user.profile_picture ? (
                          <img 
                            src={user.profile_picture} 
                            alt={user.full_name}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-sm font-medium">
                            {user.full_name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || 'U'}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {user.full_name || 'Unknown User'}
                        </div>
                        <div className="text-sm text-gray-500 truncate">{user.email}</div>
                        {user.username && (
                          <div className="text-xs text-gray-400 truncate">@{user.username}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {showDropdown && memberQuery && searchResults.length === 0 && !isSearching && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
                  <div className="px-4 py-2 text-gray-500 text-center">No users found</div>
                </div>
              )}
            </div>
            
            {selectedMembers.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium text-gray-700">
                  Team Members ({selectedMembers.length})
                </div>
                <div className="space-y-2">
                  {selectedMembers.map(member => (
                    <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          {member.profile_picture ? (
                            <img 
                              src={member.profile_picture} 
                              alt={member.full_name}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-sm font-medium">
                              {member.full_name?.charAt(0)?.toUpperCase() || member.email?.charAt(0)?.toUpperCase() || 'U'}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {member.full_name || 'Unknown User'}
                          </div>
                          <div className="text-sm text-gray-500 truncate">{member.email}</div>
                          <div className="text-xs text-gray-500">
                            {formData.member_permissions[member.email] ? 'Can edit project' : 'View only access'}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={formData.member_permissions[member.email] || false}
                            onChange={() => toggleMemberPermission(member.email)}
                            disabled={isUpdating}
                            className="rounded"
                          />
                          <span className="text-sm text-gray-700">Editor</span>
                        </label>
                        {/* Only allow removing members who are not the project owner */}
                        {member.email !== currentUser?.email && (
                          <Button
                            type="button"
                            onClick={() => removeMember(member.id)}
                            disabled={isUpdating}
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-800"
                          >
                            ×
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isUpdating}
            >
              {isUpdating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Updating...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Update Project
                </>
              )}
            </Button>
          </div>
        </form>
      </LoadingIndicator>
    </div>
  );
};

export default ProjectEdit;
