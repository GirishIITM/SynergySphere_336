import {
  CheckSquare,
  FolderKanban,
  LayoutDashboard,
  Target,
  Users,
  AlertTriangle
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import LoadingIndicator from '../components/LoadingIndicator';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { dashboardAPI } from '../utils/apiCalls';
import { getCurrentUser } from '../utils/apiCalls/auth';

const Dashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const currentUser = getCurrentUser();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const data = await dashboardAPI.getOverview();
      setDashboardData(data);
      setError('');
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error('Dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  const statsData = dashboardData ? [
    {
      title: "Total Projects",
      value: dashboardData.statistics.total_projects,
      icon: FolderKanban,
      change: `${dashboardData.statistics.owned_projects} owned`,
      changeType: "positive"
    },
    {
      title: "Total Tasks", 
      value: dashboardData.statistics.total_tasks,
      icon: CheckSquare,
      change: `${dashboardData.statistics.completed_tasks} completed`,
      changeType: "positive"
    },
    {
      title: "Team Members",
      value: dashboardData.statistics.team_members,
      icon: Users,
      change: "across projects", 
      changeType: "positive"
    },
    {
      title: "Completion Rate",
      value: `${dashboardData.statistics.completion_rate}%`,
      icon: Target,
      change: `${dashboardData.statistics.overdue_tasks} overdue`,
      changeType: dashboardData.statistics.overdue_tasks > 0 ? "negative" : "positive"
    }
  ] : [];

  const StatCard = ({ title, value, icon, description, className = "" }) => {
    const Icon = icon;
    return (
      <Card className={`hover:shadow-lg transition-shadow ${className}`}>
        <CardContent className="flex items-center gap-4 p-6">
          <div className="text-4xl"><Icon className="h-6 w-6" /></div>
          <div className="flex flex-col">
            <div className="text-3xl font-bold text-foreground">{value}</div>
            <div className="text-sm text-muted-foreground">{title}</div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="container mx-auto p-4 max-w-5xl">
      <LoadingIndicator loading={loading}>
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-2">
            <LayoutDashboard className="h-6 w-6" />
            <h1 className="text-4xl font-bold text-foreground mb-2">Dashboard</h1>
          </div>
          <p className="text-lg text-muted-foreground">
            Welcome back, {dashboardData?.user?.name || currentUser?.name || 'User'}!
          </p>
        </div>

        {error && (
          <Card className="mb-6 border-destructive">
            <CardContent className="p-4">
              <p className="text-destructive">{error}</p>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statsData.map((stat, index) => (
            <StatCard
              key={index}
              title={stat.title}
              value={stat.value}
              icon={stat.icon}
              className="border-blue-200 dark:border-blue-800"
            />
          ))}
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Get started with your most common tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <Button asChild>
                <Link to="/solutions/projects">Create New Project</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/solutions/tasks">Add New Task</Link>
              </Button>
              <Button variant="secondary" asChild>
                <Link to="/profile">View Profile</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span>📁</span>
                Recent Projects
              </CardTitle>
              <CardDescription>Your latest projects</CardDescription>
            </CardHeader>
            <CardContent>
              {!dashboardData?.recent_projects?.length ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">No projects yet.</p>
                  <Button asChild variant="outline">
                    <Link to="/solutions/projects">Create your first project</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {dashboardData.recent_projects.map(project => (
                    <div 
                      key={project.id} 
                      className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                    >
                      <div className="text-2xl">📁</div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium truncate">{project.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {project.task_count} tasks • {project.completed_tasks} completed
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" asChild>
                          <Link to={`/solutions/projects/${project.id}/analytics`}>
                            📊
                          </Link>
                        </Button>
                        <Button variant="ghost" size="sm" asChild>
                          <Link to={`/solutions/projects/${project.id}/finance`}>
                            💰
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span>📋</span>
                Recent Tasks
              </CardTitle>
              <CardDescription>Your latest tasks</CardDescription>
            </CardHeader>
            <CardContent>
              {!dashboardData?.recent_tasks?.length ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">No tasks yet.</p>
                  <Button asChild variant="outline">
                    <Link to="/solutions/tasks">Create your first task</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {dashboardData.recent_tasks.map(task => (
                    <div 
                      key={task.id} 
                      className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                    >
                      <div className="text-2xl">
                        {task.status === 'Completed' ? '✅' : task.is_overdue ? '⚠️' : '📋'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium truncate">{task.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          {task.project_name} • {task.status}
                          {task.is_overdue && ' • Overdue'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

      </LoadingIndicator>
    </div>
  );
};

export default Dashboard;
