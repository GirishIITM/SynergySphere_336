import { apiRequest } from "./apiRequest.js";

export const projectAPI = {
  getAllProjects: (params = {}) => {
    const queryParams = new URLSearchParams();
    
    if (params.search) queryParams.append('search', params.search);
    if (params.owner) queryParams.append('owner', params.owner);
    if (params.member) queryParams.append('member', params.member);
    if (params.status) queryParams.append('status', params.status);
    if (params.limit) queryParams.append('limit', params.limit);
    if (params.offset) queryParams.append('offset', params.offset);
    if (params.include_tasks) queryParams.append('include_tasks', 'true');
    
    const endpoint = queryParams.toString() ? `/projects?${queryParams}` : '/projects';
    return apiRequest(endpoint, 'GET', null, 'projects-get-all')
      .then(result => {
        if (result && result.projects && Array.isArray(result.projects)) {
          return {
            projects: result.projects,
            pagination: result.pagination || {
              has_more: false,
              limit: 20,
              offset: 0,
              total: result.projects.length
            }
          };
        }
        return {
          projects: Array.isArray(result) ? result : [],
          pagination: {
            has_more: false,
            limit: 20,
            offset: 0,
            total: Array.isArray(result) ? result.length : 0
          }
        };
      })
      .catch(error => {
        console.error('Error fetching projects:', error);
        return {
          projects: [],
          pagination: {
            has_more: false,
            limit: 20,
            offset: 0,
            total: 0
          }
        };
      });
  },

  getProject: (id) => {
    return apiRequest(`/projects/${id}`, 'GET', null, 'projects-get-single');
  },

  createProject: (projectData) => {
    const hasMemberEmails = projectData.member_emails && projectData.member_emails.length > 0;
    const hasMemberPermissions = projectData.member_permissions && Object.keys(projectData.member_permissions).length > 0;
    const hasImage = projectData.project_image instanceof File;
    
    if (hasImage || hasMemberEmails || hasMemberPermissions) {
      const formData = new FormData();
      formData.append('name', projectData.name);
      
      if (projectData.description) {
        formData.append('description', projectData.description);
      }
      
      if (projectData.deadline) {
        // Ensure we send datetime in ISO format
        const deadlineISO = new Date(projectData.deadline).toISOString();
        formData.append('deadline', deadlineISO);
      }
      
      if (hasMemberEmails) {
        // Send member emails as JSON string for FormData
        formData.append('member_emails', JSON.stringify(projectData.member_emails));
      }
      
      if (hasMemberPermissions) {
        // Send member permissions as JSON string for FormData
        formData.append('member_permissions', JSON.stringify(projectData.member_permissions));
      }
      
      if (hasImage) {
        formData.append('project_image', projectData.project_image);
      }
      
      return apiRequest('/projects', 'POST', formData, 'projects-create', false);
    } else {
      const jsonData = {
        name: projectData.name,
        description: projectData.description || '',
      };
      
      if (projectData.deadline) {
        // Ensure we send datetime in ISO format
        jsonData.deadline = new Date(projectData.deadline).toISOString();
      }
      
      if (hasMemberEmails) {
        jsonData.member_emails = projectData.member_emails;
      }
      
      if (hasMemberPermissions) {
        jsonData.member_permissions = projectData.member_permissions;
      }
      
      return apiRequest('/projects', 'POST', jsonData, 'projects-create');
    }
  },

  updateProject: (id, data) => {
    const jsonData = {
      name: data.name,
      description: data.description || '',
    };
    
    if (data.deadline) {
      jsonData.deadline = new Date(data.deadline).toISOString();
    }
    
    if (data.status !== undefined) {
      jsonData.status = data.status;
    }
    
    return apiRequest(`/projects/${id}`, 'PUT', jsonData, 'projects-update');
  },

  deleteProject: (id) => {
    return apiRequest(`/projects/${id}`, 'DELETE', null, 'projects-delete');
  },

  addProjectMember: (projectId, memberData) => {
    const data = {
      email: memberData.email,
      isEditor: memberData.isEditor || false
    };
    return apiRequest(`/projects/${projectId}/members`, 'POST', data, 'projects-add-member');
  },

  updateProjectMember: (projectId, memberId, memberData) => {
    return apiRequest(`/projects/${projectId}/members/${memberId}`, 'PUT', memberData, 'projects-update-member');
  },

  removeProjectMember: (projectId, memberId) => {
    return apiRequest(`/projects/${projectId}/members/${memberId}`, 'DELETE', null, 'projects-remove-member');
  },

  searchUsers: (searchParams = {}) => {
    const queryParams = new URLSearchParams();
    
    // Handle the search query parameter properly
    if (searchParams.q) {
      queryParams.append('q', searchParams.q);
    }
    if (searchParams.search) {
      queryParams.append('search', searchParams.search);
    }
    if (searchParams.limit) {
      queryParams.append('limit', searchParams.limit);
    }
    if (searchParams.offset) {
      queryParams.append('offset', searchParams.offset);
    }
    
    const endpoint = queryParams.toString() ? `/users/search?${queryParams}` : '/users/search';
    return apiRequest(endpoint, 'GET', null, 'users-search')
      .then(result => {
        // Ensure we return a consistent structure
        if (result && result.users && Array.isArray(result.users)) {
          return result;
        }
        // If the response is directly an array
        if (Array.isArray(result)) {
          return { users: result };
        }
        // Fallback
        return { users: [] };
      })
      .catch(error => {
        console.error('Error searching users:', error);
        return { users: [] };
      });
  }
};
