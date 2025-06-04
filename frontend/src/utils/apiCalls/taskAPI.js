import { apiRequest } from './apiRequest.js';

export const taskAPI = {
  getAllTasks: (params = {}) => {
    const queryParams = new URLSearchParams();
    
    if (params.project_id) queryParams.append('project_id', params.project_id);
    if (params.status) queryParams.append('status', params.status);
    if (params.assignee) queryParams.append('assignee', params.assignee);
    if (params.search) queryParams.append('search', params.search);
    if (params.owner) queryParams.append('owner', params.owner);
    if (params.limit) queryParams.append('limit', params.limit);
    if (params.offset) queryParams.append('offset', params.offset);
    
    const endpoint = queryParams.toString() ? `/tasks?${queryParams}` : '/tasks';
    return apiRequest(endpoint, 'GET', null, 'tasks-get-all')
      .then(result => {
        // Handle new API response structure with tasks and pagination
        if (result && result.tasks && Array.isArray(result.tasks)) {
          return {
            tasks: result.tasks,
            pagination: result.pagination || {
              has_more: false,
              limit: 20,
              offset: 0,
              total: result.tasks.length
            }
          };
        }
        // Fallback for old response structure (direct array)
        const tasks = Array.isArray(result) ? result : [];
        return {
          tasks: tasks,
          pagination: {
            has_more: false,
            limit: 20,
            offset: 0,
            total: tasks.length
          }
        };
      })
      .catch(error => {
        console.error('Error fetching tasks:', error);
        return {
          tasks: [],
          pagination: {
            has_more: false,
            limit: 20,
            offset: 0,
            total: 0
          }
        };
      });
  },

  getTask: (id) => {
    return apiRequest(`/tasks/${id}`, 'GET', null, 'tasks-get-single');
  },

  getTaskDetails: (id) => {
    return apiRequest(`/tasks/${id}`, 'GET', null, 'task-details-get');
  },

  createTask: (project_id, title, description, due_date, status, assigned_to, budget) => {
    return apiRequest('/tasks', 'POST', { project_id, title, description, due_date, status, assigned_to, budget }, 'tasks-create');
  },

  updateTask: (id, project_id, title, description, due_date, status, assigned_to, budget) => {
    return apiRequest(`/tasks/${id}`, 'PUT', { project_id, title, description, due_date, status, assigned_to, budget }, 'tasks-update');
  },

  updateTaskStatus: (id, status) => {
    return apiRequest(`/tasks/${id}/status`, 'PUT', { status }, 'tasks-update-status');
  },

  updateTaskFavorite: (id, isFavorite) => {
    return apiRequest(`/tasks/${id}/favorite`, 'PUT', { is_favorite: isFavorite }, 'tasks-update-favorite');
  },

  deleteTask: (id, project_id) => {
    return apiRequest(`/tasks/${id}`, 'DELETE', { project_id }, 'tasks-delete');
  },

  getProjectTasks: (project_id) => {
    return apiRequest(`/projects/${project_id}/tasks`, 'GET', null, 'project-tasks-get');
  }
};
