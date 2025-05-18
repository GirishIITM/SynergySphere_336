import { useEffect, useState } from 'react';
import { getCurrentUser, loadingState, projectAPI } from '../../../../utils/apicall';
import './Projects.css';

const Projects = () => {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
  });
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState('');

  const currentUser = getCurrentUser();

  useEffect(() => {
    fetchProjects();

    const loadingUnsubscribe = loadingState.subscribe('projects-get-all', (isLoading) => {
      setLoading(isLoading);
    });

    return () => {
      loadingUnsubscribe();
    };
  }, []);

  const fetchProjects = async () => {
    try {
      const allProjects = await projectAPI.getAllProjects();
      setProjects(allProjects);
      setError('');
    } catch (err) {
      setError('Failed to fetch projects: ' + (err.message || 'Unknown error'));
      console.error('Error fetching projects:', err);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name) {
      setError('Project name is required');
      return;
    }

    try {
      if (isEditing && selectedProject) {
        await projectAPI.updateProject(selectedProject.id, { name: formData.name });
      } else {
        await projectAPI.createProject(formData.name, currentUser.id);
      }

      resetForm();
      fetchProjects();
      setError('');
    } catch (err) {
      setError(`Failed to ${isEditing ? 'update' : 'create'} project: ${err.message || 'Unknown error'}`);
    }
  };

  const handleEdit = (project) => {
    setSelectedProject(project);
    setFormData({
      name: project.name,
    });
    setIsEditing(true);
  };

  const handleDelete = async (projectId) => {
    try {
      await projectAPI.deleteProject(projectId);
      // Update local state to immediately remove the deleted project
      setProjects(projects.filter(project => project.id !== projectId));
      setError('');
    } catch (err) {
      setError('Failed to delete project: ' + (err.message || 'Unknown error'));
    }
    finally {
      setProjects(projects.filter(project => project.id !== projectId));
      setError('');
    }
  };

  const resetForm = () => {
    setFormData({ name: '' });
    setSelectedProject(null);
    setIsEditing(false);
  };

  if (loading) {
    return <div className="loading-message">Loading projects...</div>;
  }

  return (
    <div className="projects-page">
      <div className="projects-header">
        <h1 className="projects-title">Project Management</h1>
        <p className="projects-subtitle">Create and manage your projects</p>
      </div>

      {error && (
        <div className="error-alert">
          {error}
        </div>
      )}

      <div className="projects-grid">
        {/* Project Form */}
        <div className="project-form">
          <h2 className="form-title">{isEditing ? 'Edit Project' : 'Create New Project'}</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Project Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="form-input"
                required
              />
            </div>

            <div className="button-group">
              <button
                type="submit"
                className="btn btn-primary"
              >
                {isEditing ? 'Update Project' : 'Create Project'}
              </button>
              {isEditing && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Project List */}
        <div>
          <h2 className="form-title">Projects</h2>
          {projects.length === 0 ? (
            <div className="empty-state">
              No projects found. Create a new project to get started.
            </div>
          ) : (
            <div className="project-list">
              {projects.map(project => (
                <div key={project.id} className="project-item">
                  <div className="project-header">
                    <div>
                      <h3 className="project-name">{project.name}</h3>
                      <p className="project-creator">
                        Created by: {project.created_by === currentUser.id ? 'You' : `User #${project.created_by}`}
                      </p>
                      <div className="project-badges">
                        <span className="project-badge tasks-badge">
                          {project.tasks?.length || 0} Tasks
                        </span>
                        <span className="project-badge members-badge">
                          {project.member_count || 0} Members
                        </span>
                      </div>
                    </div>
                    <div className="project-actions">
                      <button
                        onClick={() => handleEdit(project)}
                        className="action-btn edit-btn"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(project.id)}
                        className="action-btn delete-btn"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Projects;
