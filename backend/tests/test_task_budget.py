"""
Test cases for task budget functionality.
"""

import pytest
import json
from app import create_app
from extensions import db
from models import User, Project, Task, Membership


@pytest.fixture
def app():
    """Create and configure a test app."""
    app = create_app()
    app.config['TESTING'] = True
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    
    with app.app_context():
        db.create_all()
        yield app
        db.drop_all()


@pytest.fixture
def client(app):
    """Create a test client."""
    return app.test_client()


@pytest.fixture
def auth_headers(client, app):
    """Create authentication headers for test requests."""
    with app.app_context():
        # Create a test user
        user = User(username='testuser', email='test@example.com')
        user.set_password('testpass')
        db.session.add(user)
        db.session.commit()
        
        # Login to get JWT token
        response = client.post('/auth/login', 
                              json={'email': 'test@example.com', 'password': 'testpass'})
        data = json.loads(response.data)
        token = data['access_token']
        
        return {'Authorization': f'Bearer {token}'}


@pytest.fixture
def project(app, auth_headers):
    """Create a test project."""
    with app.app_context():
        user = User.query.filter_by(email='test@example.com').first()
        project = Project(name='Test Project', description='Test project', owner_id=user.id)
        db.session.add(project)
        db.session.commit()
        
        # Add user as member
        membership = Membership(user_id=user.id, project_id=project.id, is_owner=True)
        db.session.add(membership)
        db.session.commit()
        
        return project


def test_create_task_with_budget(client, auth_headers, project):
    """Test creating a task with budget field."""
    task_data = {
        'project_id': project.id,
        'title': 'Test Task with Budget',
        'description': 'A task with a budget allocation',
        'due_date': '2024-12-31T23:59:59Z',
        'status': 'pending',
        'budget': 500.50
    }
    
    response = client.post('/tasks', 
                          json=task_data, 
                          headers=auth_headers)
    
    assert response.status_code == 201
    data = json.loads(response.data)
    assert 'task_id' in data
    
    # Verify task was created with budget
    task = Task.query.get(data['task_id'])
    assert task is not None
    assert task.budget == 500.50
    assert task.title == 'Test Task with Budget'


def test_create_task_without_budget(client, auth_headers, project):
    """Test creating a task without budget field (should be None)."""
    task_data = {
        'project_id': project.id,
        'title': 'Test Task without Budget',
        'description': 'A task without budget allocation',
        'due_date': '2024-12-31T23:59:59Z',
        'status': 'pending'
    }
    
    response = client.post('/tasks', 
                          json=task_data, 
                          headers=auth_headers)
    
    assert response.status_code == 201
    data = json.loads(response.data)
    
    # Verify task was created without budget
    task = Task.query.get(data['task_id'])
    assert task is not None
    assert task.budget is None


def test_create_task_with_invalid_budget(client, auth_headers, project):
    """Test creating a task with invalid budget should fail."""
    task_data = {
        'project_id': project.id,
        'title': 'Test Task with Invalid Budget',
        'description': 'A task with invalid budget',
        'due_date': '2024-12-31T23:59:59Z',
        'status': 'pending',
        'budget': -100  # Negative budget should be invalid
    }
    
    response = client.post('/tasks', 
                          json=task_data, 
                          headers=auth_headers)
    
    assert response.status_code == 400
    data = json.loads(response.data)
    assert 'Budget must be a positive number' in data['msg']


def test_update_task_budget(client, auth_headers, project):
    """Test updating a task's budget."""
    # First create a task
    task = Task(
        title='Test Task', 
        description='Test', 
        project_id=project.id,
        owner_id=1,
        budget=100.0
    )
    db.session.add(task)
    db.session.commit()
    
    # Update the budget
    update_data = {'budget': 250.75}
    
    response = client.put(f'/tasks/{task.id}', 
                         json=update_data, 
                         headers=auth_headers)
    
    assert response.status_code == 200
    
    # Verify budget was updated
    updated_task = Task.query.get(task.id)
    assert updated_task.budget == 250.75


def test_get_task_includes_budget(client, auth_headers, project):
    """Test that getting a task includes budget in response."""
    # Create a task with budget
    task = Task(
        title='Test Task', 
        description='Test', 
        project_id=project.id,
        owner_id=1,
        budget=123.45
    )
    db.session.add(task)
    db.session.commit()
    
    response = client.get(f'/tasks/{task.id}', headers=auth_headers)
    
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['budget'] == 123.45 