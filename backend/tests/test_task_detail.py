"""
Unit tests for task detail functionality including budget and expense features.
"""
import pytest
from decimal import Decimal
from flask import json
from models import Task, User, Project, Expense
from extensions import db
from utils.datetime_utils import get_utc_now
from datetime import datetime


class TestTaskDetail:
    """Test suite for task detail functionality."""

    @pytest.fixture
    def test_user(self, app):
        """Create a test user."""
        with app.app_context():
            user = User(
                email='test@example.com',
                username='testuser',
                full_name='Test User',
                password_hash='hashed_password'
            )
            db.session.add(user)
            db.session.commit()
            return user

    @pytest.fixture
    def test_project(self, app, test_user):
        """Create a test project."""
        with app.app_context():
            project = Project(
                name='Test Project',
                description='A test project',
                owner_id=test_user.id
            )
            db.session.add(project)
            db.session.commit()
            
            # Add user as member
            project.members.append(test_user)
            db.session.commit()
            
            return project

    @pytest.fixture
    def test_task(self, app, test_project, test_user):
        """Create a test task with budget."""
        with app.app_context():
            task = Task(
                title='Test Task',
                description='A test task with budget',
                project_id=test_project.id,
                owner_id=test_user.id,
                budget=1000.0,
                priority_score=5.0,
                estimated_effort=10,
                percent_complete=25
            )
            db.session.add(task)
            db.session.commit()
            return task

    @pytest.fixture
    def test_expenses(self, app, test_task, test_user):
        """Create test expenses for the task."""
        with app.app_context():
            expenses = []
            expense_data = [
                {'amount': 250.0, 'description': 'Development tools', 'category': 'Software'},
                {'amount': 150.0, 'description': 'Design resources', 'category': 'Design'},
                {'amount': 100.0, 'description': 'Marketing materials', 'category': 'Marketing'}
            ]
            
            for data in expense_data:
                expense = Expense(
                    project_id=test_task.project_id,
                    task_id=test_task.id,
                    amount=data['amount'],
                    description=data['description'],
                    category=data['category'],
                    created_by=test_user.id,
                    incurred_at=get_utc_now()
                )
                db.session.add(expense)
                expenses.append(expense)
            
            db.session.commit()
            return expenses

    def test_get_task_detail_success(self, client, auth_headers, test_task, test_expenses):
        """Test successful retrieval of task details with financial information."""
        response = client.get(
            f'/tasks/{test_task.id}',
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = json.loads(response.data)
        
        # Verify basic task information
        assert data['id'] == test_task.id
        assert data['title'] == test_task.title
        assert data['description'] == test_task.description
        assert data['budget'] == test_task.budget
        assert data['priority_score'] == test_task.priority_score
        assert data['estimated_effort'] == test_task.estimated_effort
        assert data['percent_complete'] == test_task.percent_complete
        
        # Verify financial calculations
        expected_total_spent = 500.0  # 250 + 150 + 100
        assert data['total_spent'] == expected_total_spent
        assert data['budget_remaining'] == 500.0  # 1000 - 500
        assert data['budget_utilization'] == 50.0  # 500/1000 * 100
        
        # Verify expenses are included
        assert 'expenses' in data
        assert len(data['expenses']) == 3
        
        # Verify expense details
        expense_descriptions = [exp['description'] for exp in data['expenses']]
        assert 'Development tools' in expense_descriptions
        assert 'Design resources' in expense_descriptions
        assert 'Marketing materials' in expense_descriptions

    def test_get_task_detail_without_budget(self, client, auth_headers, test_project, test_user):
        """Test task detail for task without budget."""
        # Create task without budget
        task = Task(
            title='No Budget Task',
            description='Task without budget',
            project_id=test_project.id,
            owner_id=test_user.id,
            budget=None
        )
        db.session.add(task)
        db.session.commit()
        
        response = client.get(f'/tasks/{task.id}', headers=auth_headers)
        
        assert response.status_code == 200
        data = json.loads(response.data)
        
        assert data['budget'] is None
        assert data['total_spent'] == 0
        assert data['budget_remaining'] is None
        assert data['budget_utilization'] == 0

    def test_get_task_detail_unauthorized(self, client, test_task):
        """Test unauthorized access to task details."""
        response = client.get(f'/tasks/{test_task.id}')
        assert response.status_code == 401

    def test_get_task_detail_not_found(self, client, auth_headers):
        """Test task detail for non-existent task."""
        response = client.get('/tasks/9999', headers=auth_headers)
        assert response.status_code == 404

    def test_get_task_detail_no_project_access(self, app, client, test_user):
        """Test task detail when user is not a project member."""
        with app.app_context():
            # Create another user
            other_user = User(
                email='other@example.com',
                full_name='Other User',
                password_hash='hashed_password'
            )
            db.session.add(other_user)
            
            # Create project owned by other user
            other_project = Project(
                name='Other Project',
                description='Project owned by other user',
                owner_id=other_user.id
            )
            db.session.add(other_project)
            
            # Create task in other project
            other_task = Task(
                title='Other Task',
                description='Task in other project',
                project_id=other_project.id,
                owner_id=other_user.id
            )
            db.session.add(other_task)
            db.session.commit()
            
            # Create auth headers for test_user
            from flask_jwt_extended import create_access_token
            token = create_access_token(identity=str(test_user.id))
            auth_headers = {'Authorization': f'Bearer {token}'}
            
            response = client.get(f'/tasks/{other_task.id}', headers=auth_headers)
            assert response.status_code == 403

    def test_budget_utilization_calculation(self, client, auth_headers, test_task):
        """Test budget utilization calculations with various scenarios."""
        # Test with expenses exceeding budget
        expense = Expense(
            project_id=test_task.project_id,
            task_id=test_task.id,
            amount=1500.0,  # Exceeds budget of 1000
            description='Expensive item',
            category='Equipment',
            created_by=test_task.owner_id,
            incurred_at=get_utc_now()
        )
        db.session.add(expense)
        db.session.commit()
        
        response = client.get(f'/tasks/{test_task.id}', headers=auth_headers)
        data = json.loads(response.data)
        
        assert data['total_spent'] == 1500.0
        assert data['budget_remaining'] == -500.0  # Negative remaining
        assert data['budget_utilization'] == 150.0  # Over budget

    def test_task_detail_includes_attachments(self, client, auth_headers, test_task):
        """Test that task detail includes attachment information."""
        from models import TaskAttachment
        
        # Add attachment to task
        attachment = TaskAttachment(
            task_id=test_task.id,
            file_url='https://example.com/file.pdf',
            uploaded_at=get_utc_now()
        )
        db.session.add(attachment)
        db.session.commit()
        
        response = client.get(f'/tasks/{test_task.id}', headers=auth_headers)
        data = json.loads(response.data)
        
        assert 'attachments' in data
        assert len(data['attachments']) == 1
        assert data['attachments'][0]['file_url'] == 'https://example.com/file.pdf'

    def test_task_detail_includes_overdue_status(self, app, client, auth_headers, test_project, test_user):
        """Test that task detail correctly indicates overdue status."""
        from datetime import datetime, timedelta
        from utils.datetime_utils import ensure_utc
        
        with app.app_context():
            # Create overdue task
            past_date = ensure_utc(datetime.utcnow() - timedelta(days=1))
            overdue_task = Task(
                title='Overdue Task',
                description='This task is overdue',
                project_id=test_project.id,
                owner_id=test_user.id,
                due_date=past_date
            )
            db.session.add(overdue_task)
            db.session.commit()
            
            response = client.get(f'/tasks/{overdue_task.id}', headers=auth_headers)
            data = json.loads(response.data)
            
            assert data['is_overdue'] is True

    def test_task_detail_includes_project_name(self, client, auth_headers, test_task):
        """Test that task detail includes project name."""
        response = client.get(f'/tasks/{test_task.id}', headers=auth_headers)
        data = json.loads(response.data)
        
        assert 'project_name' in data
        assert data['project_name'] == 'Test Project'

    def test_task_detail_includes_assignee_name(self, client, auth_headers, test_task):
        """Test that task detail includes assignee name."""
        response = client.get(f'/tasks/{test_task.id}', headers=auth_headers)
        data = json.loads(response.data)
        
        assert 'assignee' in data
        assert data['assignee'] == 'Test User'

    def test_task_detail_dependency_count(self, app, client, auth_headers, test_task, test_user):
        """Test that task detail includes dependency count."""
        with app.app_context():
            # Create subtask
            subtask = Task(
                title='Subtask',
                description='A subtask',
                project_id=test_task.project_id,
                owner_id=test_user.id,
                parent_task_id=test_task.id
            )
            db.session.add(subtask)
            db.session.commit()
            
            response = client.get(f'/tasks/{test_task.id}', headers=auth_headers)
            data = json.loads(response.data)
            
            assert data['dependency_count'] == 1

    def test_expense_data_completeness(self, client, auth_headers, test_task, test_expenses):
        """Test that expense data includes all necessary fields."""
        response = client.get(f'/tasks/{test_task.id}', headers=auth_headers)
        data = json.loads(response.data)
        
        for expense in data['expenses']:
            # Verify all required fields are present
            required_fields = [
                'id', 'project_id', 'task_id', 'amount', 'description', 
                'category', 'incurred_at', 'created_by', 'created_by_name'
            ]
            for field in required_fields:
                assert field in expense, f"Missing field: {field}"
            
            # Verify data types and values
            assert isinstance(expense['amount'], (int, float))
            assert expense['amount'] > 0
            assert expense['task_id'] == test_task.id
            assert expense['created_by_name'] == 'Test User'

    def test_task_detail_view_button_navigation(self, client, auth_headers, test_task, test_user, test_project):
        """
        Test that view details button correctly navigates to task detail page.
        
        This test verifies that:
        1. Task detail endpoint returns correct task data
        2. All necessary fields are present for the view details functionality
        """
        # Test task detail endpoint - this is what the view details button calls
        response = client.get(
            f'/tasks/{test_task.id}',
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = json.loads(response.data)
        
        # Verify all required fields are present for view details page
        required_fields = [
            'id', 'title', 'description', 'status', 'due_date',
            'assigned_to', 'project_id', 'project_name',
            'budget', 'total_spent', 'budget_remaining', 'budget_utilization',
            'priority_score', 'percent_complete', 'estimated_effort',
            'created_at', 'is_overdue'
        ]
        
        for field in required_fields:
            assert field in data, f"Missing required field: {field}"
        
        # Verify data integrity
        assert data['title'] == test_task.title
        assert data['description'] == test_task.description
        assert data['budget'] == test_task.budget
        assert data['project_name'] == test_project.name
        
        # Verify financial data structure for expenses
        assert 'expenses' in data
        assert isinstance(data['expenses'], list)

    def test_view_details_with_expenses_and_budget(self, client, auth_headers, test_task, test_expenses):
        """
        Test view details functionality with task that has budget and expenses.
        """
        # Get task details and verify budget calculations
        response = client.get(
            f'/tasks/{test_task.id}',
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = json.loads(response.data)
        
        # Verify budget calculations
        assert data['budget'] == 1000.0  # From test_task fixture
        assert data['total_spent'] == 500.0  # From test_expenses fixture (250+150+100)
        assert data['budget_remaining'] == 500.0
        assert data['budget_utilization'] == 50.0  # 500/1000 * 100
        
        # Verify expenses are included
        assert len(data['expenses']) == 3
        expense_amounts = [exp['amount'] for exp in data['expenses']]
        assert 250.0 in expense_amounts
        assert 150.0 in expense_amounts
        assert 100.0 in expense_amounts 