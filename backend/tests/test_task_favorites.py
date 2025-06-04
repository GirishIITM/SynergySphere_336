"""
Unit tests for task favorite functionality
Tests the new is_favorite field and /tasks/{id}/favorite endpoint
"""

import pytest
import json
from extensions import db
from models.task import Task, TaskStatus
from models.user import User
from models.project import Project
from tests.conftest import client, test_user, test_project, test_task


class TestTaskFavorites:
    """Test class for task favorite functionality"""
    
    def test_update_task_favorite_success(self, client, test_user, test_task):
        """
        Test successful favorite status update
        
        Expected use case: User marks a task as favorite
        """
        # Login first
        login_response = client.post('/auth/login', json={
            'email': test_user.email,
            'password': 'testpassword123'
        })
        
        token = json.loads(login_response.data)['access_token']
        headers = {'Authorization': f'Bearer {token}'}
        
        # Update task to favorite
        response = client.put(f'/tasks/{test_task.id}/favorite', 
                            json={'is_favorite': True},
                            headers=headers)
        
        assert response.status_code == 200
        response_data = json.loads(response.data)
        assert response_data['msg'] == 'Task favorite status updated'
        assert response_data['is_favorite'] is True
        
        # Verify database was updated
        updated_task = Task.query.get(test_task.id)
        assert updated_task.is_favorite is True
    
    def test_update_task_unfavorite_success(self, client, test_user, test_task):
        """
        Test successful unfavorite status update
        
        Expected use case: User removes task from favorites
        """
        # Set task as favorite first
        test_task.is_favorite = True
        db.session.commit()
        
        # Login first
        login_response = client.post('/auth/login', json={
            'email': test_user.email,
            'password': 'testpassword123'
        })
        
        token = json.loads(login_response.data)['access_token']
        headers = {'Authorization': f'Bearer {token}'}
        
        # Update task to unfavorite
        response = client.put(f'/tasks/{test_task.id}/favorite', 
                            json={'is_favorite': False},
                            headers=headers)
        
        assert response.status_code == 200
        response_data = json.loads(response.data)
        assert response_data['msg'] == 'Task favorite status updated'
        assert response_data['is_favorite'] is False
        
        # Verify database was updated
        updated_task = Task.query.get(test_task.id)
        assert updated_task.is_favorite is False
    
    def test_update_task_favorite_missing_field(self, client, test_user, test_task):
        """
        Test favorite update with missing is_favorite field
        
        Edge case: Request without required field
        """
        # Login first
        login_response = client.post('/auth/login', json={
            'email': test_user.email,
            'password': 'testpassword123'
        })
        
        token = json.loads(login_response.data)['access_token']
        headers = {'Authorization': f'Bearer {token}'}
        
        # Update task without is_favorite field
        response = client.put(f'/tasks/{test_task.id}/favorite', 
                            json={},
                            headers=headers)
        
        assert response.status_code == 400
        response_data = json.loads(response.data)
        assert 'is_favorite field is required' in response_data['msg']
    
    def test_update_task_favorite_unauthorized(self, client, test_user):
        """
        Test favorite update without authentication
        
        Failure case: Unauthenticated request
        """
        # Create a task for testing
        task = Task(
            title='Test Task',
            description='Test Description',
            status=TaskStatus.pending,
            project_id=1,
            owner_id=test_user.id
        )
        db.session.add(task)
        db.session.commit()
        
        # Update task without authentication
        response = client.put(f'/tasks/{task.id}/favorite', 
                            json={'is_favorite': True})
        
        assert response.status_code == 401
    
    def test_update_task_favorite_not_found(self, client, test_user):
        """
        Test favorite update for non-existent task
        
        Edge case: Task doesn't exist
        """
        # Login first
        login_response = client.post('/auth/login', json={
            'email': test_user.email,
            'password': 'testpassword123'
        })
        
        token = json.loads(login_response.data)['access_token']
        headers = {'Authorization': f'Bearer {token}'}
        
        # Update non-existent task
        response = client.put('/tasks/99999/favorite', 
                            json={'is_favorite': True},
                            headers=headers)
        
        assert response.status_code == 404
    
    def test_get_tasks_includes_favorite_field(self, client, test_user, test_task):
        """
        Test that get_all_tasks includes is_favorite field
        
        Expected use case: Frontend needs favorite status for all tasks
        """
        # Set task as favorite
        test_task.is_favorite = True
        db.session.commit()
        
        # Login first
        login_response = client.post('/auth/login', json={
            'email': test_user.email,
            'password': 'testpassword123'
        })
        
        token = json.loads(login_response.data)['access_token']
        headers = {'Authorization': f'Bearer {token}'}
        
        # Get all tasks
        response = client.get('/tasks', headers=headers)
        
        assert response.status_code == 200
        tasks_data = json.loads(response.data)
        
        # Find our test task
        test_task_data = next(
            (task for task in tasks_data if task['id'] == test_task.id), 
            None
        )
        
        assert test_task_data is not None
        assert 'is_favorite' in test_task_data
        assert test_task_data['is_favorite'] is True
    
    def test_get_single_task_includes_favorite_field(self, client, test_user, test_task):
        """
        Test that get_task includes is_favorite field
        
        Expected use case: Task detail view needs favorite status
        """
        # Set task as favorite
        test_task.is_favorite = True
        db.session.commit()
        
        # Login first
        login_response = client.post('/auth/login', json={
            'email': test_user.email,
            'password': 'testpassword123'
        })
        
        token = json.loads(login_response.data)['access_token']
        headers = {'Authorization': f'Bearer {token}'}
        
        # Get single task
        response = client.get(f'/tasks/{test_task.id}', headers=headers)
        
        assert response.status_code == 200
        response_data = json.loads(response.data)
        
        assert 'data' in response_data
        task_data = response_data['data']
        assert 'is_favorite' in task_data
        assert task_data['is_favorite'] is True
    
    def test_task_model_default_favorite_value(self):
        """
        Test that new tasks have is_favorite defaulting to False
        
        Expected use case: New tasks are not favorited by default
        """
        task = Task(
            title='Test Task',
            description='Test Description',
            status=TaskStatus.pending,
            project_id=1,
            owner_id=1
        )
        
        # Default value should be False
        assert task.is_favorite is False
    
    def test_task_to_dict_includes_favorite(self):
        """
        Test that Task.to_dict() includes is_favorite field
        
        Expected use case: Serialization includes favorite status
        """
        task = Task(
            title='Test Task',
            description='Test Description',
            status=TaskStatus.pending,
            project_id=1,
            owner_id=1,
            is_favorite=True
        )
        
        task_dict = task.to_dict()
        
        assert 'is_favorite' in task_dict
        assert task_dict['is_favorite'] is True 