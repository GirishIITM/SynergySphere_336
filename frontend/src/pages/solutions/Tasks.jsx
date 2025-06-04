import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  AlertCircle,
  Calendar,
  CheckCircle,
  CheckSquare,
  Clock,
  Edit,
  Filter,
  Plus,
  Search,
  Trash2,
  TrendingUp,
  Star,
  Zap
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { loadingState } from '../../utils/apiCalls';
import { getCurrentUser } from '../../utils/apiCalls/auth';
import { projectAPI } from '../../utils/apiCalls/projectAPI';
import { taskAPI } from '../../utils/apiCalls/taskAPI';
import { taskAdvancedAPI } from '../../utils/apiCalls/taskAdvancedAPI';

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
  const [priorityMode, setPriorityMode] = useState(false);
  const [selectedProject, setSelectedProject] = useState('');

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
  }, [filters, pagination.offset, priorityMode, selectedProject]);

  const fetchTasks = async () => {
    try {
      let allTasks;
      
      if (priorityMode && selectedProject) {
        // Fetch prioritized tasks for the selected project
        allTasks = await taskAdvancedAPI.getPrioritizedTasks(selectedProject);
      } else {
        // Fetch regular tasks with filters
        const params = {
          ...filters,
          limit: pagination.limit,
          offset: pagination.offset
        };
        
        // Remove empty filters and "all" values
        Object.keys(params).forEach(key => {
          if (!params[key] || params[key] === 'all') delete params[key];
        });

        allTasks = await taskAPI.getAllTasks(params);
      }
      
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

  const handleRecalculatePriorities = async () => {
    try {
      await taskAdvancedAPI.recalculatePriorityScores(currentUser.id);
      fetchTasks(); // Refresh the list
      setError('');
    } catch (err) {
      setError('Failed to recalculate priorities: ' + (err.message || 'Unknown error'));
    }
  };

  const togglePriorityMode = () => {
    setPriorityMode(!priorityMode);
    if (!priorityMode && projects.length > 0) {
      setSelectedProject(projects[0].id);
    }
  };

  const getPriorityBadge = (score) => {
    if (!score) return null;
    if (score >= 80) return { text: 'High', variant: 'destructive', icon: Zap };
    if (score >= 60) return { text: 'Medium', variant: 'warning', icon: TrendingUp };
    return { text: 'Low', variant: 'secondary', icon: Star };
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-blue-600" />;
      case 'pending':
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
      default:
        return <CheckSquare className="h-4 w-4" />;
    }
  };

  const getStatusVariant = (status) => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'in_progress':
        return 'secondary';
      case 'pending':
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
        <div className="flex gap-2">
          <Button 
            variant={priorityMode ? "default" : "outline"} 
            onClick={togglePriorityMode}
            className="flex items-center gap-2"
          >
            <Star className="h-4 w-4" />
            {priorityMode ? 'Priority View' : 'Enable Priority'}
          </Button>
          <Button asChild size="lg" className="shadow-md">
            <Link to="/solutions/tasks/create">
              <Plus className="h-4 w-4 mr-2" />
              Create Task
            </Link>
          </Button>
        </div>
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

      {/* Priority Mode Controls */}
      {priorityMode && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5" />
              Smart Task Prioritization
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium">Select Project for Priority View</label>
                <Select value={selectedProject} onValueChange={setSelectedProject}>
                  <SelectTrigger className="mt-1">
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
              <Button 
                variant="outline" 
                onClick={handleRecalculatePriorities}
                className="flex items-center gap-2"
              >
                <TrendingUp className="h-4 w-4" />
                Recalculate Priorities
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters - Only show in normal mode */}
      {!priorityMode && (
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
                    <SelectItem value="pending">Not Started</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
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
      )}

      {/* Tasks Grid */}
      {tasks.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <CheckSquare className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No tasks found</h3>
            <p className="text-muted-foreground text-center max-w-md mb-4">
              {priorityMode 
                ? "No tasks found for this project or try recalculating priorities"
                : Object.values(filters).some(filter => filter) 
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
          {tasks.map((task) => {
            const priorityInfo = getPriorityBadge(task.priority_score);
            const overdueTask = isOverdue(task.due_date, task.status);
            
            return (
              <Card key={task.id} className={`hover:shadow-lg transition-shadow ${
                overdueTask ? 'border-red-500 bg-red-50/50 dark:bg-red-950/50' : ''
              }`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base line-clamp-2 mb-1">
                        {task.title}
                      </CardTitle>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={getStatusVariant(task.status)}>
                          {getStatusIcon(task.status)}
                          <span className="ml-1">{task.status}</span>
                        </Badge>
                        {priorityMode && priorityInfo && (
                          <Badge variant={priorityInfo.variant} className="flex items-center gap-1">
                            <priorityInfo.icon className="h-3 w-3" />
                            {priorityInfo.text}
                          </Badge>
                        )}
                        {overdueTask && (
                          <Badge variant="destructive" className="bg-red-600 hover:bg-red-700">
                            Overdue
                          </Badge>
                        )}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link to={`/solutions/tasks/edit/${task.id}`}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Task
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={() => handleDelete(task.id, task.project_id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Task
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>

                <CardContent className="py-3">
                  <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                    {task.description || 'No description provided'}
                  </p>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Project:</span>
                      <span className="font-medium">{getProjectName(task.project_id)}</span>
                    </div>

                    {task.due_date && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Due Date:</span>
                        <span className={`font-medium ${overdueTask ? 'text-red-600' : ''}`}>
                          {formatDate(task.due_date)}
                        </span>
                      </div>
                    )}

                    {task.assigned_to && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Assigned to:</span>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-xs">
                              {getInitials(task.assigned_to_name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-xs">{task.assigned_to_name}</span>
                        </div>
                      </div>
                    )}

                    {priorityMode && task.priority_score && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Priority Score:</span>
                        <span className="font-medium">{task.priority_score.toFixed(1)}</span>
                      </div>
                    )}
                  </div>
                </CardContent>

                <Separator />

                <CardFooter className="pt-3">
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>
                        Created {new Date(task.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    
                    <Select
                      value={task.status}
                      onValueChange={(newStatus) => handleUpdateStatus(task.id, newStatus)}
                    >
                      <SelectTrigger className="w-32 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Not Started</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {/* Load More Button - Only in normal mode */}
      {!priorityMode && pagination.has_more && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={loadMore}>
            Load More Tasks
          </Button>
        </div>
      )}
    </div>
  );
};

export default Tasks;
