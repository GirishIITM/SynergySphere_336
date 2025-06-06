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
  Clock,
  RefreshCcw,
  AlertTriangle
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
      const projectsData = Array.isArray(projectsResponse?.projects) ? projectsResponse.projects : [];
      setProjects(projectsData);

      if (projectsData.length === 0) {
        setLoading(false);
        return;
      }

      // Fetch financial data for each project with better error handling
      const financialPromises = projectsData.map(async (project) => {
        try {
          const financials = await financeAPI.getProjectFinancials(project.id);
          return { ...project, financials };
        } catch (err) {
          console.error(`Failed to fetch financials for project ${project.id}:`, err);
          return { 
            ...project, 
            financials: { 
              budget: null, 
              total_expenses: 0, 
              expenses: [],
              monthly_expenses: []
            } 
          };
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
      setError('Failed to load financial data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchProjectSpecificAnalytics = async (projectId) => {
    try {
      const [variance, forecast, optimization] = await Promise.all([
        financeAPI.getBudgetVarianceAnalysis(projectId).catch(err => {
          console.error('Failed to fetch variance analysis:', err);
          return { status: 'unknown', variance_percentage: 0, category_analysis: {} };
        }),
        financeAPI.getExpenseForecast(projectId, parseInt(selectedTimeframe)).catch(err => {
          console.error('Failed to fetch forecast:', err);
          return { forecast_data: [], budget_impact: {}, trend_slope: 0 };
        }),
        financeAPI.getCostOptimizationAnalysis(projectId).catch(err => {
          console.error('Failed to fetch optimization analysis:', err);
          return { optimization_opportunities: [], category_totals: {}, cost_efficiency: {} };
        })
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

    if (!Array.isArray(projectFinancials)) {
      return {
        ...totals,
        remainingBudget: 0,
        budgetUtilization: 0
      };
    }

    projectFinancials.forEach(project => {
      if (project.financials) {
        const { budget, total_expenses } = project.financials;
        if (budget && budget.allocated_amount) {
          totals.totalBudget += budget.allocated_amount || 0;
          totals.projectsWithBudget++;
          
          if ((total_expenses || 0) > budget.allocated_amount) {
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
    if (!Array.isArray(projectFinancials) || projectFinancials.length === 0) {
      return [];
    }

    const statusCounts = { underBudget: 0, nearBudget: 0, overBudget: 0 };
    
    projectFinancials.forEach(project => {
      if (project.financials?.budget?.allocated_amount) {
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
    if (!Array.isArray(projectFinancials)) {
      return [];
    }

    const categoryTotals = {};
    
    projectFinancials.forEach(project => {
      if (project.financials?.expenses && Array.isArray(project.financials.expenses)) {
        project.financials.expenses.forEach(expense => {
          const category = expense.category || 'Other';
          categoryTotals[category] = (categoryTotals[category] || 0) + (expense.amount || 0);
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
    if (!Array.isArray(projectFinancials)) {
      return [];
    }

    const monthlyData = {};
    
    projectFinancials.forEach(project => {
      if (project.financials?.expenses && Array.isArray(project.financials.expenses)) {
        project.financials.expenses.forEach(expense => {
          try {
            const date = new Date(expense.date || expense.incurred_at);
            if (!isNaN(date.getTime())) {
              const month = date.toISOString().slice(0, 7); // YYYY-MM format
              monthlyData[month] = (monthlyData[month] || 0) + (expense.amount || 0);
            }
          } catch (err) {
            console.warn('Invalid expense date:', expense);
          }
        });
      }
    });

    return Object.entries(monthlyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6) // Last 6 months
      .map(([month, amount]) => {
        try {
          return {
            month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
            amount: Number(amount) || 0
          };
        } catch (err) {
          return { month: month, amount: Number(amount) || 0 };
        }
      });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount || 0);
  };

  const getBudgetStatus = (project) => {
    if (!project.financials?.budget?.allocated_amount) return null;
    
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
      budgeted: data.budgeted || 0,
      actual: data.actual || 0,
      variance: data.variance_percentage || 0
    }));
  };

  const formatForecastData = (forecast) => {
    if (!forecast?.forecast_data || !Array.isArray(forecast.forecast_data)) return [];
    
    return forecast.forecast_data.map(item => ({
      month: item.month || '',
      amount: Number(item.amount) || 0,
      confidence: item.confidence || 'medium'
    }));
  };

  // Chart components with better error handling
  const EmptyChartState = ({ title, description }) => (
    <div className="flex flex-col items-center justify-center h-80 text-center">
      <DollarSign className="h-12 w-12 text-muted-foreground mb-4" />
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
              {`${entry.name}: ${formatter ? formatter(entry.value) : formatCurrency(entry.value)}`}
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
            <Button onClick={fetchAllFinancials} variant="outline" size="sm">
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
                Create your first project to see financial data.
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

  const overallFinancials = calculateOverallFinancials();
  const budgetStatusData = getBudgetStatusChartData();
  const expensesByCategoryData = getExpensesByCategoryData();
  const monthlySpendingData = getMonthlySpendingData();
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
            Financial Analytics
          </h1>
          <p className="text-muted-foreground">
            Comprehensive budget and expense analysis
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
            <RefreshCcw className="h-4 w-4 mr-2" />
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
                <div className="text-2xl font-bold">
                  {Math.round(overallFinancials.budgetUtilization)}%
                </div>
                <Progress value={overallFinancials.budgetUtilization} className="mt-2" />
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
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Budget Status Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                {budgetStatusData.length > 0 ? (
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
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <EmptyChartState 
                    title="No Budget Data"
                    description="Budget status will appear here once project budgets are created."
                  />
                )}
              </CardContent>
            </Card>

            {/* Expenses by Category */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Expenses by Category
                </CardTitle>
              </CardHeader>
              <CardContent>
                {expensesByCategoryData.length > 0 ? (
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={expensesByCategoryData}
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="amount"
                          label={({ category, amount }) => `${category}: ${formatCurrency(amount)}`}
                        >
                          {expensesByCategoryData.map((entry, index) => (
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
                    title="No Expense Data"
                    description="Expense breakdown will appear here once expenses are added to projects."
                  />
                )}
              </CardContent>
            </Card>
          </div>

          {/* Monthly Spending Trend */}
          {monthlySpendingData.length > 0 && (
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
                    <AreaChart data={monthlySpendingData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip content={<CustomTooltip />} />
                      <Area 
                        type="monotone" 
                        dataKey="amount" 
                        stroke="#8884d8" 
                        fill="#8884d8" 
                        fillOpacity={0.6}
                        name="Monthly Spending"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Project Financial Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Project Financial Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {projectFinancials.map(project => {
                  const budgetStatus = getBudgetStatus(project);
                  return (
                    <div key={project.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium">{project.name}</h4>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                          <span>Budget: {formatCurrency(project.financials?.budget?.allocated_amount || 0)}</span>
                          <span>Spent: {formatCurrency(project.financials?.total_expenses || 0)}</span>
                          {budgetStatus && (
                            <Badge variant={budgetStatus.variant} className={budgetStatus.color}>
                              {budgetStatus.text}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <Button variant="outline" size="sm" asChild>
                          <Link to={`/solutions/projects/${project.id}/finance`}>
                            View Details
                            <ChevronRight className="h-4 w-4 ml-1" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analysis" className="space-y-6">
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

          {/* Budget Variance Analysis */}
          {selectedProjectVariance && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Budget Variance Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">
                      {selectedProjectVariance.variance_percentage?.toFixed(1) || 0}%
                    </div>
                    <div className="text-sm text-muted-foreground">Overall Variance</div>
                  </div>
                  <div className="text-center">
                    <Badge 
                      variant={getVarianceStatus(selectedProjectVariance.status).variant}
                      className={getVarianceStatus(selectedProjectVariance.status).color}
                    >
                      {getVarianceStatus(selectedProjectVariance.status).text}
                    </Badge>
                    <div className="text-sm text-muted-foreground mt-1">Status</div>
                  </div>
                </div>

                {/* Variance by Category Chart */}
                {formatVarianceData(selectedProjectVariance).length > 0 && (
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={formatVarianceData(selectedProjectVariance)}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="category" />
                        <YAxis />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                        <Bar dataKey="budgeted" fill="#8884d8" name="Budgeted Amount" />
                        <Bar dataKey="actual" fill="#82ca9d" name="Actual Amount" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="forecasting" className="space-y-6">
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

          {/* Expense Forecast */}
          {selectedProjectForecast && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Expense Forecast ({selectedTimeframe} months)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {formatForecastData(selectedProjectForecast).length > 0 ? (
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={formatForecastData(selectedProjectForecast)}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip content={<CustomTooltip />} />
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
                ) : (
                  <EmptyChartState 
                    title="No Forecast Data"
                    description="Expense forecasts will appear here based on historical spending patterns."
                  />
                )}

                {/* Budget Impact Summary */}
                {selectedProjectForecast.budget_impact && (
                  <div className="mt-4 p-4 bg-muted rounded-lg">
                    <h4 className="font-medium mb-2">Budget Impact Assessment</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Predicted Total:</span>
                        <div className="font-medium">
                          {formatCurrency(selectedProjectForecast.budget_impact.predicted_total || 0)}
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Budget Remaining:</span>
                        <div className="font-medium">
                          {formatCurrency(selectedProjectForecast.budget_impact.budget_remaining || 0)}
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Risk Level:</span>
                        <div className="font-medium">
                          {selectedProjectForecast.budget_impact.risk_level || 'Unknown'}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="optimization" className="space-y-6">
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

          {/* Cost Optimization Analysis */}
          {selectedProjectOptimization && (
            <div className="space-y-6">
              {/* Optimization Opportunities */}
              {selectedProjectOptimization.optimization_opportunities?.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Lightbulb className="h-5 w-5" />
                      Cost Optimization Opportunities
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {selectedProjectOptimization.optimization_opportunities.map((opportunity, index) => (
                        <div key={index} className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                          <Zap className="h-5 w-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <h4 className="font-medium">{opportunity.category}</h4>
                            <p className="text-sm text-muted-foreground">{opportunity.description}</p>
                            <div className="flex items-center gap-4 mt-2 text-sm">
                              <span>Potential Savings: {formatCurrency(opportunity.potential_savings || 0)}</span>
                              <Badge variant="secondary">{opportunity.priority || 'Medium'} Priority</Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Cost Efficiency Metrics */}
              {selectedProjectOptimization.cost_efficiency && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      Cost Efficiency Metrics
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="text-center p-4 bg-muted rounded-lg">
                        <div className="text-2xl font-bold">
                          {selectedProjectOptimization.cost_efficiency.efficiency_score?.toFixed(1) || 0}%
                        </div>
                        <div className="text-sm text-muted-foreground">Efficiency Score</div>
                      </div>
                      <div className="text-center p-4 bg-muted rounded-lg">
                        <div className="text-2xl font-bold">
                          {formatCurrency(selectedProjectOptimization.cost_efficiency.cost_per_task || 0)}
                        </div>
                        <div className="text-sm text-muted-foreground">Cost per Task</div>
                      </div>
                      <div className="text-center p-4 bg-muted rounded-lg">
                        <div className="text-2xl font-bold">
                          {selectedProjectOptimization.cost_efficiency.waste_percentage?.toFixed(1) || 0}%
                        </div>
                        <div className="text-sm text-muted-foreground">Waste Percentage</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Finance; 