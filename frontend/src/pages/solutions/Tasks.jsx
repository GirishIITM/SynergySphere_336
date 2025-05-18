import { useEffect, useState } from 'react';
import { getCurrentUser, loadingState, projectAPI, taskAPI } from '../../../../utils/apicall';
import './Tasks.css';

const Tasks = () => {
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    project_id: '',
    title: '',
    description: '',
    due_date: '',
    status: 'Not Started'
  });
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState('');

  const currentUser = getCurrentUser();

  useEffect(() => {
    fetchTasks();
    fetchProjects();

    const loadingUnsubscribe = loadingState.subscribe('tasks-get-all', (isLoading) => {
      setLoading(isLoading);
    });

    return () => {
      loadingUnsubscribe();
    };
  }, []);

  const fetchTasks = async () => {
    try {
      const allTasks = await taskAPI.getAllTasks();
      setTasks(allTasks);
      setError('');
    } catch (err) {
      setError('Failed to fetch tasks: ' + (err.message || 'Unknown error'));
      console.error('Error fetching tasks:', err);
    }
  };

  const fetchProjects = async () => {
    try {
      const allProjects = await projectAPI.getAllProjects();
      setProjects(allProjects);
    } catch (err) {
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
    
    if (!formData.project_id || !formData.title || !formData.due_date || !formData.status) {
      setError('Please fill all required fields');
      return;
    }

    try {
      if (isEditing && selectedTask) {
        await taskAPI.updateTask(
          selectedTask.id,
          formData.project_id,
          formData.title,
          formData.description,
          formData.due_date,
          formData.status
        );
      } else {
        await taskAPI.createTask(
          formData.project_id,
          formData.title,
          formData.description,
          formData.due_date,
          formData.status
        );
      }
      
      resetForm();
      fetchTasks();
      setError('');
    } catch (err) {
      setError(`Failed to ${isEditing ? 'update' : 'create'} task: ${err.message || 'Unknown error'}`);
    }
  };

  const handleEdit = (task) => {
    setSelectedTask(task);
    setFormData({
      project_id: task.project_id,
      title: task.title,
      description: task.description || '',
      due_date: task.due_date ? task.due_date.substring(0, 10) : '',
      status: task.status
    });
    setIsEditing(true);
  };

  const handleDelete = async (taskId, projectId) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      try {
        await taskAPI.deleteTask(taskId, projectId);
        fetchTasks();
      } catch (err) {
        setError('Failed to delete task: ' + (err.message || 'Unknown error'));
      }
    }
  };

  const resetForm = () => {
    setFormData({
      project_id: '',
      title: '',
      description: '',
      due_date: '',
      status: 'Not Started'
    });
    setSelectedTask(null);
    setIsEditing(false);
  };

  const getProjectName = (projectId) => {
    const project = projects.find(p => p.id === projectId);
    return project ? project.name : 'Unknown Project';
  };

  const statusColors = {
    'Not Started': 'bg-gray-200 text-gray-800',
    'In Progress': 'bg-blue-200 text-blue-800',
    'Completed': 'bg-green-200 text-green-800',
    'Blocked': 'bg-red-200 text-red-800'
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="loading-spinner"></div>
        <span className="ml-3 text-lg">Loading tasks...</span>
      </div>
    );
  }

  return (
    <div className="task-container px-4">
      <h1 className="text-2xl font-bold mb-6 page-title">Task Management</h1>
      
      {error && (
        <div className="error-message mb-4">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Task Form */}
        <div className="task-form">
          <h2 className="text-xl font-semibold mb-4">{isEditing ? 'Edit Task' : 'Create New Task'}</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Project</label>
              <select
                name="project_id"
                value={formData.project_id}
                onChange={handleInputChange}
                className="form-select"
                required
              >
                <option value="">Select a Project</option>
                {projects.map(project => (
                  <option key={project.id} value={project.id}>{project.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Title</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                className="form-textarea"
                rows="3"
              ></textarea>
            </div>

            <div className="form-group">
              <label className="form-label">Due Date</label>
              <input
                type="date"
                name="due_date"
                value={formData.due_date}
                onChange={handleInputChange}
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Status</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                className="form-select"
                required
              >
                <option value="Not Started">Not Started</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
                <option value="Blocked">Blocked</option>
              </select>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                className="btn btn-primary"
              >
                {isEditing ? 'Update Task' : 'Create Task'}
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

        {/* Task List */}
        <div className="task-list-container">
          <h2 className="text-xl font-semibold mb-4">Tasks</h2>
          {tasks.length === 0 ? (
            <div className="empty-state">
              <p>No tasks found. Create a new task to get started.</p>
            </div>
          ) : (
            <div className="task-list">
              {tasks.map(task => (
                <div key={task.id} className="task-card">
                  <div className="flex flex-col md:flex-row justify-between items-start">
                    <div className="task-content overflow-hidden">
                      <h3 className="task-title break-words">{task.title}</h3>
                      <p className="task-project">Project: {getProjectName(task.project_id)}</p>
                      {task.description && <p className="task-description break-words">{task.description}</p>}
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className={`status-badge ${statusColors[task.status] || 'bg-gray-200'}`}>
                          {task.status}
                        </span>
                        <span className="date-badge">
                          Due: {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'Not set'}
                        </span>
                      </div>
                    </div>
                    <div className="task-actions mt-3 md:mt-0">
                      <button
                        onClick={() => handleEdit(task)}
                        className="action-btn edit-btn"
                        aria-label="Edit task"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(task.id, task.project_id)}
                        className="action-btn delete-btn"
                        aria-label="Delete task"
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

export default Tasks;
