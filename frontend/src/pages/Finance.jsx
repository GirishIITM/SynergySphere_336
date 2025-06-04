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
  Receipt
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
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
  Area
} from 'recharts';

const Finance = () => {
  const [projects, setProjects] = useState([]);
  const [projectFinancials, setProjectFinancials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTimeframe, setSelectedTimeframe] = useState('30');

  const currentUser = getCurrentUser();
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

  useEffect(() => {
    fetchAllFinancials();
  }, [selectedTimeframe]);

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
    } catch (err) {
      console.error('Error fetching financial data:', err);
      setError('Failed to load financial data');
    } finally {
      setLoading(false);
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
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
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
  const monthlySpendingData = getMonthlySpendingData();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <DollarSign className="h-8 w-8" />
            Finance Overview
          </h1>
          <p className="text-muted-foreground">
            Comprehensive financial insights across all your projects
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
          <Button variant="outline" onClick={fetchAllFinancials}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Budget</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(overallFinancials.totalBudget)}</div>
            <p className="text-xs text-muted-foreground">
              {overallFinancials.projectsWithBudget} projects with budget
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
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallFinancials.budgetUtilization.toFixed(1)}%</div>
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
            <div className="flex items-center gap-1 mt-1">
              {overallFinancials.remainingBudget >= 0 ? (
                <TrendingUp className="h-3 w-3 text-green-600" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-600" />
              )}
              <span className={`text-xs ${overallFinancials.remainingBudget >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {overallFinancials.remainingBudget >= 0 ? 'Available' : 'Over budget'}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
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
              <ResponsiveContainer width="100%" height={300}>
                <RechartsPieChart>
                  <Pie
                    data={budgetStatusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {budgetStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RechartsPieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No budget data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Monthly Spending Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Monthly Spending Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            {monthlySpendingData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={monthlySpendingData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={(value) => `$${value.toLocaleString()}`} />
                  <Tooltip formatter={(value) => [formatCurrency(value), 'Spending']} />
                  <Area type="monotone" dataKey="amount" stroke="#0088FE" fill="#0088FE" fillOpacity={0.3} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                No spending data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Expenses by Category */}
      {categoryData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Expenses by Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" />
                <YAxis tickFormatter={(value) => `$${value.toLocaleString()}`} />
                <Tooltip formatter={(value) => [formatCurrency(value), 'Amount']} />
                <Bar dataKey="amount" fill="#0088FE" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Projects Financial Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderKanban className="h-5 w-5" />
            Projects Financial Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {projectFinancials.map((project) => {
              const budgetStatus = getBudgetStatus(project);
              const budget = project.financials?.budget?.allocated_amount || 0;
              const spent = project.financials?.total_expenses || 0;
              const utilization = budget > 0 ? (spent / budget) * 100 : 0;
              
              return (
                <div key={project.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div>
                      <h3 className="font-medium">{project.name}</h3>
                      <p className="text-sm text-muted-foreground">{project.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-sm font-medium">Budget: {formatCurrency(budget)}</p>
                      <p className="text-sm text-muted-foreground">Spent: {formatCurrency(spent)}</p>
                    </div>
                    {budgetStatus && (
                      <div className="text-center">
                        <Progress value={Math.min(utilization, 100)} className="w-20 mb-1" />
                        <Badge variant={budgetStatus.variant} className="text-xs">
                          {budgetStatus.text}
                        </Badge>
                      </div>
                    )}
                    <Button variant="ghost" size="sm" asChild>
                      <Link to={`/solutions/projects/${project.id}/finance`}>
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              );
            })}
            {projectFinancials.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <FolderKanban className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No projects found. Create your first project to manage finances.</p>
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

export default Finance; 