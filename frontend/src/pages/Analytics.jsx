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
  FolderKanban,
  Brain,
  Shield,
  Zap,
  Eye,
  Lightbulb,
  RefreshCcw
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
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
  Area,
  ComposedChart
} from 'recharts';

const Analytics = () => {
  const [projects, setProjects] = useState([]);
  const [userProductivity, setUserProductivity] = useState(null);
  const [userDashboard, setUserDashboard] = useState(null);
  const [projectsHealth, setProjectsHealth] = useState([]);
  const [trendAnalysis, setTrendAnalysis] = useState(null);
  const [performancePrediction, setPerformancePrediction] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [projectRiskData, setProjectRiskData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTimeframe, setSelectedTimeframe] = useState('90');
  const [activeTab, setActiveTab] = useState('overview');

  const currentUser = getCurrentUser();
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

  useEffect(() => {
    fetchAllAnalytics();
  }, [selectedTimeframe]);

  useEffect(() => {
    if (selectedProject) {
      fetchProjectSpecificAnalytics(selectedProject);
    }
  }, [selectedProject]);

  const fetchAllAnalytics = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch user's projects first
      const projectsResponse = await projectAPI.getAllProjects();
      const projectsData = Array.isArray(projectsResponse?.projects) ? projectsResponse.projects : [];
      setProjects(projectsData);

      if (projectsData.length === 0) {
        setLoading(false);
        return;
      }

      // Fetch user analytics with better error handling
      const analyticsPromises = [
        analyticsAPI.getUserProductivity(currentUser.id).catch(err => {
          console.error('Failed to fetch productivity:', err);
          return null;
        }),
        analyticsAPI.getUserDashboard(currentUser.id).catch(err => {
          console.error('Failed to fetch dashboard:', err);
          return null;
        }),
        analyticsAPI.getTrendAnalysis(null, parseInt(selectedTimeframe)).catch(err => {
          console.error('Failed to fetch trends:', err);
          return null;
        }),
        analyticsAPI.getPerformancePrediction().catch(err => {
          console.error('Failed to fetch prediction:', err);
          return null;
        })
      ];

      const [productivityData, dashboardData, trends, prediction] = await Promise.all(analyticsPromises);

      setUserProductivity(productivityData);
      setUserDashboard(dashboardData);
      setTrendAnalysis(trends);
      setPerformancePrediction(prediction);

      // Fetch health data for each project with individual error handling
      const healthPromises = projectsData.map(async (project) => {
        try {
          const health = await analyticsAPI.getProjectHealth(project.id);
          return { ...project, health };
        } catch (err) {
          console.error(`Failed to fetch health for project ${project.id}:`, err);
          return { ...project, health: { overall_score: 0, status: 'unknown' } };
        }
      });

      const projectsWithHealth = await Promise.all(healthPromises);
      setProjectsHealth(projectsWithHealth);
      
      // Set first project as selected for detailed analysis
      if (projectsData.length > 0 && !selectedProject) {
        setSelectedProject(projectsData[0].id);
      }
    } catch (err) {
      console.error('Error fetching analytics data:', err);
      setError('Failed to load analytics data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchProjectSpecificAnalytics = async (projectId) => {
    try {
      const [riskAssessment, projectTrends] = await Promise.all([
        analyticsAPI.getProjectRiskAssessment(projectId).catch(err => {
          console.error('Failed to fetch risk assessment:', err);
          return { overall_risk_score: 0, risk_level: 'unknown', risk_factors: [] };
        }),
        analyticsAPI.getTrendAnalysis(projectId, parseInt(selectedTimeframe)).catch(err => {
          console.error('Failed to fetch project trends:', err);
          return null;
        })
      ]);
      
      setProjectRiskData(prev => ({
        ...prev,
        [projectId]: { risk: riskAssessment, trends: projectTrends }
      }));
    } catch (err) {
      console.error(`Error fetching project-specific analytics for ${projectId}:`, err);
    }
  };

  const getHealthStatus = (score) => {
    if (score >= 80) return { text: 'Excellent', color: 'text-green-600', variant: 'default' };
    if (score >= 60) return { text: 'Good', color: 'text-blue-600', variant: 'secondary' };
    if (score >= 40) return { text: 'Warning', color: 'text-yellow-600', variant: 'warning' };
    return { text: 'Critical', color: 'text-red-600', variant: 'destructive' };
  };

  const getRiskLevelColor = (level) => {
    switch (level) {
      case 'low': return 'text-green-600';
      case 'medium': return 'text-yellow-600';
      case 'high': return 'text-orange-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getTrendIcon = (direction) => {
    switch (direction) {
      case 'improving': return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'declining': return <TrendingUp className="h-4 w-4 text-red-600 rotate-180" />;
      default: return <Activity className="h-4 w-4 text-blue-600" />;
    }
  };

  const calculateOverallStats = () => {
    if (!userDashboard) return {
      totalProjects: projects.length,
      totalTasks: 0,
      completedTasks: 0,
      averageHealth: 0
    };

    const validHealthScores = projectsHealth
      .filter(p => p.health?.overall_score !== undefined)
      .map(p => p.health.overall_score);

    return {
      totalProjects: projects.length,
      totalTasks: userDashboard.total_tasks || 0,
      completedTasks: userDashboard.completed_tasks || 0,
      averageHealth: validHealthScores.length > 0 ? 
        validHealthScores.reduce((acc, score) => acc + score, 0) / validHealthScores.length : 0
    };
  };

  const getProjectHealthChartData = () => {
    if (!Array.isArray(projectsHealth) || projectsHealth.length === 0) {
      return [];
    }

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

  const formatTrendData = (trendData) => {
    if (!trendData?.productivity_trend || !Array.isArray(trendData.productivity_trend)) {
      return [];
    }
    
    return trendData.productivity_trend
      .filter(item => item && item.date) // Filter out invalid items
      .slice(-30)
      .map(item => {
        try {
          const date = new Date(item.date);
          if (isNaN(date.getTime())) {
            throw new Error('Invalid date');
          }
          
          return {
            date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            productivity: Number(item.productivity_score) || 0,
            created: Number(item.tasks_created) || 0,
            completed: Number(item.tasks_completed) || 0
          };
        } catch (err) {
          console.warn('Failed to format trend data item:', item);
          return null;
        }
      })
      .filter(Boolean); // Remove null items
  };

  // Chart components with better error handling
  const EmptyChartState = ({ title, description }) => (
    <div className="flex flex-col items-center justify-center h-80 text-center">
      <Activity className="h-12 w-12 text-muted-foreground mb-4" />
      <h3 className="text-lg font-medium text-muted-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-md">{description}</p>
    </div>
  );

  const CustomTooltip = ({ active, payload, label, formatter }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium text-foreground mb-2">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {`${entry.name}: ${formatter ? formatter(entry.value) : entry.value}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return <LoadingIndicator loading={true} />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="border-destructive bg-destructive/10">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <p className="text-destructive font-medium">{error}</p>
            </div>
            <Button onClick={fetchAllAnalytics} variant="outline" size="sm">
              <RefreshCcw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show message if no projects
  if (projects.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <FolderKanban className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Projects Found</h3>
              <p className="text-muted-foreground mb-4">
                Create your first project to see analytics data.
              </p>
              <Button asChild>
                <Link to="/solutions/projects/create">Create Project</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const overallStats = calculateOverallStats();
  const healthChartData = getProjectHealthChartData();
  const selectedProjectData = projectRiskData[selectedProject];
  const trendChartData = formatTrendData(trendAnalysis);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BarChart3 className="h-8 w-8" />
            Advanced Analytics
          </h1>
          <p className="text-muted-foreground">
            AI-powered insights and predictive analytics
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Timeframe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="60">Last 60 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="180">Last 6 months</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={fetchAllAnalytics}>
            <RefreshCcw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="productivity">Productivity</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="predictions">Predictions</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics */}
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
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {overallStats.totalTasks > 0 ? 
                    Math.round((overallStats.completedTasks / overallStats.totalTasks) * 100) : 0}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Overall completion
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average Health</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Math.round(overallStats.averageHealth)}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Project health score
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
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
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={healthChartData}
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, value }) => `${name}: ${value}`}
                        >
                          {healthChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <EmptyChartState 
                    title="No Health Data"
                    description="Project health data will appear here once projects are analyzed."
                  />
                )}
              </CardContent>
            </Card>

            {/* Productivity Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Productivity Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                {trendChartData.length > 0 ? (
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={trendChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis yAxisId="left" />
                        <YAxis yAxisId="right" orientation="right" />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                        <Area
                          yAxisId="left"
                          type="monotone"
                          dataKey="productivity"
                          fill="#8884d8"
                          fillOpacity={0.6}
                          name="Productivity Score (%)"
                        />
                        <Bar yAxisId="right" dataKey="created" fill="#82ca9d" name="Tasks Created" />
                        <Bar yAxisId="right" dataKey="completed" fill="#ffc658" name="Tasks Completed" />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <EmptyChartState 
                    title="No Trend Data"
                    description="Productivity trends will appear here as you work on tasks."
                  />
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="productivity" className="space-y-6">
          {userProductivity && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Completion Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{userProductivity.completion_rate}%</div>
                  <Progress value={userProductivity.completion_rate} className="mt-2" />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Average Completion Time</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{userProductivity.avg_completion_time_days} days</div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Average time to complete tasks
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Tasks Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Total:</span>
                      <span className="font-medium">{userProductivity.total_tasks}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Completed:</span>
                      <span className="font-medium text-green-600">{userProductivity.completed_tasks}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">In Progress:</span>
                      <span className="font-medium text-blue-600">{userProductivity.in_progress_tasks}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Overdue:</span>
                      <span className="font-medium text-red-600">{userProductivity.overdue_tasks}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Weekly Performance Chart */}
          {userProductivity?.tasks_completed_per_week && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Weekly Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={userProductivity.tasks_completed_per_week}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="week" />
                      <YAxis />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="completed" fill="#8884d8" name="Tasks Completed" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="projects" className="space-y-6">
          {/* Project Selection */}
          <div className="flex items-center gap-4">
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select a project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map(project => (
                  <SelectItem key={project.id} value={project.id.toString()}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Project Risk Assessment */}
          {selectedProjectData?.risk && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Risk Assessment
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold">{selectedProjectData.risk.overall_risk_score}</div>
                    <div className="text-sm text-muted-foreground">Risk Score</div>
                  </div>
                  <div className="text-center">
                    <Badge 
                      variant={selectedProjectData.risk.risk_level === 'low' ? 'default' : 
                               selectedProjectData.risk.risk_level === 'medium' ? 'warning' : 'destructive'}
                      className={getRiskLevelColor(selectedProjectData.risk.risk_level)}
                    >
                      {selectedProjectData.risk.risk_level.toUpperCase()}
                    </Badge>
                    <div className="text-sm text-muted-foreground mt-1">Risk Level</div>
                  </div>
                </div>

                {selectedProjectData.risk.risk_factors?.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium">Risk Factors:</h4>
                    {selectedProjectData.risk.risk_factors.slice(0, 3).map((factor, index) => (
                      <div key={index} className="text-sm p-2 bg-muted rounded">
                        <span className={`font-medium ${
                          factor.severity === 'critical' ? 'text-red-600' :
                          factor.severity === 'high' ? 'text-orange-600' :
                          factor.severity === 'medium' ? 'text-yellow-600' : 'text-green-600'
                        }`}>
                          {factor.severity.toUpperCase()}:
                        </span> {factor.message}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Project Health Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projectsHealth.map(project => {
              const healthStatus = getHealthStatus(project.health?.overall_score || 0);
              return (
                <Card key={project.id}>
                  <CardHeader>
                    <CardTitle className="text-sm">{project.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-2xl font-bold">{project.health?.overall_score || 0}%</div>
                        <Badge variant={healthStatus.variant} className={healthStatus.color}>
                          {healthStatus.text}
                        </Badge>
                      </div>
                      <div className="text-right text-sm text-muted-foreground">
                        <div>Tasks: {project.health?.total_tasks || 0}</div>
                        <div>Overdue: {project.health?.overdue_tasks || 0}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="predictions" className="space-y-6">
          {performancePrediction && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5" />
                    Performance Prediction
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {performancePrediction.predicted_weekly_completion_rate}%
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Predicted weekly completion rate
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    {getTrendIcon(performancePrediction.trend)}
                    <span className="text-sm">{performancePrediction.trend}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Confidence Level</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold capitalize">
                    {performancePrediction.prediction_confidence}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Based on {performancePrediction.data_points} data points
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Historical Average</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {performancePrediction.historical_average}%
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Past performance average
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Recommendations */}
          {performancePrediction?.recommendations && performancePrediction.recommendations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5" />
                  AI Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {performancePrediction.recommendations.map((recommendation, index) => (
                    <div key={index} className="flex items-start gap-2 p-3 bg-muted rounded-lg">
                      <Zap className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                      <p className="text-sm">{recommendation}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Trend Insights */}
          {trendAnalysis?.insights && trendAnalysis.insights.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Trend Insights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {trendAnalysis.insights.map((insight, index) => (
                    <div key={index} className="flex items-start gap-2 p-3 bg-muted rounded-lg">
                      <Activity className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                      <p className="text-sm">{insight}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Analytics; 