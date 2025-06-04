import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { taskAPI } from '../../utils/apiCalls/taskAPI';
import { financeAPI } from '../../utils/apiCalls/financeAPI';
import { 
  Calendar,
  Clock,
  User,
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Edit,
  ArrowLeft,
  Plus,
  Trash2,
  Paperclip,
  Target,
  BarChart3
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
      
      if (response.success) {
        setNewExpense({ amount: '', description: '', category: 'Other' });
        setShowAddExpense(false);
        loadTaskDetails(); // Reload to get updated expenses
      } else {
        setError(response.message || 'Failed to add expense');
      }
    } catch (err) {
      console.error('Error adding expense:', err);
      setError('Failed to add expense');
    }
  };

  /**
   * Get status color for task status badge.
   */
  const getStatusColor = (status) => {
    switch (status) {
      case 'Completed': return 'bg-green-100 text-green-800';
      case 'In Progress': return 'bg-blue-100 text-blue-800';
      case 'Not Started': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  /**
   * Get budget status color based on utilization.
   */
  const getBudgetStatusColor = (utilization) => {
    if (utilization > 100) return 'text-red-600';
    if (utilization > 80) return 'text-yellow-600';
    return 'text-green-600';
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
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
            <span className="text-red-700">{error}</span>
          </div>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center text-gray-500">Task not found</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <div className="flex items-center space-x-3 mb-2">
                <h1 className="text-2xl font-bold text-gray-900">{task.title}</h1>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(task.status)}`}>
                  {task.status}
                </span>
                {task.is_overdue && (
                  <span className="px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                    Overdue
                  </span>
                )}
              </div>
              <p className="text-gray-600 max-w-2xl">{task.description || 'No description provided'}</p>
            </div>
          </div>
          <button
            onClick={() => navigate(`/solutions/tasks/${taskId}/edit`)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Edit className="h-4 w-4" />
            <span>Edit Task</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Task Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Task Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-3">
                <Calendar className="h-5 w-5 text-gray-400" />
                <div>
                  <span className="text-sm text-gray-500">Due Date</span>
                  <p className="font-medium">{formatDate(task.due_date)}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <User className="h-5 w-5 text-gray-400" />
                <div>
                  <span className="text-sm text-gray-500">Assignee</span>
                  <p className="font-medium">{task.assignee || 'Unassigned'}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Target className="h-5 w-5 text-gray-400" />
                <div>
                  <span className="text-sm text-gray-500">Progress</span>
                  <p className="font-medium">{task.percent_complete || 0}%</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Clock className="h-5 w-5 text-gray-400" />
                <div>
                  <span className="text-sm text-gray-500">Estimated Effort</span>
                  <p className="font-medium">{task.estimated_effort || 0} hours</p>
                </div>
              </div>
            </div>
          </div>

          {/* Budget and Expenses */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Budget & Expenses</h2>
              <button
                onClick={() => setShowAddExpense(!showAddExpense)}
                className="flex items-center space-x-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Add Expense</span>
              </button>
            </div>

            {/* Budget Overview */}
            {task.budget && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <DollarSign className="h-5 w-5 text-blue-600" />
                    <span className="text-sm font-medium text-blue-900">Total Budget</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-900">{formatCurrency(task.budget)}</p>
                </div>
                <div className="bg-red-50 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <TrendingDown className="h-5 w-5 text-red-600" />
                    <span className="text-sm font-medium text-red-900">Total Spent</span>
                  </div>
                  <p className="text-2xl font-bold text-red-900">{formatCurrency(task.total_spent)}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                    <span className="text-sm font-medium text-green-900">Remaining</span>
                  </div>
                  <p className={`text-2xl font-bold ${getBudgetStatusColor(task.budget_utilization)}`}>
                    {formatCurrency(task.budget_remaining)}
                  </p>
                </div>
              </div>
            )}

            {/* Add Expense Form */}
            {showAddExpense && (
              <form onSubmit={handleAddExpense} className="bg-gray-50 rounded-lg p-4 mb-6">
                <h3 className="font-medium text-gray-900 mb-3">Add New Expense</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newExpense.amount}
                      onChange={(e) => setNewExpense({...newExpense, amount: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="0.00"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    <select
                      value={newExpense.category}
                      onChange={(e) => setNewExpense({...newExpense, category: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {expenseCategories.map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <input
                      type="text"
                      value={newExpense.description}
                      onChange={(e) => setNewExpense({...newExpense, description: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Expense description"
                      required
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-3 mt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddExpense(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Add Expense
                  </button>
                </div>
              </form>
            )}

            {/* Expenses List */}
            <div>
              <h3 className="font-medium text-gray-900 mb-3">Expense History</h3>
              {task.expenses && task.expenses.length > 0 ? (
                <div className="space-y-3">
                  {task.expenses.map((expense) => (
                    <div key={expense.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <span className="font-medium text-gray-900">{expense.description}</span>
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                            {expense.category}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500">
                          Added by {expense.created_by_name} on {formatDate(expense.incurred_at)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-red-600">{formatCurrency(expense.amount)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No expenses recorded for this task</p>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Priority Score</span>
                <span className="font-medium">{task.priority_score || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Subtasks</span>
                <span className="font-medium">{task.dependency_count || 0}</span>
              </div>
              {task.budget && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Budget Utilization</span>
                  <span className={`font-medium ${getBudgetStatusColor(task.budget_utilization)}`}>
                    {task.budget_utilization.toFixed(1)}%
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Attachments */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Attachments</h2>
            {task.attachments && task.attachments.length > 0 ? (
              <div className="space-y-3">
                {task.attachments.map((attachment) => (
                  <div key={attachment.id} className="flex items-center space-x-3">
                    <Paperclip className="h-4 w-4 text-gray-400" />
                    <a
                      href={attachment.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 truncate"
                    >
                      Attachment {attachment.id}
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No attachments</p>
            )}
          </div>

          {/* Project Info */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Project</h2>
            <div className="flex items-center space-x-3">
              <BarChart3 className="h-5 w-5 text-gray-400" />
              <div>
                <p className="font-medium text-gray-900">{task.project_name}</p>
                <button
                  onClick={() => navigate(`/solutions/projects/${task.project_id}`)}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  View Project Details
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskDetail; 