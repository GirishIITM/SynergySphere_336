"""
Pytest configuration and shared fixtures for backend tests.
"""
import pytest
import tempfile
import os
from flask import Flask
from flask_jwt_extended import create_access_token
from extensions import db, jwt
from models import User, Project, Task, Budget, Expense, TaskAttachment
from config import Config


class TestConfig(Config):
    """Test configuration class."""
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    WTF_CSRF_ENABLED = False
    JWT_SECRET_KEY = 'test-secret-key'
    SECRET_KEY = 'test-secret'


@pytest.fixture
def app():
    """Create and configure a test Flask application."""
    app = Flask(__name__)
    app.config.from_object(TestConfig)
    
    # Initialize extensions
    db.init_app(app)
    jwt.init_app(app)
    
    # Register blueprints
    from routes.auth import auth_bp
    from routes.task import task_bp
    from routes.project import project_bp
    from routes.finance import finance_bp
    
    app.register_blueprint(auth_bp, url_prefix='/auth')
    app.register_blueprint(task_bp)
    app.register_blueprint(project_bp)
    app.register_blueprint(finance_bp, url_prefix='/finance')
    
    with app.app_context():
        db.create_all()
        yield app
        db.drop_all()


@pytest.fixture
def client(app):
    """Create a test client for the Flask application."""
    return app.test_client()


@pytest.fixture
def runner(app):
    """Create a test runner for the Flask application."""
    return app.test_cli_runner()


@pytest.fixture
def test_user(app):
    """Create a test user."""
    with app.app_context():
        user = User(
            email='test@example.com',
            full_name='Test User',
            password_hash='hashed_password'
        )
        db.session.add(user)
        db.session.commit()
        
        # Refresh the user object to get the id
        db.session.refresh(user)
        return user


@pytest.fixture
def auth_headers(app, test_user):
    """Create authentication headers for test requests."""
    with app.app_context():
        token = create_access_token(identity=str(test_user.id))
        return {'Authorization': f'Bearer {token}'}


@pytest.fixture
def test_project(app, test_user):
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
        
        # Refresh the project object
        db.session.refresh(project)
        return project


@pytest.fixture
def test_task(app, test_project, test_user):
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
        
        # Refresh the task object
        db.session.refresh(task)
        return task


@pytest.fixture
def test_budget(app, test_project, test_user):
    """Create a test budget."""
    with app.app_context():
        budget = Budget(
            project_id=test_project.id,
            allocated_amount=10000.0,
            currency='USD',
            created_by=test_user.id
        )
        db.session.add(budget)
        db.session.commit()
        
        # Refresh the budget object
        db.session.refresh(budget)
        return budget


@pytest.fixture
def test_expense(app, test_project, test_user, test_task):
    """Create a test expense."""
    with app.app_context():
        expense = Expense(
            project_id=test_project.id,
            task_id=test_task.id,
            amount=250.0,
            description='Test expense',
            category='Software',
            created_by=test_user.id
        )
        db.session.add(expense)
        db.session.commit()
        
        # Refresh the expense object
        db.session.refresh(expense)
        return expense


@pytest.fixture
def test_attachment(app, test_task):
    """Create a test task attachment."""
    with app.app_context():
        attachment = TaskAttachment(
            task_id=test_task.id,
            file_url='https://example.com/test-file.pdf'
        )
        db.session.add(attachment)
        db.session.commit()
        
        # Refresh the attachment object
        db.session.refresh(attachment)
        return attachment


@pytest.fixture
def multiple_tasks(app, test_project, test_user):
    """Create multiple test tasks."""
    with app.app_context():
        tasks = []
        task_data = [
            {'title': 'Task 1', 'budget': 500.0, 'status': 'pending'},
            {'title': 'Task 2', 'budget': 750.0, 'status': 'in_progress'},
            {'title': 'Task 3', 'budget': None, 'status': 'completed'}
        ]
        
        for data in task_data:
            task = Task(
                title=data['title'],
                description=f"Description for {data['title']}",
                project_id=test_project.id,
                owner_id=test_user.id,
                budget=data['budget'],
                status=data['status']
            )
            db.session.add(task)
            tasks.append(task)
        
        db.session.commit()
        
        # Refresh all task objects
        for task in tasks:
            db.session.refresh(task)
        
        return tasks


@pytest.fixture
def multiple_expenses(app, test_project, test_user, test_task):
    """Create multiple test expenses."""
    with app.app_context():
        expenses = []
        expense_data = [
            {'amount': 250.0, 'description': 'Development tools', 'category': 'Software'},
            {'amount': 150.0, 'description': 'Design resources', 'category': 'Design'},
            {'amount': 100.0, 'description': 'Marketing materials', 'category': 'Marketing'}
        ]
        
        for data in expense_data:
            expense = Expense(
                project_id=test_project.id,
                task_id=test_task.id,
                amount=data['amount'],
                description=data['description'],
                category=data['category'],
                created_by=test_user.id
            )
            db.session.add(expense)
            expenses.append(expense)
        
        db.session.commit()
        
        # Refresh all expense objects
        for expense in expenses:
            db.session.refresh(expense)
        
        return expenses 