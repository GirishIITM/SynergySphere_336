import { apiRequest } from './apiRequest';

/**
 * Finance API for managing budgets and expenses
 */
export const financeAPI = {
  // Budget operations
  createBudget: async (projectId, budgetData) => {
    return await apiRequest(`/finance/projects/${projectId}/budget`, 'POST', budgetData, 'budget-create');
  },

  updateBudget: async (budgetId, budgetData) => {
    return await apiRequest(`/finance/budgets/${budgetId}`, 'PUT', budgetData, 'budget-update');
  },

  deleteBudget: async (budgetId) => {
    return await apiRequest(`/finance/budgets/${budgetId}`, 'DELETE', null, 'budget-delete');
  },

  // Expense operations
  addExpense: async (projectId, expenseData) => {
    return await apiRequest(`/finance/projects/${projectId}/expenses`, 'POST', expenseData, 'expense-create');
  },

  updateExpense: async (expenseId, expenseData) => {
    return await apiRequest(`/finance/expenses/${expenseId}`, 'PUT', expenseData, 'expense-update');
  },

  deleteExpense: async (expenseId) => {
    return await apiRequest(`/finance/expenses/${expenseId}`, 'DELETE', null, 'expense-delete');
  },

  getExpenses: async (projectId, filters = {}) => {
    const params = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      if (filters[key]) params.append(key, filters[key]);
    });
    
    const endpoint = `/finance/projects/${projectId}/expenses${params.toString() ? '?' + params.toString() : ''}`;
    return await apiRequest(endpoint, 'GET', null, 'expenses-get');
  },

  getProjectFinancials: async (projectId) => {
    return await apiRequest(`/finance/projects/${projectId}/financials`, 'GET', null, 'project-financials-get');
  },

  // Advanced financial analytics
  getBudgetVarianceAnalysis: async (projectId) => {
    return await apiRequest(`/finance/projects/${projectId}/budget-variance`, 'GET', null, 'budget-variance-analysis');
  },

  getExpenseForecast: async (projectId, months = 3) => {
    return await apiRequest(`/finance/projects/${projectId}/expense-forecast?months=${months}`, 'GET', null, 'expense-forecast');
  },

  getCostOptimizationAnalysis: async (projectId) => {
    return await apiRequest(`/finance/projects/${projectId}/cost-optimization`, 'GET', null, 'cost-optimization-analysis');
  },

  // Task financial analytics
  getTaskFinancialSummary: async (taskId) => {
    return await apiRequest(`/finance/tasks/${taskId}/financial-summary`, 'GET', null, 'task-financial-summary');
  }
}; 