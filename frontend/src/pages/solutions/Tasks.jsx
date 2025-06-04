import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  AlertCircle,
  Badge,
  Calendar,
  CheckCircle,
  CheckSquare,
  Clock,
  Edit,
  Filter,
  Plus,
  Search,
  Trash2
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { loadingState } from '../../utils/apiCalls';
import { getCurrentUser } from '../../utils/apiCalls/auth';
import { projectAPI } from '../../utils/apiCalls/projectAPI';
import { taskAPI } from '../../utils/apiCalls/taskAPI';

const Tasks = () => {
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ total: 0, limit: 20, offset: 0, has_more: false });
  const [filters, setFilters] = useState({
    search: '',
    project_id: '',
    status: '',
    owner: ''
  });
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
  }, [filters, pagination.offset]);

  const fetchTasks = async () => {
    try {
      const params = {
        ...filters,
        limit: pagination.limit,
        offset: pagination.offset
      };
      
      // Remove empty filters and "all" values
      Object.keys(params).forEach(key => {
        if (!params[key] || params[key] === 'all') delete params[key];
      });

      const allTasks = await taskAPI.getAllTasks(params);
      setTasks(Array.isArray(allTasks) ? allTasks : []);
      setError('');
    } catch (err) {
      setError('Failed to fetch tasks: ' + (err.message || 'Unknown error'));
      console.error('Error fetching tasks:', err);
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
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, offset: 0 }));
  };

  const handleDelete = async (taskId, projectId) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;

    try {
      await taskAPI.deleteTask(taskId, projectId);
      fetchTasks();
      setError('');
    } catch (err) {
      setError('Failed to delete task: ' + (err.message || 'Unknown error'));
    }
  };

  const handleUpdateStatus = async (taskId, newStatus) => {
    try {
      await taskAPI.updateTaskStatus(taskId, newStatus);
      fetchTasks();
      setError('');
    } catch (err) {
      setError('Failed to update task status: ' + (err.message || 'Unknown error'));
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'In Progress':
        return <Clock className="h-4 w-4 text-blue-600" />;
      case 'Not Started':
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
      default:
        return <CheckSquare className="h-4 w-4" />;
    }
  };

  const getStatusVariant = (status) => {
    switch (status) {
      case 'Completed':
        return 'default';
      case 'In Progress':
        return 'secondary';
      case 'Not Started':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'No deadline';
    return new Date(dateString).toLocaleDateString();
  };

  const getProjectName = (projectId) => {
    const project = projects.find(p => p.id === projectId);
    return project ? project.name : 'Unknown Project';
  };

  const isOverdue = (dateString, status) => {
    if (!dateString || status === 'Completed') return false;
    return new Date(dateString) < new Date();
  };

  const getInitials = (name) => {
    return name ? name.split(' ').map(n => n[0]).join('').toUpperCase() : 'U';
  };

  const loadMore = () => {
    setPagination(prev => ({ ...prev, offset: prev.offset + prev.limit }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center space-x-2">
          <Clock className="h-6 w-6 animate-spin" />
          <span className="text-lg">Loading tasks...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tasks</h1>
          <p className="text-muted-foreground">
            Manage and track your project tasks
          </p>
        </div>
        <Button asChild size="lg" className="shadow-md">
          <Link to="/solutions/tasks/create">
            <Plus className="h-4 w-4 mr-2" />
            Create Task
          </Link>
        </Button>
      </div>

      {/* Error Alert */}
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

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search Tasks</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by title or description..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Project</label>
              <Select
                value={filters.project_id}
                onValueChange={(value) => handleFilterChange('project_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Projects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  {projects.map(project => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select
                value={filters.status}
                onValueChange={(value) => handleFilterChange('status', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="Not Started">Not Started</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button 
                variant="outline" 
                onClick={() => setFilters({ search: '', project_id: 'all', status: 'all', owner: '' })}
                className="w-full"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tasks Grid */}
      {tasks.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <CheckSquare className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No tasks found</h3>
            <p className="text-muted-foreground text-center max-w-md mb-4">
              {Object.values(filters).some(filter => filter) 
                ? "Try adjusting your filters to see more tasks"
                : "Create your first task to get started"
              }
            </p>
            <Button asChild size="lg">
              <Link to="/solutions/tasks/create">
                <Plus className="h-4 w-4 mr-2" />
                Create Task
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tasks.map(task => (
            <Card key={task.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg line-clamp-2">{task.title}</CardTitle>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleUpdateStatus(task.id, 'Not Started')}>
                        <AlertCircle className="h-4 w-4 mr-2" />
                        Mark as Not Started
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleUpdateStatus(task.id, 'In Progress')}>
                        <Clock className="h-4 w-4 mr-2" />
                        Mark as In Progress
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleUpdateStatus(task.id, 'Completed')}>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Mark as Completed
                      </DropdownMenuItem>
                      <Separator />
                      <DropdownMenuItem 
                        onClick={() => handleDelete(task.id, task.project_id)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Task
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {task.description && (
                  <p className="text-sm text-muted-foreground line-clamp-3">{task.description}</p>
                )}
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Project:</span>
                    <Badge variant="outline">{getProjectName(task.project_id)}</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Due Date:</span>
                    <div className={`flex items-center gap-1 ${isOverdue(task.due_date, task.status) ? 'text-destructive font-medium' : ''}`}>
                      <Calendar className="h-3 w-3" />
                      <span>
                        {formatDate(task.due_date)}
                        {isOverdue(task.due_date, task.status) && ' (Overdue)'}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
              
              <CardFooter className="pt-4">
                <div className="flex items-center justify-between w-full">
                  <Badge variant={getStatusVariant(task.status)} className="flex items-center gap-1">
                    {getStatusIcon(task.status)}
                    {task.status}
                  </Badge>
                  
                  {task.assignee && (
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs">
                          {getInitials(task.assignee)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">{task.assignee}</span>
                    </div>
                  )}
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Load More */}
      {tasks.length > 0 && pagination.has_more && (
        <div className="flex justify-center">
          <Button 
            onClick={loadMore} 
            variant="outline" 
            size="lg"
            disabled={loading}
            className="min-w-32"
          >
            {loading ? (
              <>
                <Clock className="h-4 w-4 mr-2 animate-spin" />
                Loading...
              </>
            ) : (
              'Load More'
            )}
          </Button>
        </div>
      )}
    </div>
  );
};

export default Tasks;
