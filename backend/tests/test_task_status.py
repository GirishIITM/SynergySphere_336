"""
Unit tests for Task model with new status_id functionality.
"""

import pytest
from models import Task, Status, Project, User
from extensions import db


class TestTaskStatus:
    """Test cases for Task model status functionality."""

    def test_task_with_status_id(self, app):
        """Test creating a task with status_id."""
        with app.app_context():
            # Initialize default statuses
            Status.initialize_default_statuses()
            
            # Get a status
            status = Status.query.filter_by(name='pending').first()
            assert status is not None
            
            # Create test data
            user = User(username='testuser', email='test@test.com', full_name='Test User')
            db.session.add(user)
            db.session.commit()
            
            project = Project(name='Test Project', owner_id=user.id)
            db.session.add(project)
            db.session.commit()
            
            # Create task with status_id
            task = Task(
                title='Test Task',
                description='Test description',
                project_id=project.id,
                owner_id=user.id,
                status_id=status.id
            )
            db.session.add(task)
            db.session.commit()
            
            assert task.status_id == status.id
            assert task.current_status == 'pending'

    def test_task_current_status_property(self, app):
        """Test the current_status property with different scenarios."""
        with app.app_context():
            # Initialize default statuses
            Status.initialize_default_statuses()
            
            # Create test data
            user = User(username='testuser', email='test@test.com', full_name='Test User')
            db.session.add(user)
            db.session.commit()
            
            project = Project(name='Test Project', owner_id=user.id)
            db.session.add(project)
            db.session.commit()
            
            # Test 1: Task with status_id
            status = Status.query.filter_by(name='in_progress').first()
            task1 = Task(
                title='Task 1',
                project_id=project.id,
                owner_id=user.id,
                status_id=status.id
            )
            db.session.add(task1)
            
            # Test 2: Task without status_id (should default to pending)
            task2 = Task(
                title='Task 2',
                project_id=project.id,
                owner_id=user.id
            )
            db.session.add(task2)
            
            db.session.commit()
            
            assert task1.current_status == 'in_progress'
            assert task2.current_status == 'pending'  # Default

    def test_task_get_status_dict(self, app):
        """Test the get_status_dict method."""
        with app.app_context():
            # Initialize default statuses
            Status.initialize_default_statuses()
            
            # Create test data
            user = User(username='testuser', email='test@test.com', full_name='Test User')
            db.session.add(user)
            db.session.commit()
            
            project = Project(name='Test Project', owner_id=user.id)
            db.session.add(project)
            db.session.commit()
            
            # Test with status_id
            status = Status.query.filter_by(name='completed').first()
            task = Task(
                title='Test Task',
                project_id=project.id,
                owner_id=user.id,
                status_id=status.id
            )
            db.session.add(task)
            db.session.commit()
            
            status_dict = task.get_status_dict()
            
            assert status_dict['id'] == status.id
            assert status_dict['name'] == 'completed'
            assert status_dict['color'] == '#10B981'

    def test_task_to_dict_with_status_info(self, app):
        """Test task.to_dict includes status information."""
        with app.app_context():
            # Initialize default statuses
            Status.initialize_default_statuses()
            
            # Create test data
            user = User(username='testuser', email='test@test.com', full_name='Test User')
            db.session.add(user)
            db.session.commit()
            
            project = Project(name='Test Project', owner_id=user.id)
            db.session.add(project)
            db.session.commit()
            
            # Create task with status_id
            status = Status.query.filter_by(name='in_progress').first()
            task = Task(
                title='Test Task',
                project_id=project.id,
                owner_id=user.id,
                status_id=status.id
            )
            db.session.add(task)
            db.session.commit()
            
            task_dict = task.to_dict()
            
            assert 'status' in task_dict
            assert 'status_id' in task_dict
            assert 'status_info' in task_dict
            
            assert task_dict['status'] == 'in_progress'
            assert task_dict['status_id'] == status.id
            assert task_dict['status_info']['name'] == 'in_progress'

    def test_task_backward_compatibility(self, app):
        """Test that tasks without status_id still work (backward compatibility)."""
        with app.app_context():
            # Create test data
            user = User(username='testuser', email='test@test.com', full_name='Test User')
            db.session.add(user)
            db.session.commit()
            
            project = Project(name='Test Project', owner_id=user.id)
            db.session.add(project)
            db.session.commit()
            
            # Create task without status_id (legacy)
            task = Task(
                title='Legacy Task',
                project_id=project.id,
                owner_id=user.id
            )
            db.session.add(task)
            db.session.commit()
            
            # Should use fallback behavior
            assert task.current_status == 'pending'
            
            task_dict = task.to_dict()
            assert task_dict['status'] == 'pending'
            assert 'status_info' in task_dict