import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Target, 
  Clock,
  AlertTriangle,
  Activity,
  PieChart,
  ChevronRight,
  FolderKanban
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { analyticsAPI } from '../utils/apiCalls/analyticsAPI';
import { projectAPI } from '../utils/apiCalls/projectAPI';
import { getCurrentUser } from '../utils/apiCalls/auth';
import LoadingIndicator from '../components/LoadingIndicator';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Cell,
  Pie,
  AreaChart,
  Area
} from 'recharts';

const Analytics = () => {
  const [projects, setProjects] = useState([]);
  const [userProductivity, setUserProductivity] = useState(null);
  const [userDashboard, setUserDashboard] = useState(null);
  const [projectsHealth, setProjectsHealth] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTimeframe, setSelectedTimeframe] = useState('30');

  const currentUser = getCurrentUser();
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

  useEffect(() => {
    fetchAllAnalytics();
  }, [selectedTimeframe]);

  const fetchAllAnalytics = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch user's projects first
      const projectsResponse = await projectAPI.getAllProjects();
      const projectsData = projectsResponse.projects || [];
      setProjects(projectsData);

      // Fetch user analytics
      const [productivityData, dashboardData] = await Promise.all([
        analyticsAPI.getUserProductivity(currentUser.id),
        analyticsAPI.getUserDashboard(currentUser.id)
      ]);

      setUserProductivity(productivityData);
      setUserDashboard(dashboardData);

      // Fetch health data for each project
      const healthPromises = projectsData.map(async (project) => {
        try {
          const health = await analyticsAPI.getProjectHealth(project.id);
          return { ...project, health };
        } catch (err) {
          console.error(`Failed to fetch health for project ${project.id}:`, err);
          return { ...project, health: null };
        }
      });

      const projectsWithHealth = await Promise.all(healthPromises);
      setProjectsHealth(projectsWithHealth);
    } catch (err) {
      console.error('Error fetching analytics data:', err);
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const getHealthStatus = (score) => {
    if (score >= 80) return { text: 'Excellent', color: 'text-green-600', variant: 'default' };
    if (score >= 60) return { text: 'Good', color: 'text-blue-600', variant: 'secondary' };
    if (score >= 40) return { text: 'Warning', color: 'text-yellow-600', variant: 'warning' };
    return { text: 'Critical', color: 'text-red-600', variant: 'destructive' };
  };

  const calculateOverallStats = () => {
    if (!userDashboard) return null;

    return {
      totalProjects: projects.length,
      totalTasks: userDashboard.total_tasks || 0,
      completedTasks: userDashboard.completed_tasks || 0,
      averageHealth: projectsHealth.reduce((acc, p) => acc + (p.health?.overall_score || 0), 0) / (projectsHealth.length || 1)
    };
  };

  const getProjectHealthChartData = () => {
    const healthCounts = { excellent: 0, good: 0, warning: 0, critical: 0 };
    
    projectsHealth.forEach(project => {
      const score = project.health?.overall_score || 0;
      if (score >= 80) healthCounts.excellent++;
      else if (score >= 60) healthCounts.good++;
      else if (score >= 40) healthCounts.warning++;
      else healthCounts.critical++;
    });

    return [
      { name: 'Excellent', value: healthCounts.excellent, color: '#22c55e' },
      { name: 'Good', value: healthCounts.good, color: '#3b82f6' },
      { name: 'Warning', value: healthCounts.warning, color: '#f59e0b' },
      { name: 'Critical', value: healthCounts.critical, color: '#ef4444' }
    ].filter(item => item.value > 0);
  };

  if (loading) {
    return <LoadingIndicator loading={true} />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="border-destructive bg-destructive/10">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <p className="text-destructive font-medium">{error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const overallStats = calculateOverallStats();
  const healthChartData = getProjectHealthChartData();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BarChart3 className="h-8 w-8" />
            Analytics Overview
          </h1>
          <p className="text-muted-foreground">
            Comprehensive insights across all your projects
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Timeframe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 3 months</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={fetchAllAnalytics}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      {overallStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
              <FolderKanban className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overallStats.totalProjects}</div>
              <p className="text-xs text-muted-foreground">
                Active projects
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overallStats.totalTasks}</div>
              <p className="text-xs text-muted-foreground">
                {overallStats.completedTasks} completed
              </p>
              <Progress 
                value={overallStats.totalTasks > 0 ? (overallStats.completedTasks / overallStats.totalTasks) * 100 : 0} 
                className="mt-2" 
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Health</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overallStats.averageHealth.toFixed(1)}%</div>
              <Badge variant={getHealthStatus(overallStats.averageHealth).variant} className="mt-1">
                {getHealthStatus(overallStats.averageHealth).text}
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Productivity Score</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {userProductivity?.productivity_score ? userProductivity.productivity_score.toFixed(1) : 'N/A'}
              </div>
              <p className="text-xs text-muted-foreground">
                Your productivity score
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Project Health Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Project Health Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            {healthChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <RechartsPieChart>
                  <Pie
                    data={healthChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {healthChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RechartsPieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No health data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* User Productivity Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Productivity Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            {userProductivity ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium">Tasks This Week</p>
                    <p className="text-2xl font-bold">{userProductivity.tasks_this_week || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Avg. Completion Time</p>
                    <p className="text-2xl font-bold">
                      {userProductivity.avg_completion_time 
                        ? `${userProductivity.avg_completion_time}h` 
                        : 'N/A'}
                    </p>
                  </div>
                </div>
                <div className="border-t pt-4">
                  <p className="text-sm text-muted-foreground">
                    {userProductivity.improvement_suggestion || 'Keep up the great work!'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[200px] text-muted-foreground">
                No productivity data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Projects Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderKanban className="h-5 w-5" />
            Projects Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {projectsHealth.map((project) => (
              <div key={project.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div>
                    <h3 className="font-medium">{project.name}</h3>
                    <p className="text-sm text-muted-foreground">{project.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {project.health && (
                    <div className="text-center">
                      <p className="text-sm font-medium">{project.health.overall_score}%</p>
                      <Badge 
                        variant={getHealthStatus(project.health.overall_score).variant}
                        className="text-xs"
                      >
                        {getHealthStatus(project.health.overall_score).text}
                      </Badge>
                    </div>
                  )}
                  <Button variant="ghost" size="sm" asChild>
                    <Link to={`/solutions/projects/${project.id}/analytics`}>
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
            {projectsHealth.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <FolderKanban className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No projects found. Create your first project to see analytics.</p>
                <Button className="mt-4" asChild>
                  <Link to="/solutions/projects/create">Create Project</Link>
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Analytics; 