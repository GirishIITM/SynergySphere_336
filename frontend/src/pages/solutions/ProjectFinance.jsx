import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { 
  DollarSign, 
  Plus, 
  Edit, 
  Trash2, 
  TrendingUp, 
  TrendingDown,
  AlertCircle,
  Calendar,
  Receipt,
  PieChart
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { financeAPI } from '../../utils/apiCalls/financeAPI';
import { projectAPI } from '../../utils/apiCalls/projectAPI';
import { taskAPI } from '../../utils/apiCalls/taskAPI';
import { getCurrentUser } from '../../utils/apiCalls/auth';
import LoadingIndicator from '../../components/LoadingIndicator';
import { PieChart as RechartsPieChart, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Pie } from 'recharts';

const ProjectFinance = () => {
  const { projectId } = useParams();
  const [project, setProject] = useState(null);
  const [projectTasks, setProjectTasks] = useState([]);
  const [financials, setFinancials] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Dialog states
  const [budgetDialogOpen, setBudgetDialogOpen] = useState(false);
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState(null);
  const [editingExpense, setEditingExpense] = useState(null);

  // Form states
  const [budgetForm, setBudgetForm] = useState({
    allocated_amount: '',
    description: ''
  });
  const [expenseForm, setExpenseForm] = useState({
    amount: '',
    description: '',
    category: '',
    task_id: '',
    date: new Date().toISOString().split('T')[0]
  });

  const currentUser = getCurrentUser();

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];
  const EXPENSE_CATEGORIES = [
    'Development',
    'Design',
    'Marketing',
    'Equipment',
    'Software',
    'Travel',
    'Consulting',
    'Other'
  ];

  useEffect(() => {
    fetchProjectData();
    fetchProjectTasks();
    fetchFinancials();
    fetchExpenses();
  }, [projectId]);

  const fetchProjectData = async () => {
    try {
      const projectData = await projectAPI.getProject(projectId);
      setProject(projectData);
    } catch (err) {
      console.error('Error fetching project:', err);
      setError('Failed to load project data');
    }
  };

  const fetchProjectTasks = async () => {
    try {
      const tasksData = await taskAPI.getTasksByProject(projectId);
      setProjectTasks(tasksData?.tasks || []);
    } catch (err) {
      console.error('Error fetching project tasks:', err);
    }
  };

  const fetchFinancials = async () => {
    try {
      const financialData = await financeAPI.getProjectFinancials(projectId);
      setFinancials(financialData);
    } catch (err) {
      console.error('Error fetching financials:', err);
      setError('Failed to load financial data');
    } finally {
      setLoading(false);
    }
  };

  const fetchExpenses = async () => {
    try {
      const expenseData = await financeAPI.getExpenses(projectId);
      setExpenses(expenseData || []);
    } catch (err) {
      console.error('Error fetching expenses:', err);
    }
  };

  const handleCreateBudget = async (e) => {
    e.preventDefault();
    try {
      await financeAPI.createBudget(projectId, {
        allocated_amount: parseFloat(budgetForm.allocated_amount),
        description: budgetForm.description
      });
      setBudgetDialogOpen(false);
      setBudgetForm({ allocated_amount: '', description: '' });
      fetchFinancials();
    } catch (err) {
      setError('Failed to create budget');
    }
  };

  const handleUpdateBudget = async (e) => {
    e.preventDefault();
    try {
      await financeAPI.updateBudget(editingBudget.id, {
        allocated_amount: parseFloat(budgetForm.allocated_amount),
        description: budgetForm.description
      });
      setBudgetDialogOpen(false);
      setEditingBudget(null);
      setBudgetForm({ allocated_amount: '', description: '' });
      fetchFinancials();
    } catch (err) {
      setError('Failed to update budget');
    }
  };

  const handleDeleteBudget = async (budgetId) => {
    if (!window.confirm('Are you sure you want to delete this budget?')) return;
    try {
      await financeAPI.deleteBudget(budgetId);
      fetchFinancials();
    } catch (err) {
      setError('Failed to delete budget');
    }
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    
    // Check if tasks are available
    if (projectTasks.length === 0) {
      setError('No tasks available. Please create a task first before adding expenses.');
      return;
    }
    
    // Validate that a task is selected
    if (!expenseForm.task_id) {
      setError('Please select a task for this expense');
      return;
    }
    
    try {
      await financeAPI.addExpense(projectId, {
        amount: parseFloat(expenseForm.amount),
        description: expenseForm.description,
        category: expenseForm.category,
        task_id: parseInt(expenseForm.task_id),
        date: expenseForm.date
      });
      setExpenseDialogOpen(false);
      setExpenseForm({
        amount: '',
        description: '',
        category: '',
        task_id: '',
        date: new Date().toISOString().split('T')[0]
      });
      setError(''); // Clear any previous errors
      fetchExpenses();
      fetchFinancials();
    } catch (err) {
      console.error('Error adding expense:', err);
      setError(err.message || 'Failed to add expense');
    }
  };

  const handleUpdateExpense = async (e) => {
    e.preventDefault();
    
    // Check if tasks are available
    if (projectTasks.length === 0) {
      setError('No tasks available. Please create a task first before updating this expense.');
      return;
    }
    
    // Validate that a task is selected
    if (!expenseForm.task_id) {
      setError('Please select a task for this expense');
      return;
    }
    
    try {
      await financeAPI.updateExpense(editingExpense.id, {
        amount: parseFloat(expenseForm.amount),
        description: expenseForm.description,
        category: expenseForm.category,
        task_id: parseInt(expenseForm.task_id),
        date: expenseForm.date
      });
      setExpenseDialogOpen(false);
      setEditingExpense(null);
      setExpenseForm({
        amount: '',
        description: '',
        category: '',
        task_id: '',
        date: new Date().toISOString().split('T')[0]
      });
      setError(''); // Clear any previous errors
      fetchExpenses();
      fetchFinancials();
    } catch (err) {
      console.error('Error updating expense:', err);
      setError(err.message || 'Failed to update expense');
    }
  };

  const handleDeleteExpense = async (expenseId) => {
    if (!window.confirm('Are you sure you want to delete this expense?')) return;
    try {
      await financeAPI.deleteExpense(expenseId);
      fetchExpenses();
      fetchFinancials();
    } catch (err) {
      console.error('Error deleting expense:', err);
      setError(err.message || 'Failed to delete expense');
    }
  };

  const openBudgetDialog = (budget = null) => {
    if (budget) {
      setEditingBudget(budget);
      setBudgetForm({
        allocated_amount: budget.allocated_amount.toString(),
        description: budget.description || ''
      });
    } else {
      setEditingBudget(null);
      setBudgetForm({ allocated_amount: '', description: '' });
    }
    setBudgetDialogOpen(true);
  };

  const openExpenseDialog = (expense = null) => {
    if (expense) {
      setEditingExpense(expense);
      setExpenseForm({
        amount: expense.amount.toString(),
        description: expense.description || '',
        category: expense.category || '',
        task_id: expense.task_id ? expense.task_id.toString() : '',
        date: expense.date || new Date().toISOString().split('T')[0]
      });
    } else {
      setEditingExpense(null);
      setExpenseForm({
        amount: '',
        description: '',
        category: '',
        task_id: '',
        date: new Date().toISOString().split('T')[0]
      });
    }
    setExpenseDialogOpen(true);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const getBudgetStatus = () => {
    if (!financials || !financials.budget) return null;
    const budget = financials.budget;
    const remaining = budget.allocated_amount - budget.spent_amount;
    const percentSpent = (budget.spent_amount / budget.allocated_amount) * 100;
    
    return {
      ...budget,
      remaining,
      percentSpent,
      status: percentSpent > 90 ? 'danger' : percentSpent > 75 ? 'warning' : 'good'
    };
  };

  const getExpenseChartData = () => {
    if (!expenses.length) return [];
    
    const categoryTotals = expenses.reduce((acc, expense) => {
      const category = expense.category || 'Other';
      acc[category] = (acc[category] || 0) + expense.amount;
      return acc;
    }, {});

    return Object.entries(categoryTotals).map(([category, amount]) => ({
      name: category,
      value: amount
    }));
  };

  const getMonthlySpendingData = () => {
    if (!expenses.length) return [];
    
    const monthlyData = expenses.reduce((acc, expense) => {
      const month = new Date(expense.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      acc[month] = (acc[month] || 0) + expense.amount;
      return acc;
    }, {});

    return Object.entries(monthlyData).map(([month, amount]) => ({
      month,
      amount
    }));
  };

  if (loading) {
    return <LoadingIndicator loading={true} />;
  }

  const budgetStatus = getBudgetStatus();
  const pieData = getExpenseChartData();
  const monthlyData = getMonthlySpendingData();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Project Finance</h1>
          <p className="text-muted-foreground">
            {project?.name || 'Loading...'} - Budget and Expense Management
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => openBudgetDialog()} variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            {financials?.budget ? 'Update Budget' : 'Create Budget'}
          </Button>
          <Button onClick={() => openExpenseDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Add Expense
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

      {/* Budget Overview */}
      {budgetStatus && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Budget Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {formatCurrency(budgetStatus.allocated_amount)}
                </div>
                <div className="text-sm text-muted-foreground">Allocated</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {formatCurrency(budgetStatus.spent_amount)}
                </div>
                <div className="text-sm text-muted-foreground">Spent</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(budgetStatus.remaining)}
                </div>
                <div className="text-sm text-muted-foreground">Remaining</div>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold ${
                  budgetStatus.status === 'danger' ? 'text-red-600' :
                  budgetStatus.status === 'warning' ? 'text-yellow-600' : 'text-green-600'
                }`}>
                  {budgetStatus.percentSpent.toFixed(1)}%
                </div>
                <div className="text-sm text-muted-foreground">Used</div>
              </div>
            </div>
            
            {budgetStatus.description && (
              <div className="mt-4 p-3 bg-muted rounded-lg">
                <p className="text-sm">{budgetStatus.description}</p>
              </div>
            )}
            
            <div className="flex justify-end mt-4 gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => openBudgetDialog(budgetStatus)}
              >
                <Edit className="h-4 w-4 mr-1" />
                Edit
              </Button>
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={() => handleDeleteBudget(budgetStatus.id)}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expense by Category */}
        {pieData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5" />
                Expenses by Category
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <RechartsPieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                </RechartsPieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Monthly Spending */}
        {monthlyData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Monthly Spending
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Bar dataKey="amount" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Expenses List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Recent Expenses
          </CardTitle>
        </CardHeader>
        <CardContent>
          {expenses.length === 0 ? (
            <div className="text-center py-8">
              <Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">No expenses recorded yet</p>
              <Button onClick={() => openExpenseDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Expense
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {expenses.slice(0, 10).map((expense) => (
                <div key={expense.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{expense.description}</h4>
                      <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                        {expense.category}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(expense.date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-lg">{formatCurrency(expense.amount)}</span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => openExpenseDialog(expense)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleDeleteExpense(expense.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Budget Dialog */}
      <Dialog open={budgetDialogOpen} onOpenChange={setBudgetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingBudget ? 'Edit Budget' : 'Create Budget'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={editingBudget ? handleUpdateBudget : handleCreateBudget} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Allocated Amount</label>
              <Input
                type="number"
                step="0.01"
                placeholder="Enter budget amount"
                value={budgetForm.allocated_amount}
                onChange={(e) => setBudgetForm(prev => ({ ...prev, allocated_amount: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Description (Optional)</label>
              <Input
                placeholder="Budget description"
                value={budgetForm.description}
                onChange={(e) => setBudgetForm(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setBudgetDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {editingBudget ? 'Update' : 'Create'} Budget
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Expense Dialog */}
      <Dialog open={expenseDialogOpen} onOpenChange={setExpenseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingExpense ? 'Edit Expense' : 'Add Expense'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={editingExpense ? handleUpdateExpense : handleAddExpense} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Amount</label>
              <Input
                type="number"
                step="0.01"
                placeholder="Enter expense amount"
                value={expenseForm.amount}
                onChange={(e) => setExpenseForm(prev => ({ ...prev, amount: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <Input
                placeholder="Expense description"
                value={expenseForm.description}
                onChange={(e) => setExpenseForm(prev => ({ ...prev, description: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Category</label>
              <Select value={expenseForm.category} onValueChange={(value) => setExpenseForm(prev => ({ ...prev, category: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map((category) => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Task *</label>
              <Select 
                value={expenseForm.task_id} 
                onValueChange={(value) => setExpenseForm(prev => ({ ...prev, task_id: value }))}
                required
              >
                <SelectTrigger className={!expenseForm.task_id ? 'border-red-300' : ''}>
                  <SelectValue placeholder="Select a task (required)" />
                </SelectTrigger>
                <SelectContent>
                  {projectTasks.map((task) => (
                    <SelectItem key={task.id} value={task.id.toString()}>{task.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {projectTasks.length === 0 && (
                <p className="text-sm text-amber-600 mt-1">
                  No tasks available. Create a task first before adding expenses.
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Date</label>
              <Input
                type="date"
                value={expenseForm.date}
                onChange={(e) => setExpenseForm(prev => ({ ...prev, date: e.target.value }))}
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setExpenseDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {editingExpense ? 'Update' : 'Add'} Expense
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProjectFinance; 