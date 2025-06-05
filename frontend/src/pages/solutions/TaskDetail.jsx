import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { taskAPI } from '../../utils/apiCalls/taskAPI';
import { financeAPI } from '../../utils/apiCalls/financeAPI';
import TaskComments from '../../components/TaskComments';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Badge } from '../../components/ui/badge';
import './TaskDetail.css';
import { 
  Calendar,
  Clock,
  User,
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Edit,
  ArrowLeft,
  Plus,
  Paperclip,
  Target,
  BarChart3,
  MessageCircle
} from 'lucide-react';

/**
 * TaskDetail component that displays comprehensive task information
 * including budget, expenses, and financial metrics.
 */
const TaskDetail = () => {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [newExpense, setNewExpense] = useState({
    amount: '',
    description: '',
    category: 'Other'
  });

  const expenseCategories = [
    'Development', 'Design', 'Marketing', 'Equipment', 
    'Software', 'Travel', 'Consulting', 'Other'
  ];

  useEffect(() => {
    loadTaskDetails();
  }, [taskId]);

  /**
   * Load task details with financial information.
   */
  const loadTaskDetails = async () => {
    try {
      setLoading(true);
      const response = await taskAPI.getTaskDetails(taskId);
      
      if (response.success) {
        setTask(response.data);
      } else {
        setError(response.message || 'Failed to load task details');
      }
    } catch (err) {
      console.error('Error loading task details:', err);
      setError('Failed to load task details');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle adding a new expense to the task.
   */
  const handleAddExpense = async (e) => {
    e.preventDefault();
    
    if (!newExpense.amount || !newExpense.description) {
      setError('Amount and description are required');
      return;
    }

    try {
      const expenseData = {
        ...newExpense,
        amount: parseFloat(newExpense.amount),
        task_id: parseInt(taskId)
      };

      const response = await financeAPI.addExpense(task.project_id, expenseData);
      
      // Backend returns the expense object directly on success (201 status)
      // If we get here without throwing an error, the expense was created successfully
      if (response && (response.id || response.amount)) {
        setNewExpense({ amount: '', description: '', category: 'Other' });
        setShowAddExpense(false);
        loadTaskDetails(); // Reload to get updated expenses
      } else {
        setError('Failed to add expense');
      }
    } catch (err) {
      console.error('Error adding expense:', err);
      setError(err.message || 'Failed to add expense');
    }
  };

  /**
   * Get status variant for task status badge.
   */
  const getStatusVariant = (status) => {
    switch (status) {
      case 'Completed': return 'success';
      case 'In Progress': return 'default';
      case 'Not Started': return 'secondary';
      default: return 'secondary';
    }
  };

  /**
   * Get budget status variant based on utilization.
   */
  const getBudgetStatusVariant = (utilization) => {
    if (utilization > 100) return 'destructive';
    if (utilization > 80) return 'warning';
    return 'success';
  };

  /**
   * Format currency value.
   */
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  /**
   * Format date for display.
   */
  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card className="border-destructive">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            Task not found
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={() => navigate(-1)}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="space-y-2">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-2xl font-bold">{task.title}</h1>
                  <Badge variant={getStatusVariant(task.status)}>
                    {task.status}
                  </Badge>
                  {task.is_overdue && (
                    <Badge variant="destructive">
                      Overdue
                    </Badge>
                  )}
                </div>
                <p className="text-muted-foreground max-w-2xl">
                  {task.description || 'No description provided'}
                </p>
              </div>
            </div>
            <Button
              onClick={() => navigate(`/solutions/tasks/${taskId}/edit`)}
              className="flex items-center gap-2"
            >
              <Edit className="h-4 w-4" />
              Edit Task
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <Target className="h-4 w-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger value="budget" className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Budget
              </TabsTrigger>
              <TabsTrigger value="comments" className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4" />
                Comments
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <Card>
                <CardHeader>
                  <CardTitle>Task Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex items-center gap-3">
                      <Calendar className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Due Date</p>
                        <p className="font-medium">{formatDate(task.due_date)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <User className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Assignee</p>
                        <p className="font-medium">{task.assignee || 'Unassigned'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Target className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Progress</p>
                        <p className="font-medium">{task.percent_complete || 0}%</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Clock className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Estimated Effort</p>
                        <p className="font-medium">{task.estimated_effort || 0} hours</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="budget">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    Budget & Expenses
                    <Button
                      onClick={() => setShowAddExpense(!showAddExpense)}
                      className="flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Add Expense
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Budget Overview */}
                  {task.budget && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card>
                        <CardContent className="p-4 text-center">
                          <div className="flex items-center justify-center gap-2 mb-2">
                            <DollarSign className="h-4 w-4 text-blue-500" />
                            <span className="text-sm text-muted-foreground">Total Budget</span>
                          </div>
                          <p className="text-xl font-bold">{formatCurrency(task.budget)}</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4 text-center">
                          <div className="flex items-center justify-center gap-2 mb-2">
                            <TrendingDown className="h-4 w-4 text-red-500" />
                            <span className="text-sm text-muted-foreground">Total Spent</span>
                          </div>
                          <p className="text-xl font-bold">{formatCurrency(task.total_spent)}</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4 text-center">
                          <div className="flex items-center justify-center gap-2 mb-2">
                            <TrendingUp className="h-4 w-4 text-green-500" />
                            <span className="text-sm text-muted-foreground">Remaining</span>
                          </div>
                          <p className="text-xl font-bold">{formatCurrency(task.budget_remaining)}</p>
                        </CardContent>
                      </Card>
                    </div>
                  )}

                  {/* Add Expense Form */}
                  {showAddExpense && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Add New Expense</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <form onSubmit={handleAddExpense} className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="amount">Amount</Label>
                              <Input
                                id="amount"
                                type="number"
                                step="0.01"
                                value={newExpense.amount}
                                onChange={(e) => setNewExpense({...newExpense, amount: e.target.value})}
                                placeholder="0.00"
                                required
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="category">Category</Label>
                              <Select
                                value={newExpense.category}
                                onValueChange={(value) => setNewExpense({...newExpense, category: value})}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {expenseCategories.map(category => (
                                    <SelectItem key={category} value={category}>
                                      {category}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="description">Description</Label>
                              <Input
                                id="description"
                                value={newExpense.description}
                                onChange={(e) => setNewExpense({...newExpense, description: e.target.value})}
                                placeholder="Expense description"
                                required
                              />
                            </div>
                          </div>
                          <div className="flex gap-2 justify-end">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setShowAddExpense(false)}
                            >
                              Cancel
                            </Button>
                            <Button type="submit">
                              Add Expense
                            </Button>
                          </div>
                        </form>
                      </CardContent>
                    </Card>
                  )}

                  {/* Expenses List */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Expense History</h3>
                    {task.expenses && task.expenses.length > 0 ? (
                      <div className="space-y-3">
                        {task.expenses.map((expense) => (
                          <Card key={expense.id}>
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <p className="font-medium">{expense.description}</p>
                                    <Badge variant="outline">{expense.category}</Badge>
                                  </div>
                                  <p className="text-sm text-muted-foreground">
                                    Added by {expense.created_by_name} on {formatDate(expense.incurred_at)}
                                  </p>
                                </div>
                                <p className="text-lg font-bold">{formatCurrency(expense.amount)}</p>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        No expenses recorded for this task
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="comments">
              <TaskComments taskId={taskId} />
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtasks</span>
                <span className="font-medium">{task.dependency_count || 0}</span>
              </div>
              {task.budget && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Budget Utilization</span>
                  <Badge variant={getBudgetStatusVariant(task.budget_utilization)}>
                    {task.budget_utilization.toFixed(1)}%
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Attachments */}
          <Card>
            <CardHeader>
              <CardTitle>Attachments</CardTitle>
            </CardHeader>
            <CardContent>
              {task.attachments && task.attachments.length > 0 ? (
                <div className="space-y-3">
                  {task.attachments.map((attachment) => (
                    <div key={attachment.id} className="flex items-center gap-3">
                      <Paperclip className="h-4 w-4 text-muted-foreground" />
                      <a
                        href={attachment.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        Attachment {attachment.id}
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No attachments</p>
              )}
            </CardContent>
          </Card>

          {/* Project Info */}
          <Card>
            <CardHeader>
              <CardTitle>Project</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <BarChart3 className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1">
                  <p className="font-medium">{task.project_name}</p>
                  <Button
                    variant="link"
                    className="h-auto p-0 text-sm"
                    onClick={() => navigate(`/solutions/projects/${task.project_id}`)}
                  >
                    View Project Details
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default TaskDetail;