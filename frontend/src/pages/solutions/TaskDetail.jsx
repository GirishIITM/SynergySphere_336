import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { taskAPI } from '../../utils/apiCalls/taskAPI';
import { financeAPI } from '../../utils/apiCalls/financeAPI';
import './TaskDetail.css';
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
   * Get status color for task status badge.
   */
  const getStatusColor = (status) => {
    switch (status) {
      case 'Completed': return 'task-status-completed';
      case 'In Progress': return 'task-status-in-progress';
      case 'Not Started': return 'task-status-not-started';
      default: return 'task-status-not-started';
    }
  };

  /**
   * Get budget status class based on utilization.
   */
  const getBudgetStatusClass = (utilization) => {
    if (utilization > 100) return 'negative';
    if (utilization > 80) return 'warning';
    return 'positive';
  };

  /**
   * Get budget status color based on utilization (legacy function).
   */
  const getBudgetStatusColor = (utilization) => {
    return getBudgetStatusClass(utilization);
  };

  /**
   * Format currency value.
   */
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
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
      <div className="task-detail-loading">
        <div className="task-detail-loading-spinner"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="task-detail-error">
        <div className="task-detail-error-content">
          <div className="task-detail-error-inner">
            <AlertTriangle className="task-detail-error-icon" />
            <span className="task-detail-error-text">{error}</span>
          </div>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="task-detail-error">
        <div className="task-detail-empty-state">Task not found</div>
      </div>
    );
  }

  return (
    <div className="task-detail-container">
      {/* Header */}
      <div className="task-detail-header">
        <div className="task-detail-header-content">
          <div className="flex items-start space-x-4">
            <button
              onClick={() => navigate(-1)}
              className="task-detail-back-btn"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <div className="task-detail-status-container">
                <h1 className="task-detail-title">{task.title}</h1>
                <span className={`task-status-badge ${getStatusColor(task.status)}`}>
                  {task.status}
                </span>
                {task.is_overdue && (
                  <span className="task-overdue-badge">
                    Overdue
                  </span>
                )}
              </div>
              <p className="task-detail-description">{task.description || 'No description provided'}</p>
            </div>
          </div>
          <button
            onClick={() => navigate(`/solutions/tasks/edit/${taskId}`)}
            className="task-detail-edit-btn"
          >
            <Edit className="h-4 w-4" />
            <span>Edit Task</span>
          </button>
        </div>
      </div>

      <div className="task-detail-grid">
        {/* Task Information */}
        <div className="task-detail-main">
          {/* Basic Information */}
          <div className="task-detail-card">
            <h2 className="task-detail-card-title">Task Information</h2>
            <div className="task-detail-info-grid">
              <div className="task-detail-info-item">
                <Calendar className="task-detail-info-icon" />
                <div className="task-detail-info-content">
                  <span className="task-detail-info-label">Due Date</span>
                  <p className="task-detail-info-value">{formatDate(task.due_date)}</p>
                </div>
              </div>
              <div className="task-detail-info-item">
                <User className="task-detail-info-icon" />
                <div className="task-detail-info-content">
                  <span className="task-detail-info-label">Assignee</span>
                  <p className="task-detail-info-value">{task.assignee || 'Unassigned'}</p>
                </div>
              </div>
              <div className="task-detail-info-item">
                <Target className="task-detail-info-icon" />
                <div className="task-detail-info-content">
                  <span className="task-detail-info-label">Progress</span>
                  <p className="task-detail-info-value">{task.percent_complete || 0}%</p>
                </div>
              </div>
              <div className="task-detail-info-item">
                <Clock className="task-detail-info-icon" />
                <div className="task-detail-info-content">
                  <span className="task-detail-info-label">Estimated Effort</span>
                  <p className="task-detail-info-value">{task.estimated_effort || 0} hours</p>
                </div>
              </div>
            </div>
          </div>

          {/* Budget and Expenses */}
          <div className="task-detail-card">
            <div className="task-detail-card-title">
              <span>Budget & Expenses</span>
              <button
                onClick={() => setShowAddExpense(!showAddExpense)}
                className="task-detail-add-expense-btn"
              >
                <Plus className="h-4 w-4" />
                <span>Add Expense</span>
              </button>
            </div>

            {/* Budget Overview */}
            {task.budget && (
              <div className="task-detail-budget-grid">
                <div className="task-detail-budget-card task-detail-budget-total">
                  <div className="task-detail-budget-header">
                    <DollarSign className="task-detail-budget-icon" />
                    <span className="task-detail-budget-label">Total Budget</span>
                  </div>
                  <p className="task-detail-budget-amount">{formatCurrency(task.budget)}</p>
                </div>
                <div className="task-detail-budget-card task-detail-budget-spent">
                  <div className="task-detail-budget-header">
                    <TrendingDown className="task-detail-budget-icon" />
                    <span className="task-detail-budget-label">Total Spent</span>
                  </div>
                  <p className="task-detail-budget-amount">{formatCurrency(task.total_spent)}</p>
                </div>
                <div className="task-detail-budget-card task-detail-budget-remaining">
                  <div className="task-detail-budget-header">
                    <TrendingUp className="task-detail-budget-icon" />
                    <span className="task-detail-budget-label">Remaining</span>
                  </div>
                  <p className={`task-detail-budget-amount ${getBudgetStatusColor(task.budget_utilization)}`}>
                    {formatCurrency(task.budget_remaining)}
                  </p>
                </div>
              </div>
            )}

            {/* Add Expense Form */}
            {showAddExpense && (
              <form onSubmit={handleAddExpense} className="task-detail-expense-form">
                <h3 className="task-detail-expense-form-title">Add New Expense</h3>
                <div className="task-detail-expense-form-grid">
                  <div className="task-detail-form-group">
                    <label className="task-detail-form-label">Amount</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newExpense.amount}
                      onChange={(e) => setNewExpense({...newExpense, amount: e.target.value})}
                      className="task-detail-form-input"
                      placeholder="0.00"
                      required
                    />
                  </div>
                  <div className="task-detail-form-group">
                    <label className="task-detail-form-label">Category</label>
                    <select
                      value={newExpense.category}
                      onChange={(e) => setNewExpense({...newExpense, category: e.target.value})}
                      className="task-detail-form-select"
                    >
                      {expenseCategories.map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>
                  <div className="task-detail-form-group">
                    <label className="task-detail-form-label">Description</label>
                    <input
                      type="text"
                      value={newExpense.description}
                      onChange={(e) => setNewExpense({...newExpense, description: e.target.value})}
                      className="task-detail-form-input"
                      placeholder="Expense description"
                      required
                    />
                  </div>
                </div>
                <div className="task-detail-form-actions">
                  <button
                    type="button"
                    onClick={() => setShowAddExpense(false)}
                    className="task-detail-form-btn cancel"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="task-detail-form-btn submit"
                  >
                    Add Expense
                  </button>
                </div>
              </form>
            )}

            {/* Expenses List */}
            <div>
              <h3 className="task-detail-expense-form-title">Expense History</h3>
              {task.expenses && task.expenses.length > 0 ? (
                <div className="task-detail-expenses-list">
                  {task.expenses.map((expense) => (
                    <div key={expense.id} className="task-detail-expense-item">
                      <div className="task-detail-expense-content">
                        <div className="task-detail-expense-header">
                          <span className="task-detail-expense-title">{expense.description}</span>
                          <span className="task-detail-expense-category">
                            {expense.category}
                          </span>
                        </div>
                        <p className="task-detail-expense-meta">
                          Added by {expense.created_by_name} on {formatDate(expense.incurred_at)}
                        </p>
                      </div>
                      <div className="task-detail-expense-amount">
                        <p>{formatCurrency(expense.amount)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="task-detail-empty-state">No expenses recorded for this task</p>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="task-detail-sidebar">
          {/* Quick Stats */}
          <div className="task-detail-card">
            <h2 className="task-detail-card-title">Quick Stats</h2>
            <div className="task-detail-quick-stats">
              <div className="task-detail-stat-item">
                <span className="task-detail-stat-label">Priority Score</span>
                <span className="task-detail-stat-value">{task.priority_score || 0}</span>
              </div>
              <div className="task-detail-stat-item">
                <span className="task-detail-stat-label">Subtasks</span>
                <span className="task-detail-stat-value">{task.dependency_count || 0}</span>
              </div>
              {task.budget && (
                <div className="task-detail-stat-item">
                  <span className="task-detail-stat-label">Budget Utilization</span>
                  <span className={`task-detail-stat-value ${getBudgetStatusColor(task.budget_utilization)}`}>
                    {task.budget_utilization.toFixed(1)}%
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Attachments */}
          <div className="task-detail-card">
            <h2 className="task-detail-card-title">Attachments</h2>
            {task.attachments && task.attachments.length > 0 ? (
              <div className="task-detail-attachments-list">
                {task.attachments.map((attachment) => (
                  <div key={attachment.id} className="task-detail-attachment-item">
                    <Paperclip className="task-detail-attachment-icon" />
                    <a
                      href={attachment.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="task-detail-attachment-link"
                    >
                      Attachment {attachment.id}
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <p className="task-detail-empty-state">No attachments</p>
            )}
          </div>

          {/* Project Info */}
          <div className="task-detail-card">
            <h2 className="task-detail-card-title">Project</h2>
            <div className="task-detail-project-info">
              <BarChart3 className="task-detail-project-icon" />
              <div className="task-detail-project-content">
                <p className="task-detail-project-name">{task.project_name}</p>
                <button
                  onClick={() => navigate(`/solutions/projects/${task.project_id}`)}
                  className="task-detail-project-link"
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