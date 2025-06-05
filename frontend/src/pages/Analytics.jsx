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
  Lightbulb
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
      const projectsData = projectsResponse.projects || [];
      setProjects(projectsData);

      // Fetch user analytics
      const [productivityData, dashboardData, trends, prediction] = await Promise.all([
        analyticsAPI.getUserProductivity(currentUser.id),
        analyticsAPI.getUserDashboard(currentUser.id),
        analyticsAPI.getTrendAnalysis(null, parseInt(selectedTimeframe)),
        analyticsAPI.getPerformancePrediction()
      ]);

      setUserProductivity(productivityData);
      setUserDashboard(dashboardData);
      setTrendAnalysis(trends);
      setPerformancePrediction(prediction);

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
      
      // Set first project as selected for detailed analysis
      if (projectsData.length > 0 && !selectedProject) {
        setSelectedProject(projectsData[0].id);
      }
    } catch (err) {
      console.error('Error fetching analytics data:', err);
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const fetchProjectSpecificAnalytics = async (projectId) => {
    try {
      const [riskAssessment, projectTrends] = await Promise.all([
        analyticsAPI.getProjectRiskAssessment(projectId),
        analyticsAPI.getTrendAnalysis(projectId, parseInt(selectedTimeframe))
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

  const formatTrendData = (trendData) => {
    if (!trendData?.productivity_trend) return [];
    
    return trendData.productivity_trend.slice(-30).map(item => ({
      date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      productivity: item.productivity_score,
      created: item.tasks_created,
      completed: item.tasks_completed
    }));
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
            Refresh
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="trends">Trends & Prediction</TabsTrigger>
          <TabsTrigger value="projects">Project Deep Dive</TabsTrigger>
          <TabsTrigger value="insights">AI Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
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
                  <p className="text-xs text-muted-foreground">Active projects</p>
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
                    {Math.round((overallStats.completedTasks / Math.max(overallStats.totalTasks, 1)) * 100)}%
                  </div>
                  <Progress 
                    value={(overallStats.completedTasks / Math.max(overallStats.totalTasks, 1)) * 100} 
                    className="mt-2" 
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Average Health</CardTitle>
                  <Shield className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{Math.round(overallStats.averageHealth)}</div>
                  <p className="text-xs text-muted-foreground">Project health score</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Project Health Distribution */}
          {healthChartData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Project Health Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
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
                      <Tooltip />
                      <Legend />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          {/* Productivity Trends */}
          {trendChartData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Productivity Trends ({selectedTimeframe} days)
                </CardTitle>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  {trendAnalysis?.trend_summary && (
                    <>
                      {getTrendIcon(trendAnalysis.trend_summary.direction)}
                      <span className="capitalize">{trendAnalysis.trend_summary.direction}</span>
                      <span>•</span>
                      <span>Velocity: {trendAnalysis.trend_summary.velocity}%</span>
                    </>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={trendChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip />
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
              </CardContent>
            </Card>
          )}

          {/* Performance Prediction */}
          {performancePrediction && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  AI Performance Prediction
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {performancePrediction.predicted_weekly_completion_rate}%
                    </div>
                    <p className="text-sm text-muted-foreground">Predicted Weekly Completion</p>
                  </div>
                  <div className="text-center p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg">
                    <div className="text-lg font-semibold capitalize flex items-center justify-center gap-2">
                      {getTrendIcon(performancePrediction.trend)}
                      {performancePrediction.trend}
                    </div>
                    <p className="text-sm text-muted-foreground">Trend Direction</p>
                  </div>
                  <div className="text-center p-4 bg-gradient-to-r from-yellow-50 to-green-50 rounded-lg">
                    <div className="text-lg font-semibold capitalize">
                      {performancePrediction.prediction_confidence}
                    </div>
                    <p className="text-sm text-muted-foreground">Confidence Level</p>
                  </div>
                </div>
                
                {performancePrediction.recommendations && (
                  <div className="mt-4">
                    <h4 className="font-medium mb-2">AI Recommendations:</h4>
                    <ul className="space-y-1">
                      {performancePrediction.recommendations.map((rec, index) => (
                        <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                          <Lightbulb className="h-4 w-4 mt-0.5 text-yellow-500" />
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Trend Insights */}
          {trendAnalysis?.insights && (
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
                    <div key={index} className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
                      <Zap className="h-4 w-4 mt-0.5 text-blue-500" />
                      <span className="text-sm">{insight}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="projects" className="space-y-6">
          {/* Project Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Project Deep Dive Analysis</CardTitle>
              <Select value={selectedProject?.toString()} onValueChange={(value) => setSelectedProject(parseInt(value))}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id.toString()}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardHeader>
          </Card>

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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div className="text-center p-6 bg-gradient-to-r from-red-50 to-yellow-50 rounded-lg">
                      <div className="text-3xl font-bold mb-2" style={{ color: getRiskLevelColor(selectedProjectData.risk.risk_level).replace('text-', '') }}>
                        {selectedProjectData.risk.overall_risk_score}
                      </div>
                      <div className={`text-lg font-semibold capitalize ${getRiskLevelColor(selectedProjectData.risk.risk_level)}`}>
                        {selectedProjectData.risk.risk_level} Risk
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <h4 className="font-medium">Risk Factors:</h4>
                    {selectedProjectData.risk.risk_factors.slice(0, 3).map((factor, index) => (
                      <div key={index} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                          <Badge variant={factor.severity === 'critical' ? 'destructive' : factor.severity === 'high' ? 'warning' : 'secondary'}>
                            {factor.severity}
                          </Badge>
                          <span className="text-sm text-muted-foreground">Impact: {factor.impact}</span>
                        </div>
                        <p className="text-sm">{factor.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
                
                {selectedProjectData.risk.recommendations && (
                  <div className="mt-6">
                    <h4 className="font-medium mb-3">Recommendations:</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {selectedProjectData.risk.recommendations.map((rec, index) => (
                        <div key={index} className="flex items-start gap-2 p-2 bg-muted/50 rounded">
                          <Lightbulb className="h-4 w-4 mt-0.5 text-yellow-500" />
                          <span className="text-sm">{rec}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Project Health Details */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {projectsHealth.filter(p => p.id === selectedProject).map((project) => (
              <Card key={project.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{project.name}</span>
                    <Badge variant={getHealthStatus(project.health?.overall_score || 0).variant}>
                      {getHealthStatus(project.health?.overall_score || 0).text}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {project.health && (
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Health Score</span>
                          <span>{project.health.overall_score}/100</span>
                        </div>
                        <Progress value={project.health.overall_score} />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Total Tasks</span>
                          <div className="font-semibold">{project.health.total_tasks}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Overdue</span>
                          <div className="font-semibold text-red-600">{project.health.overdue_tasks}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">On Time Rate</span>
                          <div className="font-semibold">{project.health.on_time_completion_rate}%</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Avg Delay</span>
                          <div className="font-semibold">{project.health.average_delay_days} days</div>
                        </div>
                      </div>

                      <div className="pt-2">
                        <Link to={`/projects/${project.id}`}>
                          <Button variant="outline" className="w-full">
                            View Project Details
                            <ChevronRight className="h-4 w-4 ml-1" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                AI-Powered Insights
              </CardTitle>
              <p className="text-muted-foreground">
                Advanced analytics and recommendations based on your work patterns
              </p>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>AI insights feature coming soon...</p>
                <p className="text-sm">This will include personalized recommendations, pattern recognition, and predictive insights.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Analytics; 