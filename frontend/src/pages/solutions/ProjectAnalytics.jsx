import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Target, 
  Clock,
  AlertTriangle,
  Activity,
  PieChart
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Badge } from '../../components/ui/badge';
import { Progress } from '../../components/ui/progress';
import { analyticsAPI } from '../../utils/apiCalls/analyticsAPI';
import { projectAPI } from '../../utils/apiCalls/projectAPI';
import { getCurrentUser } from '../../utils/apiCalls/auth';
import LoadingIndicator from '../../components/LoadingIndicator';
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

const ProjectAnalytics = () => {
  const { projectId } = useParams();
  const [project, setProject] = useState(null);
  const [stats, setStats] = useState(null);
  const [health, setHealth] = useState(null);
  const [resources, setResources] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTimeframe, setSelectedTimeframe] = useState('30');

  const currentUser = getCurrentUser();

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

  useEffect(() => {
    fetchAllData();
  }, [projectId, selectedTimeframe]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [projectData, statsData, healthData, resourcesData] = await Promise.all([
        projectAPI.getProject(projectId),
        analyticsAPI.getProjectStats(projectId),
        analyticsAPI.getProjectHealth(projectId),
        analyticsAPI.getResourceUtilization(projectId)
      ]);
      
      setProject(projectData);
      setStats(statsData);
      setHealth(healthData);
      setResources(resourcesData);
      setError('');
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

  const formatProgress = (current, total) => {
    if (total === 0) return { percentage: 0, display: '0/0' };
    const percentage = (current / total) * 100;
    return { percentage, display: `${current}/${total}` };
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

  const healthStatus = health ? getHealthStatus(health.overall_score) : null;
  const taskProgress = stats ? formatProgress(stats.task_stats.completed, stats.task_stats.total) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BarChart3 className="h-8 w-8" />
            Project Analytics
          </h1>
          <p className="text-muted-foreground">
            {project?.name || 'Loading...'} - Comprehensive Project Insights
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
          <Button variant="outline" onClick={fetchAllData}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Project Health</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{health?.overall_score || 0}%</div>
              {healthStatus && (
                <Badge variant={healthStatus.variant} className="mt-1">
                  {healthStatus.text}
                </Badge>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Task Progress</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{taskProgress?.percentage.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">
                {taskProgress?.display} tasks completed
              </p>
              <Progress value={taskProgress?.percentage || 0} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Team Members</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.team_stats?.total_members || 0}</div>
              <p className="text-xs text-muted-foreground">
                {stats.team_stats?.active_members || 0} active members
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Budget Usage</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.budget_stats ? `${stats.budget_stats.usage_percentage.toFixed(1)}%` : 'N/A'}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.budget_stats ? `₹${stats.budget_stats.spent_amount.toLocaleString()} spent` : 'No budget set'}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Task Status Distribution */}
        {stats?.task_distribution && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5" />
                Task Status Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <RechartsPieChart>
                  <Pie
                    data={stats.task_distribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {stats.task_distribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RechartsPieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Team Activity */}
        {stats?.team_activity && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Team Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.team_activity}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="member_name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="tasks_completed" fill="#8884d8" name="Tasks Completed" />
                  <Bar dataKey="tasks_in_progress" fill="#82ca9d" name="Tasks In Progress" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Progress Over Time */}
        {stats?.progress_timeline && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Progress Over Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={stats.progress_timeline}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Area 
                    type="monotone" 
                    dataKey="completion_percentage" 
                    stroke="#8884d8" 
                    fill="#8884d8" 
                    fillOpacity={0.6}
                    name="Completion %"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Resource Utilization */}
        {resources && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Resource Utilization
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(resources).map(([resource, data]) => (
                  <div key={resource} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="capitalize">{resource.replace('_', ' ')}</span>
                      <span>{data.percentage}%</span>
                    </div>
                    <Progress value={data.percentage} className="h-2" />
                    <p className="text-xs text-muted-foreground">
                      {data.current} / {data.total} {data.unit || 'units'}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Health Details */}
      {health && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Project Health Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(health.health_factors || {}).map(([factor, score]) => (
                <div key={factor} className="text-center">
                  <div className={`text-2xl font-bold ${
                    score >= 80 ? 'text-green-600' :
                    score >= 60 ? 'text-blue-600' :
                    score >= 40 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {score}%
                  </div>
                  <div className="text-sm text-muted-foreground capitalize">
                    {factor.replace('_', ' ')}
                  </div>
                  <Progress value={score} className="mt-2 h-1" />
                </div>
              ))}
            </div>
            
            {health.recommendations && health.recommendations.length > 0 && (
              <div className="mt-6">
                <h4 className="font-medium mb-3">Recommendations:</h4>
                <ul className="space-y-2">
                  {health.recommendations.map((recommendation, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <div className="w-1 h-1 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                      {recommendation}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ProjectAnalytics; 