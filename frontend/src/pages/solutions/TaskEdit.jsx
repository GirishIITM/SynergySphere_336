import { loadingState } from '@/utils/apiCalls';
import {
  ArrowLeft,
  Save
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import LoadingIndicator from '../../components/LoadingIndicator';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { projectAPI } from '../../utils/apiCalls/projectAPI';
import { taskAPI } from '../../utils/apiCalls/taskAPI';

const TaskEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [task, setTask] = useState(null);
  const [projects, setProjects] = useState([]);
  const [formData, setFormData] = useState({
    project_id: '',
    title: '',
    description: '',
    due_date: '',
    status: 'Not Started',
    assigned_to: ''
  });
  const [loading, setLoading] = useState(true);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Assignee search state
  const [assigneeQuery, setAssigneeQuery] = useState('');
  const [assigneeResults, setAssigneeResults] = useState([]);
  const [selectedAssignee, setSelectedAssignee] = useState(null);
  const [isSearchingAssignee, setIsSearchingAssignee] = useState(false);
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);
  const [assigneeDebounceTimeout, setAssigneeDebounceTimeout] = useState(null);
  
  useEffect(() => {
    fetchTask();
    fetchProjects();
  }, [id]);

  useEffect(() => {
    const checkLoadingState = () => {
      setIsUpdating(loadingState.isLoading('tasks-update'));
    };
    
    checkLoadingState();
    const interval = setInterval(checkLoadingState, 100);
    
    return () => {
      clearInterval(interval);
    };
  }, []);

  const fetchTask = async () => {
    try {
      setLoading(true);
      const response = await taskAPI.getTask(id);
      const taskData = response.task || response;
      
      setTask(taskData);
      setFormData({
        project_id: taskData.project_id || '',
        title: taskData.title || '',
        description: taskData.description || '',
        due_date: taskData.due_date ? taskData.due_date.slice(0, 16) : '',
        status: taskData.status || 'Not Started',
        assigned_to: taskData.assigned_to || ''
      });
      
      // Set assignee if exists
      if (taskData.assignee) {
        setAssigneeQuery(taskData.assignee);
        setSelectedAssignee({ 
          full_name: taskData.assignee, 
          email: taskData.assigned_to 
        });
      }
      
      setError('');
    } catch (err) {
      setError('Failed to load task: ' + (err.message || 'Unknown error'));
      console.error('Error fetching task:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const response = await projectAPI.getAllProjects();
      const projectsData = response.projects || response || [];
      setProjects(Array.isArray(projectsData) ? projectsData : []);
    } catch (err) {
      console.error('Error fetching projects:', err);
      setProjects([]);
    } finally {
      setLoadingProjects(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    
    if (error) {
      setError('');
    }
  };

  const searchAssignees = async (query) => {
    if (!query.trim()) {
      setAssigneeResults([]);
      setShowAssigneeDropdown(false);
      return;
    }

    try {
      setIsSearchingAssignee(true);
      const response = await projectAPI.searchUsers({ q: query, limit: 10 });
      setAssigneeResults(response.users || []);
      setShowAssigneeDropdown(true);
    } catch (err) {
      console.error('User search error:', err);
      setAssigneeResults([]);
    } finally {
      setIsSearchingAssignee(false);
    }
  };

  const handleAssigneeSearch = (e) => {
    const query = e.target.value;
    setAssigneeQuery(query);

    if (assigneeDebounceTimeout) {
      clearTimeout(assigneeDebounceTimeout);
    }

    const timeout = setTimeout(() => {
      searchAssignees(query);
    }, 300);

    setAssigneeDebounceTimeout(timeout);
  };

  const selectAssignee = (user) => {
    setSelectedAssignee(user);
    setFormData(prev => ({ ...prev, assigned_to: user.email }));
    setAssigneeQuery(user.full_name || user.email);
    setAssigneeResults([]);
    setShowAssigneeDropdown(false);
  };

  const clearAssignee = () => {
    setSelectedAssignee(null);
    setFormData(prev => ({ ...prev, assigned_to: '' }));
    setAssigneeQuery('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.project_id || !formData.title || !formData.due_date) {
      setError('Please fill all required fields');
      return;
    }

    try {
      setError('');
      setSuccess('');
      
      await taskAPI.updateTask(
        id,
        formData.project_id,
        formData.title,
        formData.description,
        formData.due_date,
        formData.status,
        formData.assigned_to
      );
      
      setSuccess('Task updated successfully! Redirecting...');
      setTimeout(() => {
        navigate('/solutions/tasks');
      }, 1500);
    } catch (err) {
      setError('Failed to update task: ' + (err.message || 'Unknown error'));
    }
  };

  const handleCancel = () => {
    navigate('/solutions/tasks');
  };

  if (loading || loadingProjects) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <LoadingIndicator loading={true}>
          <div className="text-center">Loading task...</div>
        </LoadingIndicator>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="text-center">
          <p className="text-red-600 mb-4">Task not found</p>
          <Button asChild>
            <Link to="/solutions/tasks">Back to Tasks</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="task-edit-page">
      <div className="task-edit-header">
        <Button asChild variant="outline">
          <Link to="/solutions/tasks">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Tasks
          </Link>
        </Button>
        <h1>Edit Task</h1>
      </div>

      <LoadingIndicator loading={isUpdating}>
        {error && (
          <Card className="mb-6 border-destructive">
            <CardContent className="p-4">
              <p className="text-destructive">{error}</p>
            </CardContent>
          </Card>
        )}

        {success && (
          <Card className="mb-6 border-success">
            <CardContent className="p-4">
              <p className="text-success">{success}</p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Task Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="project_id">Project *</Label>
                <Select
                  value={formData.project_id}
                  onValueChange={(value) => setFormData({...formData, project_id: value})}
                  required
                  disabled={true}
                >
                  <SelectTrigger className="bg-muted cursor-not-allowed">
                    <SelectValue placeholder="Select a project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map(project => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Project cannot be changed when editing a task
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Task Title *</Label>
                <Input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="Enter task title"
                  required
                  disabled={isUpdating}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Enter task description"
                  rows={4}
                  disabled={isUpdating}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="due_date">Due Date & Time *</Label>
                <Input
                  type="datetime-local"
                  id="due_date"
                  name="due_date"
                  value={formData.due_date}
                  onChange={handleInputChange}
                  required
                  disabled={isUpdating}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({...formData, status: value})}
                  disabled={isUpdating}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Not Started">Not Started</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="assigned_to">Assign To (Optional)</Label>
                <div className="relative">
                  <Input
                    type="text"
                    value={assigneeQuery}
                    onChange={handleAssigneeSearch}
                    placeholder="Search users to assign task..."
                    disabled={isUpdating}
                  />
                  
                  {isSearchingAssignee && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    </div>
                  )}
                  
                  {showAssigneeDropdown && assigneeResults.length > 0 && (
                    <Card className="absolute z-10 w-full mt-1 shadow-lg max-h-40 overflow-y-auto">
                      <CardContent className="p-0">
                        {assigneeResults.map(user => (
                          <div
                            key={user.id}
                            className="px-4 py-3 hover:bg-muted cursor-pointer flex items-center space-x-3 border-b last:border-b-0"
                            onClick={() => selectAssignee(user)}
                          >
                            <div className="flex-shrink-0">
                              {user.profile_picture ? (
                                <img 
                                  src={user.profile_picture} 
                                  alt={user.full_name}
                                  className="w-6 h-6 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center text-xs font-medium">
                                  {user.full_name?.charAt(0)?.toUpperCase() || 'U'}
                                </div>
                              )}
                            </div>
                            <div>
                              <div className="text-sm font-medium">{user.full_name}</div>
                              <div className="text-xs text-muted-foreground">{user.email}</div>
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}
                  
                  {selectedAssignee && (
                    <Card className="mt-3">
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center text-xs font-medium">
                              {selectedAssignee.full_name?.charAt(0)?.toUpperCase() || 'U'}
                            </div>
                            <span className="text-sm font-medium">{selectedAssignee.full_name}</span>
                          </div>
                          <Button
                            type="button"
                            onClick={clearAssignee}
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            disabled={isUpdating}
                          >
                            ×
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-6">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleCancel}
                  disabled={isUpdating}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isUpdating} className="flex-1">
                  {isUpdating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Updating...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Update Task
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </LoadingIndicator>
    </div>
  );
};

export default TaskEdit;
