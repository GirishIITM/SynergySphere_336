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
    deadline: ''
  });
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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
      setFormData({
        name: projectData.name || '',
        description: projectData.description || '',
        deadline: projectData.deadline ? projectData.deadline.slice(0, 16) : ''
      });
      setError('');
    } catch (err) {
      setError('Failed to load project: ' + (err.message || 'Unknown error'));
      console.error('Error fetching project:', err);
    } finally {
      setLoading(false);
    }
  };

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

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setError('');
      setSuccess('');

      await projectAPI.updateProject(id, {
        name: formData.name,
        description: formData.description,
        deadline: formData.deadline
      });

      setSuccess('Project updated successfully! Redirecting...');

      // navigate('/solutions/projects');

    } catch (err) {
      const errorMessage = err.message || 'Failed to update project';

      if (errorMessage.includes('Project name already exists')) {
        setFormErrors({ name: 'A project with this name already exists' });
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
        <p className="text-gray-600">Update your project details</p>
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
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${formErrors.description ? 'border-red-300' : 'border-gray-300'
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
