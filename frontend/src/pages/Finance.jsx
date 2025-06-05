import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  AlertCircle,
  PieChart,
  ChevronRight,
  FolderKanban,
  CreditCard,
  Target,
  Receipt,
  Activity,
  BarChart3,
  Lightbulb,
  Shield,
  Zap,
  Calculator,
  Clock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { financeAPI } from '../utils/apiCalls/financeAPI';
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

const Finance = () => {
  const [projects, setProjects] = useState([]);
  const [projectFinancials, setProjectFinancials] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [varianceData, setVarianceData] = useState({});
  const [forecastData, setForecastData] = useState({});
  const [optimizationData, setOptimizationData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTimeframe, setSelectedTimeframe] = useState('3');
  const [activeTab, setActiveTab] = useState('overview');

  const currentUser = getCurrentUser();
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

  useEffect(() => {
    fetchAllFinancials();
  }, [selectedTimeframe]);

  useEffect(() => {
    if (selectedProject) {
      fetchProjectSpecificAnalytics(selectedProject);
    }
  }, [selectedProject, selectedTimeframe]);

  const fetchAllFinancials = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch user's projects first
      const projectsResponse = await projectAPI.getAllProjects();
      const projectsData = projectsResponse.projects || [];
      setProjects(projectsData);

      // Fetch financial data for each project
      const financialPromises = projectsData.map(async (project) => {
        try {
          const financials = await financeAPI.getProjectFinancials(project.id);
          return { ...project, financials };
        } catch (err) {
          console.error(`Failed to fetch financials for project ${project.id}:`, err);
          return { ...project, financials: null };
        }
      });

      const projectsWithFinancials = await Promise.all(financialPromises);
      setProjectFinancials(projectsWithFinancials);
      
      // Set first project as selected for detailed analysis
      if (projectsData.length > 0 && !selectedProject) {
        setSelectedProject(projectsData[0].id);
      }
    } catch (err) {
      console.error('Error fetching financial data:', err);
      setError('Failed to load financial data');
    } finally {
      setLoading(false);
    }
  };

  const fetchProjectSpecificAnalytics = async (projectId) => {
    try {
      const [variance, forecast, optimization] = await Promise.all([
        financeAPI.getBudgetVarianceAnalysis(projectId),
        financeAPI.getExpenseForecast(projectId, parseInt(selectedTimeframe)),
        financeAPI.getCostOptimizationAnalysis(projectId)
      ]);
      
      setVarianceData(prev => ({ ...prev, [projectId]: variance }));
      setForecastData(prev => ({ ...prev, [projectId]: forecast }));
      setOptimizationData(prev => ({ ...prev, [projectId]: optimization }));
    } catch (err) {
      console.error(`Error fetching project analytics for ${projectId}:`, err);
    }
  };

  const calculateOverallFinancials = () => {
    const totals = {
      totalBudget: 0,
      totalExpenses: 0,
      projectsWithBudget: 0,
      projectsOverBudget: 0
    };

    projectFinancials.forEach(project => {
      if (project.financials) {
        const { budget, total_expenses } = project.financials;
        if (budget) {
          totals.totalBudget += budget.allocated_amount || 0;
          totals.projectsWithBudget++;
          
          if (total_expenses > budget.allocated_amount) {
            totals.projectsOverBudget++;
          }
        }
        totals.totalExpenses += total_expenses || 0;
      }
    });

    return {
      ...totals,
      remainingBudget: totals.totalBudget - totals.totalExpenses,
      budgetUtilization: totals.totalBudget > 0 ? (totals.totalExpenses / totals.totalBudget) * 100 : 0
    };
  };

  const getBudgetStatusChartData = () => {
    const statusCounts = { underBudget: 0, nearBudget: 0, overBudget: 0 };
    
    projectFinancials.forEach(project => {
      if (project.financials?.budget) {
        const { allocated_amount } = project.financials.budget;
        const spent = project.financials.total_expenses || 0;
        const utilization = allocated_amount > 0 ? (spent / allocated_amount) * 100 : 0;
        
        if (utilization <= 75) statusCounts.underBudget++;
        else if (utilization <= 100) statusCounts.nearBudget++;
        else statusCounts.overBudget++;
      }
    });

    return [
      { name: 'Under Budget', value: statusCounts.underBudget, color: '#22c55e' },
      { name: 'Near Budget', value: statusCounts.nearBudget, color: '#f59e0b' },
      { name: 'Over Budget', value: statusCounts.overBudget, color: '#ef4444' }
    ].filter(item => item.value > 0);
  };

  const getExpensesByCategoryData = () => {
    const categoryTotals = {};
    
    projectFinancials.forEach(project => {
      if (project.financials?.expenses) {
        project.financials.expenses.forEach(expense => {
          const category = expense.category || 'Other';
          categoryTotals[category] = (categoryTotals[category] || 0) + expense.amount;
        });
      }
    });

    return Object.entries(categoryTotals).map(([category, amount]) => ({
      category,
      amount,
      color: COLORS[Object.keys(categoryTotals).indexOf(category) % COLORS.length]
    }));
  };

  const getMonthlySpendingData = () => {
    const monthlyData = {};
    
    projectFinancials.forEach(project => {
      if (project.financials?.expenses) {
        project.financials.expenses.forEach(expense => {
          const month = new Date(expense.date).toISOString().slice(0, 7); // YYYY-MM format
          monthlyData[month] = (monthlyData[month] || 0) + expense.amount;
        });
      }
    });

    return Object.entries(monthlyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6) // Last 6 months
      .map(([month, amount]) => ({
        month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        amount
      }));
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount || 0);
  };

  const getBudgetStatus = (project) => {
    if (!project.financials?.budget) return null;
    
    const { allocated_amount } = project.financials.budget;
    const spent = project.financials.total_expenses || 0;
    const utilization = allocated_amount > 0 ? (spent / allocated_amount) * 100 : 0;
    
    if (utilization <= 75) return { text: 'Good', variant: 'default', color: 'text-green-600' };
    if (utilization <= 100) return { text: 'Warning', variant: 'warning', color: 'text-yellow-600' };
    return { text: 'Over Budget', variant: 'destructive', color: 'text-red-600' };
  };

  const getVarianceStatus = (status) => {
    switch (status) {
      case 'on_track': return { text: 'On Track', color: 'text-green-600', variant: 'default' };
      case 'minor_variance': return { text: 'Minor Variance', color: 'text-yellow-600', variant: 'warning' };
      case 'significant_variance': return { text: 'Significant Variance', color: 'text-orange-600', variant: 'destructive' };
      case 'critical_variance': return { text: 'Critical Variance', color: 'text-red-600', variant: 'destructive' };
      default: return { text: 'Unknown', color: 'text-gray-600', variant: 'secondary' };
    }
  };

  const formatVarianceData = (variance) => {
    if (!variance?.category_analysis) return [];
    
    return Object.entries(variance.category_analysis).map(([category, data]) => ({
      category,
      planned: data.planned,
      actual: data.actual,
      variance: data.variance,
      variance_percentage: data.variance_percentage
    }));
  };

  const formatForecastData = (forecast) => {
    if (!forecast?.forecast_data) return [];
    
    return forecast.forecast_data.map(item => ({
      month: new Date(item.month + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      amount: item.predicted_amount,
      confidence: item.confidence
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
              <AlertCircle className="h-5 w-5 text-destructive" />
              <p className="text-destructive font-medium">{error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const overallFinancials = calculateOverallFinancials();
  const budgetStatusData = getBudgetStatusChartData();
  const categoryData = getExpensesByCategoryData();
  const monthlyData = getMonthlySpendingData();
  const selectedProjectVariance = varianceData[selectedProject];
  const selectedProjectForecast = forecastData[selectedProject];
  const selectedProjectOptimization = optimizationData[selectedProject];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <DollarSign className="h-8 w-8" />
            Advanced Finance Analytics
          </h1>
          <p className="text-muted-foreground">
            Comprehensive financial insights with AI-powered analysis
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Forecast Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 Month</SelectItem>
              <SelectItem value="3">3 Months</SelectItem>
              <SelectItem value="6">6 Months</SelectItem>
              <SelectItem value="12">12 Months</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={fetchAllFinancials}>
            Refresh
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analysis">Budget Analysis</TabsTrigger>
          <TabsTrigger value="forecasting">Forecasting</TabsTrigger>
          <TabsTrigger value="optimization">Cost Optimization</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Key Financial Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Budget</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(overallFinancials.totalBudget)}</div>
                <p className="text-xs text-muted-foreground">
                  {overallFinancials.projectsWithBudget} projects with budgets
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                <Receipt className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(overallFinancials.totalExpenses)}</div>
                <p className="text-xs text-muted-foreground">
                  Across all projects
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Budget Utilization</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{overallFinancials.budgetUtilization.toFixed(1)}%</div>
                <Progress 
                  value={overallFinancials.budgetUtilization} 
                  className="mt-2" 
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Remaining Budget</CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(overallFinancials.remainingBudget)}</div>
                <p className="text-xs text-muted-foreground">
                  {overallFinancials.projectsOverBudget} projects over budget
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Budget Status Distribution */}
            {budgetStatusData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="h-5 w-5" />
                    Budget Status Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={budgetStatusData}
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, value }) => `${name}: ${value}`}
                        >
                          {budgetStatusData.map((entry, index) => (
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

            {/* Monthly Spending Trend */}
            {monthlyData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Monthly Spending Trend
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={monthlyData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip formatter={(value) => formatCurrency(value)} />
                        <Area 
                          type="monotone" 
                          dataKey="amount" 
                          stroke="#8884d8" 
                          fill="#8884d8" 
                          fillOpacity={0.6} 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Expenses by Category */}
          {categoryData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Expenses by Category
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="category" />
                      <YAxis />
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                      <Bar dataKey="amount" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="analysis" className="space-y-6">
          {/* Project Selection for Analysis */}
          <Card>
            <CardHeader>
              <CardTitle>Budget Variance Analysis</CardTitle>
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

          {/* Variance Analysis */}
          {selectedProjectVariance && selectedProjectVariance.has_budget && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Budget Variance Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center p-4 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {formatCurrency(selectedProjectVariance.budget_amount)}
                    </div>
                    <p className="text-sm text-muted-foreground">Budget Allocated</p>
                  </div>
                  <div className="text-center p-4 bg-gradient-to-r from-green-50 to-yellow-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {formatCurrency(selectedProjectVariance.total_spent)}
                    </div>
                    <p className="text-sm text-muted-foreground">Total Spent</p>
                  </div>
                  <div className="text-center p-4 bg-gradient-to-r from-yellow-50 to-red-50 rounded-lg">
                    <div className={`text-2xl font-bold ${selectedProjectVariance.total_variance >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {selectedProjectVariance.total_variance >= 0 ? '+' : ''}{formatCurrency(selectedProjectVariance.total_variance)}
                    </div>
                    <p className="text-sm text-muted-foreground">Variance</p>
                  </div>
                </div>

                <div className="mt-6">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium">Variance Status</h4>
                    <Badge variant={getVarianceStatus(selectedProjectVariance.status).variant}>
                      {getVarianceStatus(selectedProjectVariance.status).text}
                    </Badge>
                  </div>
                  <Progress 
                    value={Math.abs(selectedProjectVariance.variance_percentage)} 
                    className="mb-3" 
                  />
                  <p className="text-sm text-muted-foreground">
                    {selectedProjectVariance.variance_percentage >= 0 ? 'Over' : 'Under'} budget by {Math.abs(selectedProjectVariance.variance_percentage).toFixed(1)}%
                  </p>
                </div>

                {selectedProjectVariance.recommendations && (
                  <div className="mt-6">
                    <h4 className="font-medium mb-3">Recommendations:</h4>
                    <div className="space-y-2">
                      {selectedProjectVariance.recommendations.map((rec, index) => (
                        <div key={index} className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
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

          {/* Category Variance Chart */}
          {selectedProjectVariance && selectedProjectVariance.has_budget && (
            <Card>
              <CardHeader>
                <CardTitle>Category Variance Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={formatVarianceData(selectedProjectVariance)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="category" />
                      <YAxis />
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                      <Legend />
                      <Bar dataKey="planned" fill="#8884d8" name="Planned" />
                      <Bar dataKey="actual" fill="#82ca9d" name="Actual" />
                      <Line type="monotone" dataKey="variance" stroke="#ff7300" name="Variance" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="forecasting" className="space-y-6">
          {/* Forecast Analysis */}
          {selectedProjectForecast && selectedProjectForecast.forecast_available && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Expense Forecast ({selectedTimeframe} Months)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="text-center p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      {formatCurrency(selectedProjectForecast.total_forecast)}
                    </div>
                    <p className="text-sm text-muted-foreground">Predicted Total</p>
                  </div>
                  <div className="text-center p-4 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg">
                    <div className="text-lg font-semibold capitalize text-blue-600">
                      {selectedProjectForecast.historical_data.trend_direction}
                    </div>
                    <p className="text-sm text-muted-foreground">Trend Direction</p>
                  </div>
                  <div className="text-center p-4 bg-gradient-to-r from-green-50 to-yellow-50 rounded-lg">
                    <div className="text-lg font-semibold text-green-600">
                      {formatCurrency(selectedProjectForecast.historical_data.average_monthly_spending)}
                    </div>
                    <p className="text-sm text-muted-foreground">Monthly Average</p>
                  </div>
                </div>

                {/* Forecast Chart */}
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={formatForecastData(selectedProjectForecast)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                      <Line 
                        type="monotone" 
                        dataKey="amount" 
                        stroke="#8884d8" 
                        strokeWidth={2}
                        name="Predicted Amount"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Budget Impact */}
                {selectedProjectForecast.budget_impact && (
                  <div className="mt-6 p-4 border rounded-lg">
                    <h4 className="font-medium mb-3">Budget Impact Analysis</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Remaining Budget:</span>
                        <div className="font-semibold">{formatCurrency(selectedProjectForecast.budget_impact.remaining_budget)}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Projected Utilization:</span>
                        <div className="font-semibold">{selectedProjectForecast.budget_impact.projected_budget_utilization.toFixed(1)}%</div>
                      </div>
                    </div>
                    
                    {selectedProjectForecast.budget_impact.will_exceed_budget && (
                      <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-center gap-2 text-red-600">
                          <AlertCircle className="h-4 w-4" />
                          <span className="font-medium">Budget Overrun Warning</span>
                        </div>
                        <p className="text-sm text-red-600 mt-1">
                          Projected to exceed budget by {formatCurrency(selectedProjectForecast.budget_impact.forecast_vs_remaining)}
                        </p>
                      </div>
                    )}
                  </div>
                )}
                
                {selectedProjectForecast.recommendations && (
                  <div className="mt-6">
                    <h4 className="font-medium mb-3">Forecast Recommendations:</h4>
                    <div className="space-y-2">
                      {selectedProjectForecast.recommendations.map((rec, index) => (
                        <div key={index} className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
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

          {selectedProjectForecast && !selectedProjectForecast.forecast_available && (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="font-medium">{selectedProjectForecast.message}</p>
                  <p className="text-sm">Data points available: {selectedProjectForecast.data_points}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="optimization" className="space-y-6">
          {/* Cost Optimization Analysis */}
          {selectedProjectOptimization && selectedProjectOptimization.has_expenses && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Cost Optimization Opportunities
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="text-center p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {formatCurrency(selectedProjectOptimization.potential_total_savings)}
                    </div>
                    <p className="text-sm text-muted-foreground">Potential Savings</p>
                  </div>
                  <div className="text-center p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {selectedProjectOptimization.optimization_opportunities.length}
                    </div>
                    <p className="text-sm text-muted-foreground">Opportunities Identified</p>
                  </div>
                </div>

                {/* Optimization Opportunities */}
                <div className="space-y-4">
                  <h4 className="font-medium">Optimization Opportunities:</h4>
                  {selectedProjectOptimization.optimization_opportunities.slice(0, 5).map((opportunity, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant={opportunity.priority === 'high' ? 'destructive' : opportunity.priority === 'medium' ? 'warning' : 'secondary'}>
                          {opportunity.priority} Priority
                        </Badge>
                        <span className="font-semibold text-green-600">
                          Save {formatCurrency(opportunity.potential_savings)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{opportunity.description}</p>
                      <div className="text-xs text-muted-foreground mt-1 capitalize">
                        Type: {opportunity.type.replace('_', ' ')}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Cost Efficiency */}
                {selectedProjectOptimization.cost_efficiency && (
                  <div className="mt-6 p-4 border rounded-lg">
                    <h4 className="font-medium mb-3">Cost Efficiency Analysis</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Cost per Completed Task:</span>
                        <div className="font-semibold">{formatCurrency(selectedProjectOptimization.cost_efficiency.cost_per_completed_task)}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Efficiency Rating:</span>
                        <div className={`font-semibold capitalize ${
                          selectedProjectOptimization.cost_efficiency.efficiency_rating === 'excellent' ? 'text-green-600' :
                          selectedProjectOptimization.cost_efficiency.efficiency_rating === 'good' ? 'text-blue-600' : 'text-red-600'
                        }`}>
                          {selectedProjectOptimization.cost_efficiency.efficiency_rating.replace('_', ' ')}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {selectedProjectOptimization.recommendations && (
                  <div className="mt-6">
                    <h4 className="font-medium mb-3">Optimization Recommendations:</h4>
                    <div className="space-y-2">
                      {selectedProjectOptimization.recommendations.map((rec, index) => (
                        <div key={index} className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
                          <Zap className="h-4 w-4 mt-0.5 text-blue-500" />
                          <span className="text-sm">{rec}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {selectedProjectOptimization && !selectedProjectOptimization.has_expenses && (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8 text-muted-foreground">
                  <Calculator className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="font-medium">{selectedProjectOptimization.message}</p>
                  <p className="text-sm">Add expenses to enable cost optimization analysis</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Finance; 