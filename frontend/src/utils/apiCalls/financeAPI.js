import { apiRequest } from './apiRequest';

/**
 * Finance API for managing budgets and expenses
 */
export const financeAPI = {
  // Budget operations
  createBudget: async (projectId, budgetData) => {
    return await apiRequest(`/finance/projects/${projectId}/budget`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(budgetData)
    });
  },

  updateBudget: async (budgetId, budgetData) => {
    return await apiRequest(`/finance/budgets/${budgetId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(budgetData)
    });
  },

  deleteBudget: async (budgetId) => {
    return await apiRequest(`/finance/budgets/${budgetId}`, {
      method: 'DELETE'
    });
  },

  // Expense operations
  addExpense: async (projectId, expenseData) => {
    return await apiRequest(`/finance/projects/${projectId}/expenses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(expenseData)
    });
  },

  updateExpense: async (expenseId, expenseData) => {
    return await apiRequest(`/finance/expenses/${expenseId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(expenseData)
    });
  },

  deleteExpense: async (expenseId) => {
    return await apiRequest(`/finance/expenses/${expenseId}`, {
      method: 'DELETE'
    });
  },

  getExpenses: async (projectId, filters = {}) => {
    const params = new URLSearchParams();
    Object.keys(filters).forEach(key => {
      if (filters[key]) params.append(key, filters[key]);
    });
    
    const url = `/finance/projects/${projectId}/expenses${params.toString() ? '?' + params.toString() : ''}`;
    return await apiRequest(url);
  },

  getProjectFinancials: async (projectId) => {
    return await apiRequest(`/finance/projects/${projectId}/financials`);
  }
}; 