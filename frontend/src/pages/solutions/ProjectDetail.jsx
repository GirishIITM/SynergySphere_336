import { AlertCircle, ArrowLeft, Calendar, CheckCircle, Clock, DollarSign, Edit, Plus, Target, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import LoadingIndicator from '../../components/LoadingIndicator';
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Progress } from '../../components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../components/ui/tooltip';
import { financeAPI } from '../../utils/apiCalls/financeAPI';
import { projectAPI } from '../../utils/apiCalls/projectAPI';
import { taskAPI } from '../../utils/apiCalls/taskAPI';

const ProjectDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [financials, setFinancials] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) {
      fetchProjectData();
    }
  }, [id]);

  const fetchProjectData = async () => {
    try {
      setLoading(true);
      
      // Fetch project details, tasks, and financials in parallel
      const [projectData, tasksData, financialsData] = await Promise.all([
        projectAPI.getProject(id),
        taskAPI.getProjectTasks(id),
        financeAPI.getProjectFinancials(id).catch(() => null) // Don't fail if no budget exists
      ]);

      setProject(projectData);
      setTasks(Array.isArray(tasksData) ? tasksData : []);
      setFinancials(financialsData);
      setError('');
    } catch (err) {
      setError('Failed to fetch project data: ' + (err.message || 'Unknown error'));
      console.error('Error fetching project data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'overdue': return <AlertCircle className="w-4 h-4 text-red-500" />;
      default: return <Clock className="w-4 h-4 text-blue-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed': return 'text-green-700 bg-green-50 border-green-200';
      case 'overdue': return 'text-red-700 bg-red-50 border-red-200';
      default: return 'text-blue-700 bg-blue-50 border-blue-200';
    }
  };

  const getTaskStatusBadge = (status) => {
    switch (status) {
      case 'Completed':
        return <Badge variant="success">Completed</Badge>;
      case 'In Progress':
        return <Badge variant="secondary">In Progress</Badge>;
      case 'Not Started':
      default:
        return <Badge variant="outline">Not Started</Badge>;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString();
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const getInitials = (name) => {
    return name ? name.split(' ').map(n => n[0]).join('').toUpperCase() : 'U';
  };

  if (loading) {
    return <LoadingIndicator loading={true} />;
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-gray-50/30 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="p-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md">
            {error || 'Project not found'}
          </div>
        </div>
      </div>
    );
  }

  // Calculate task statistics
  const taskStats = {
    total: tasks.length,
    completed: tasks.filter(task => task.status === 'Completed').length,
    inProgress: tasks.filter(task => task.status === 'In Progress').length,
    notStarted: tasks.filter(task => task.status === 'Not Started').length
  };

  const completionPercentage = taskStats.total > 0 ? (taskStats.completed / taskStats.total) * 100 : 0;

  return (
    <div className="min-h-screen bg-gray-50/30 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate('/solutions/projects')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Projects
          </Button>
        </div>

        {/* Project Header */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-4 flex-1">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-2xl">{project.name}</CardTitle>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(project.status)}
                    <span className={`text-xs px-2 py-1 rounded-full border capitalize ${getStatusColor(project.status)}`}>
                      {project.status}
                    </span>
                  </div>
                </div>

                {project.description && (
                  <p className="text-muted-foreground">{project.description}</p>
                )}

                <div className="flex items-center gap-6 text-sm text-muted-foreground">
                  {project.deadline && (
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>Due: {formatDate(project.deadline)}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    <span>{project.member_count || 1} member{(project.member_count || 1) !== 1 ? 's' : ''}</span>
                  </div>
                </div>

                {/* Task Progress */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Project Progress</span>
                    <span className="font-medium">{taskStats.completed}/{taskStats.total} tasks completed</span>
                  </div>
                  <Progress value={completionPercentage} className="w-full h-2" />
                </div>
              </div>

              <div className="flex items-center gap-2">
                {project.user_can_edit && (
                  <Button asChild variant="outline" size="sm">
                    <Link to={`/solutions/projects/edit/${project.id}`}>
                      <Edit className="w-4 h-4 mr-2" />
                      Edit Project
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Main Content */}
        <Tabs defaultValue="tasks" className="space-y-6">
          <TabsList>
            <TabsTrigger value="tasks">Tasks ({taskStats.total})</TabsTrigger>
            <TabsTrigger value="budget">Budget & Expenses</TabsTrigger>
            <TabsTrigger value="team">Team ({project.member_count || 1})</TabsTrigger>
          </TabsList>

          {/* Tasks Tab */}
          <TabsContent value="tasks">
            <div className="space-y-6">
              {/* Task Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Target className="w-5 h-5 text-blue-500" />
                      <div>
                        <p className="text-sm text-muted-foreground">Total Tasks</p>
                        <p className="text-2xl font-bold">{taskStats.total}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <div>
                        <p className="text-sm text-muted-foreground">Completed</p>
                        <p className="text-2xl font-bold">{taskStats.completed}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-orange-500" />
                      <div>
                        <p className="text-sm text-muted-foreground">In Progress</p>
                        <p className="text-2xl font-bold">{taskStats.inProgress}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-gray-500" />
                      <div>
                        <p className="text-sm text-muted-foreground">Not Started</p>
                        <p className="text-2xl font-bold">{taskStats.notStarted}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Task List */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Tasks</CardTitle>
                    <Button asChild size="sm">
                      <Link to={`/solutions/tasks/create?project_id=${project.id}`}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Task
                      </Link>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {tasks.length === 0 ? (
                    <div className="text-center py-8">
                      <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No tasks yet</h3>
                      <p className="text-muted-foreground mb-4">Start by creating your first task for this project.</p>
                      <Button asChild>
                        <Link to={`/solutions/tasks/create?project_id=${project.id}`}>
                          <Plus className="w-4 h-4 mr-2" />
                          Create First Task
                        </Link>
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {tasks.map(task => (
                        <div key={task.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className="font-medium">{task.title}</h4>
                              {getTaskStatusBadge(task.status)}
                            </div>
                            {task.description && (
                              <p className="text-sm text-muted-foreground mb-2">{task.description}</p>
                            )}
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              {task.assignee && (
                                <span>Assigned to: {task.assignee}</span>
                              )}
                              {task.due_date && (
                                <span>Due: {formatDate(task.due_date)}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button asChild variant="ghost" size="sm">
                              <Link to={`/solutions/tasks/edit/${task.id}`}>
                                <Edit className="w-4 h-4" />
                              </Link>
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Budget Tab */}
          <TabsContent value="budget">
            <div className="space-y-6">
              {financials ? (
                <>
                  {/* Budget Overview */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-5 h-5 text-green-500" />
                          <div>
                            <p className="text-sm text-muted-foreground">Total Budget</p>
                            <p className="text-2xl font-bold">{formatCurrency(financials.budget?.allocated_amount)}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-5 h-5 text-red-500" />
                          <div>
                            <p className="text-sm text-muted-foreground">Total Expenses</p>
                            <p className="text-2xl font-bold">{formatCurrency(financials.total_expenses)}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-5 h-5 text-blue-500" />
                          <div>
                            <p className="text-sm text-muted-foreground">Remaining</p>
                            <p className="text-2xl font-bold">
                              {formatCurrency((financials.budget?.allocated_amount || 0) - (financials.total_expenses || 0))}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Budget Progress */}
                  {financials.budget && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Budget Usage</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span>Spent: {formatCurrency(financials.total_expenses)}</span>
                            <span>Budget: {formatCurrency(financials.budget.allocated_amount)}</span>
                          </div>
                          <Progress 
                            value={((financials.total_expenses || 0) / (financials.budget.allocated_amount || 1)) * 100} 
                            className="w-full h-2" 
                          />
                          <p className="text-xs text-muted-foreground">
                            {(((financials.total_expenses || 0) / (financials.budget.allocated_amount || 1)) * 100).toFixed(1)}% of budget used
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Recent Expenses */}
                  {financials.recent_expenses && financials.recent_expenses.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Recent Expenses</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {financials.recent_expenses.slice(0, 5).map(expense => (
                            <div key={expense.id} className="flex items-center justify-between p-3 border rounded-lg">
                              <div>
                                <p className="font-medium">{expense.description}</p>
                                <p className="text-sm text-muted-foreground">
                                  {expense.category} • {formatDate(expense.date)}
                                </p>
                              </div>
                              <p className="font-bold">{formatCurrency(expense.amount)}</p>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              ) : (
                <Card>
                  <CardContent className="p-12 text-center">
                    <DollarSign className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No budget set</h3>
                    <p className="text-muted-foreground mb-4">Set up a budget to track project expenses and manage resources.</p>
                    <Button asChild>
                      <Link to={`/solutions/projects/${project.id}/finance`}>
                        <Plus className="w-4 h-4 mr-2" />
                        Set Up Budget
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Team Tab */}
          <TabsContent value="team">
            <Card>
              <CardHeader>
                <CardTitle>Team Members</CardTitle>
              </CardHeader>
              <CardContent>
                {project.members && project.members.length > 0 ? (
                  <div className="space-y-3">
                    {project.members.map(member => (
                      <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={member.profile_picture} />
                            <AvatarFallback>
                              {getInitials(member.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{member.full_name}</p>
                            <p className="text-sm text-muted-foreground">{member.email}</p>
                          </div>
                        </div>
                        <Badge variant={member.is_owner ? "default" : member.isEditor ? "secondary" : "outline"}>
                          {member.is_owner ? 'Owner' : member.isEditor ? 'Editor' : 'Viewer'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No team members</h3>
                    <p className="text-muted-foreground">Invite team members to collaborate on this project.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ProjectDetail; 