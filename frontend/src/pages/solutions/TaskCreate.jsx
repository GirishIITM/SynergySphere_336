import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@radix-ui/react-dropdown-menu';
import {
  ArrowLeft,
  Save
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { loadingState } from '../../utils/apiCalls';
import { getCurrentUser } from '../../utils/apiCalls/auth';
import { projectAPI } from '../../utils/apiCalls/projectAPI';
import { taskAPI } from '../../utils/apiCalls/taskAPI';

const TaskCreate = () => {
  const [projects, setProjects] = useState([]);
  const [formData, setFormData] = useState({
    project_id: '',
    title: '',
    description: '',
    due_date: '',
    status: 'Not Started',
    assigned_to: '' // Add assigned user field
  });
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Add member search state for task assignment
  const [assigneeQuery, setAssigneeQuery] = useState('');
  const [assigneeResults, setAssigneeResults] = useState([]);
  const [selectedAssignee, setSelectedAssignee] = useState(null);
  const [isSearchingAssignee, setIsSearchingAssignee] = useState(false);
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);
  const [assigneeDebounceTimeout, setAssigneeDebounceTimeout] = useState(null);
  
  const navigate = useNavigate();
  const currentUser = getCurrentUser();

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await projectAPI.getAllProjects();
      // Handle new API response structure
      const projectsData = response.projects || response || [];
      setProjects(Array.isArray(projectsData) ? projectsData : []);
    } catch (err) {
      setError('Failed to load projects: ' + (err.message || 'Unknown error'));
      console.error('Error fetching projects:', err);
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
      await taskAPI.createTask(
        formData.project_id,
        formData.title,
        formData.description,
        formData.due_date,
        formData.status,
        formData.assigned_to // Include assigned user
      );
      
      setSuccess('Task created successfully! Redirecting...');
      setTimeout(() => {
        navigate('/solutions/tasks');
      }, 1500);
      setError('');
    } catch (err) {
      setError('Failed to create task: ' + (err.message || 'Unknown error'));
    }
  };

  if (loadingProjects) {
    return <div className="task-create-loading">Loading projects...</div>;
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <Button asChild variant="outline">
          <Link to="/solutions/tasks">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Tasks
          </Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Create New Task</h1>
      </div>

      {error && (
        <Card className="border-destructive bg-destructive/10">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <p className="text-destructive font-medium">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {success && (
        <Card className="border-green-500 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <p className="text-green-700 font-medium">{success}</p>
            </div>
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
              >
                <SelectTrigger>
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
                min={new Date().toISOString().slice(0, 16)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({...formData, status: value})}
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
                />
                
                {isSearchingAssignee && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <Clock className="h-4 w-4 animate-spin" />
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
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-sm">
                              {user.full_name?.charAt(0)?.toUpperCase() || 'U'}
                            </AvatarFallback>
                          </Avatar>
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
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-sm">
                              {selectedAssignee.full_name?.charAt(0)?.toUpperCase() || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="text-sm font-medium">{selectedAssignee.full_name}</div>
                            <div className="text-xs text-muted-foreground">{selectedAssignee.email}</div>
                          </div>
                        </div>
                        <Button
                          type="button"
                          onClick={clearAssignee}
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-6">
              <Button type="button" variant="outline" asChild>
                <Link to="/solutions/tasks">Cancel</Link>
              </Button>
              <Button type="submit" disabled={loadingState.isLoading('tasks-create')}>
                {loadingState.isLoading('tasks-create') ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Create Task
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default TaskCreate;
