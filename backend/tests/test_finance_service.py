"""
Unit tests for FinanceService.
"""

import pytest
from unittest.mock import Mock, patch
from services.finance_service import FinanceService
from models import Budget, Expense, Project, User, Notification


class TestFinanceService:
    """Test cases for FinanceService."""
    
    def setup_method(self):
        """Set up test fixtures."""
        # Mock project with members
        self.mock_project = Mock(spec=Project)
        self.mock_project.id = 1
        self.mock_project.name = "Test Project"
        self.mock_project.members = [Mock(id=1), Mock(id=2)]
        
        # Mock user
        self.mock_user = Mock(spec=User)
        self.mock_user.id = 1
        self.mock_user.full_name = "Test User"
        
    @patch('services.finance_service.Project')
    @patch('services.finance_service.Budget')
    @patch('services.finance_service.db')
    def test_create_budget_success(self, mock_db, mock_budget_model, mock_project_model):
        """Test successful budget creation."""
        # Mock project query
        mock_project_model.query.get_or_404.return_value = self.mock_project
        
        # Mock budget query (no existing budget)
        mock_budget_model.query.filter_by.return_value.first.return_value = None
        
        # Mock budget creation
        mock_budget = Mock(spec=Budget)
        mock_budget_model.return_value = mock_budget
        
        data = {'allocated_amount': 10000, 'currency': 'USD'}
        result = FinanceService.create_budget(user_id=1, project_id=1, data=data)
        
        assert result == mock_budget
        mock_db.session.add.assert_called_once_with(mock_budget)
        mock_db.session.commit.assert_called_once()
        
    @patch('services.finance_service.Project')
    def test_create_budget_permission_error(self, mock_project_model):
        """Test budget creation with permission error."""
        # Mock project with different members
        mock_project = Mock()
        mock_project.members = [Mock(id=2), Mock(id=3)]  # User 1 not included
        mock_project_model.query.get_or_404.return_value = mock_project
        
        data = {'allocated_amount': 10000}
        with pytest.raises(PermissionError):
            FinanceService.create_budget(user_id=1, project_id=1, data=data)
            
    @patch('services.finance_service.Project')
    @patch('services.finance_service.Budget')
    def test_create_budget_already_exists(self, mock_budget_model, mock_project_model):
        """Test budget creation when budget already exists."""
        # Mock project query
        mock_project_model.query.get_or_404.return_value = self.mock_project
        
        # Mock existing budget
        existing_budget = Mock(spec=Budget)
        mock_budget_model.query.filter_by.return_value.first.return_value = existing_budget
        
        data = {'allocated_amount': 10000}
        with pytest.raises(ValueError, match="Budget already exists"):
            FinanceService.create_budget(user_id=1, project_id=1, data=data)
            
    @patch('services.finance_service.Project')
    @patch('services.finance_service.Expense')
    @patch('services.finance_service.Budget')
    @patch('services.finance_service.db')
    def test_add_expense_success(self, mock_db, mock_budget_model, mock_expense_model, mock_project_model):
        """Test successful expense addition."""
        # Mock project query
        mock_project_model.query.get_or_404.return_value = self.mock_project
        
        # Mock expense creation
        mock_expense = Mock(spec=Expense)
        mock_expense.amount = 500.0
        mock_expense_model.return_value = mock_expense
        
        # Mock budget
        mock_budget = Mock(spec=Budget)
        mock_budget.spent_amount = 1000.0
        mock_budget.allocated_amount = 10000.0
        mock_budget_model.query.filter_by.return_value.first.return_value = mock_budget
        
        data = {
            'amount': 500,
            'description': 'Test expense',
            'category': 'Materials'
        }
        
        result = FinanceService.add_expense(user_id=1, project_id=1, data=data)
        
        assert result == mock_expense
        assert mock_budget.spent_amount == 1500.0  # 1000 + 500
        mock_db.session.add.assert_called_once_with(mock_expense)
        mock_db.session.commit.assert_called_once()
        
    @patch('services.finance_service.Project')
    @patch('services.finance_service.Expense')
    @patch('services.finance_service.Budget')
    @patch('services.finance_service.FinanceService._create_budget_overrun_notification')
    @patch('services.finance_service.db')
    def test_add_expense_budget_overrun(self, mock_db, mock_notification, mock_budget_model, 
                                       mock_expense_model, mock_project_model):
        """Test expense addition that causes budget overrun."""
        # Mock project query
        mock_project_model.query.get_or_404.return_value = self.mock_project
        
        # Mock expense creation
        mock_expense = Mock(spec=Expense)
        mock_expense.amount = 2000.0
        mock_expense_model.return_value = mock_expense
        
        # Mock budget that will be exceeded
        mock_budget = Mock(spec=Budget)
        mock_budget.spent_amount = 9500.0
        mock_budget.allocated_amount = 10000.0
        mock_budget_model.query.filter_by.return_value.first.return_value = mock_budget
        
        data = {'amount': 2000, 'description': 'Large expense'}
        
        FinanceService.add_expense(user_id=1, project_id=1, data=data)
        
        # Verify budget overrun notification was called
        mock_notification.assert_called_once()
        assert mock_budget.spent_amount == 11500.0  # Over budget
        
    @patch('services.finance_service.Project')
    @patch('services.finance_service.Budget')
    @patch('services.finance_service.Expense')
    def test_get_project_financials(self, mock_expense_model, mock_budget_model, mock_project_model):
        """Test getting project financial summary."""
        # Mock project query
        mock_project_model.query.get_or_404.return_value = self.mock_project
        
        # Mock budget
        mock_budget = Mock(spec=Budget)
        mock_budget.to_dict.return_value = {'allocated_amount': 10000, 'spent_amount': 5000}
        mock_budget.remaining_amount = 5000
        mock_budget.utilization_percentage = 50.0
        mock_budget.spent_amount = 5000
        mock_budget.allocated_amount = 10000
        mock_budget_model.query.filter_by.return_value.first.return_value = mock_budget
        
        # Mock expenses
        mock_expenses = []
        for i in range(3):
            expense = Mock(spec=Expense)
            expense.amount = 100.0 * (i + 1)
            expense.category = f'Category{i}'
            expense.to_dict.return_value = {'id': i, 'amount': expense.amount}
            mock_expenses.append(expense)
            
        mock_expense_model.query.filter_by.return_value.all.return_value = mock_expenses
        
        # Mock database session query for monthly expenses
        with patch('services.finance_service.db.session.query') as mock_query:
            mock_query.return_value.filter_by.return_value.group_by.return_value.all.return_value = []
            
            result = FinanceService.get_project_financials(user_id=1, project_id=1)
            
            assert result['project_id'] == 1
            assert result['project_name'] == "Test Project"
            assert result['total_expenses'] == 600.0  # 100 + 200 + 300
            assert result['budget']['allocated_amount'] == 10000
            assert result['remaining_budget'] == 5000
            assert result['budget_utilization'] == 50.0
            assert result['is_over_budget'] == False
            
    @patch('services.finance_service.Budget')
    @patch('services.finance_service.db')
    def test_update_budget(self, mock_db, mock_budget_model):
        """Test budget update."""
        # Mock budget
        mock_budget = Mock(spec=Budget)
        mock_budget.project.members = [Mock(id=1)]
        mock_budget_model.query.get_or_404.return_value = mock_budget
        
        data = {'allocated_amount': 15000, 'currency': 'EUR'}
        result = FinanceService.update_budget(user_id=1, budget_id=1, data=data)
        
        assert result == mock_budget
        assert mock_budget.allocated_amount == 15000
        assert mock_budget.currency == 'EUR'
        mock_db.session.commit.assert_called_once()
        
    @patch('services.finance_service.Budget')
    @patch('services.finance_service.db')
    def test_delete_budget(self, mock_db, mock_budget_model):
        """Test budget deletion."""
        # Mock budget
        mock_budget = Mock(spec=Budget)
        mock_budget.project.members = [Mock(id=1)]
        mock_budget_model.query.get_or_404.return_value = mock_budget
        
        result = FinanceService.delete_budget(user_id=1, budget_id=1)
        
        assert result == True
        mock_db.session.delete.assert_called_once_with(mock_budget)
        mock_db.session.commit.assert_called_once()
        
    @patch('services.finance_service.Expense')
    @patch('services.finance_service.Budget')
    @patch('services.finance_service.db')
    def test_update_expense(self, mock_db, mock_budget_model, mock_expense_model):
        """Test expense update."""
        # Mock expense
        mock_expense = Mock(spec=Expense)
        mock_expense.amount = 500.0
        mock_expense.project.members = [Mock(id=1)]
        mock_expense.project_id = 1
        mock_expense_model.query.get_or_404.return_value = mock_expense
        
        # Mock budget
        mock_budget = Mock(spec=Budget)
        mock_budget.spent_amount = 1000.0
        mock_budget_model.query.filter_by.return_value.first.return_value = mock_budget
        
        data = {'amount': 750, 'description': 'Updated expense'}
        result = FinanceService.update_expense(user_id=1, expense_id=1, data=data)
        
        assert result == mock_expense
        assert mock_expense.amount == 750
        assert mock_expense.description == 'Updated expense'
        # Budget should be updated by difference: 1000 + (750 - 500) = 1250
        assert mock_budget.spent_amount == 1250.0
        
    @patch('services.finance_service.Expense')
    @patch('services.finance_service.Budget')
    @patch('services.finance_service.db')
    def test_delete_expense(self, mock_db, mock_budget_model, mock_expense_model):
        """Test expense deletion."""
        # Mock expense
        mock_expense = Mock(spec=Expense)
        mock_expense.amount = 500.0
        mock_expense.project.members = [Mock(id=1)]
        mock_expense.project_id = 1
        mock_expense_model.query.get_or_404.return_value = mock_expense
        
        # Mock budget
        mock_budget = Mock(spec=Budget)
        mock_budget.spent_amount = 1000.0
        mock_budget_model.query.filter_by.return_value.first.return_value = mock_budget
        
        result = FinanceService.delete_expense(user_id=1, expense_id=1)
        
        assert result == True
        assert mock_budget.spent_amount == 500.0  # 1000 - 500
        mock_db.session.delete.assert_called_once_with(mock_expense)
        mock_db.session.commit.assert_called_once() 