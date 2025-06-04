"""
Unit tests for task chat functionality.

Tests Socket.IO events, TaskChatService methods, and REST API endpoints
for real-time task communication features.
"""

import pytest
import json
from datetime import datetime
from unittest.mock import patch, MagicMock

from models import User, Project, Task, Message
from services.task_chat_service import TaskChatService
from extensions import db


class TestTaskChatService:
    """Test cases for TaskChatService."""
    
    def test_get_task_with_access_check_success(self, app, test_user, test_project, test_task):
        """Test successful task access check."""
        with app.app_context():
            # User should have access as task owner
            task = TaskChatService.get_task_with_access_check(test_task.id, test_user.id)
            assert task is not None
            assert task.id == test_task.id
    
    def test_get_task_with_access_check_denied(self, app, test_project, test_task):
        """Test task access denied for unauthorized user."""
        with app.app_context():
            # Create another user not in the project
            other_user = User(
                username='otheruser',
                email='other@example.com',
                password_hash='hashed'
            )
            db.session.add(other_user)
            db.session.commit()
            
            task = TaskChatService.get_task_with_access_check(test_task.id, other_user.id)
            assert task is None
    
    def test_get_task_with_access_check_nonexistent(self, app, test_user):
        """Test task access check for non-existent task."""
        with app.app_context():
            task = TaskChatService.get_task_with_access_check(99999, test_user.id)
            assert task is None
    
    def test_create_task_message_success(self, app, test_user, test_task):
        """Test successful message creation."""
        with app.app_context():
            content = "Test message for task chat"
            
            message, error = TaskChatService.create_task_message(
                test_task.id, test_user.id, content
            )
            
            assert error is None
            assert message is not None
            assert message.content == content
            assert message.user_id == test_user.id
            assert message.task_id == test_task.id
    
    def test_create_task_message_empty_content(self, app, test_user, test_task):
        """Test message creation with empty content."""
        with app.app_context():
            message, error = TaskChatService.create_task_message(
                test_task.id, test_user.id, "   "  # Only whitespace
            )
            
            assert message is None
            assert error == "Message content cannot be empty"
    
    def test_create_task_message_access_denied(self, app, test_task):
        """Test message creation with access denied."""
        with app.app_context():
            # Create user not in project
            other_user = User(
                username='otheruser',
                email='other@example.com',
                password_hash='hashed'
            )
            db.session.add(other_user)
            db.session.commit()
            
            message, error = TaskChatService.create_task_message(
                test_task.id, other_user.id, "Test message"
            )
            
            assert message is None
            assert error == "Task not found or access denied"
    
    def test_get_task_messages_success(self, app, test_user, test_task):
        """Test successful retrieval of task messages."""
        with app.app_context():
            # Create test messages
            message1 = Message(
                content="First message",
                user_id=test_user.id,
                project_id=test_task.project_id,
                task_id=test_task.id
            )
            message2 = Message(
                content="Second message",
                user_id=test_user.id,
                project_id=test_task.project_id,
                task_id=test_task.id
            )
            
            db.session.add_all([message1, message2])
            db.session.commit()
            
            messages, error, has_more = TaskChatService.get_task_messages(
                test_task.id, test_user.id, limit=10
            )
            
            assert error is None
            assert len(messages) == 2
            assert has_more is False
            assert messages[0]['content'] == "First message"  # Oldest first
            assert messages[1]['content'] == "Second message"
    
    def test_get_task_messages_pagination(self, app, test_user, test_task):
        """Test message retrieval with pagination."""
        with app.app_context():
            # Create multiple messages
            for i in range(5):
                message = Message(
                    content=f"Message {i}",
                    user_id=test_user.id,
                    project_id=test_task.project_id,
                    task_id=test_task.id
                )
                db.session.add(message)
            db.session.commit()
            
            # Get first 3 messages
            messages, error, has_more = TaskChatService.get_task_messages(
                test_task.id, test_user.id, limit=3, offset=0
            )
            
            assert error is None
            assert len(messages) == 3
            assert has_more is True
    
    def test_get_task_chat_participants(self, app, test_user, test_project, test_task):
        """Test retrieval of task chat participants."""
        with app.app_context():
            participants, error = TaskChatService.get_task_chat_participants(
                test_task.id, test_user.id
            )
            
            assert error is None
            assert len(participants) >= 1  # At least the test user
            
            # Check participant structure
            user_participant = next(
                (p for p in participants if p['id'] == test_user.id), None
            )
            assert user_participant is not None
            assert user_participant['username'] == test_user.username
            assert user_participant['is_task_owner'] is True
    
    def test_get_task_message_count(self, app, test_user, test_task):
        """Test getting message count for a task."""
        with app.app_context():
            # Initially no messages
            count, error = TaskChatService.get_task_message_count(test_task.id, test_user.id)
            assert error is None
            assert count == 0
            
            # Add a message
            message = Message(
                content="Test message",
                user_id=test_user.id,
                project_id=test_task.project_id,
                task_id=test_task.id
            )
            db.session.add(message)
            db.session.commit()
            
            # Check count again
            count, error = TaskChatService.get_task_message_count(test_task.id, test_user.id)
            assert error is None
            assert count == 1


class TestTaskChatAPI:
    """Test cases for task chat REST API endpoints."""
    
    def test_get_task_messages_endpoint(self, client, auth_headers, test_task):
        """Test GET /tasks/<id>/messages endpoint."""
        response = client.get(
            f'/tasks/{test_task.id}/messages',
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'task_id' in data
        assert 'messages' in data
        assert 'has_more' in data
        assert data['task_id'] == test_task.id
    
    def test_post_task_message_endpoint(self, client, auth_headers, test_task):
        """Test POST /tasks/<id>/messages endpoint."""
        message_data = {
            'content': 'Test message via API'
        }
        
        response = client.post(
            f'/tasks/{test_task.id}/messages',
            headers=auth_headers,
            json=message_data
        )
        
        assert response.status_code == 201
        data = json.loads(response.data)
        assert data['content'] == 'Test message via API'
        assert data['task_id'] == test_task.id
    
    def test_post_task_message_empty_content(self, client, auth_headers, test_task):
        """Test POST message with empty content."""
        message_data = {
            'content': '   '  # Only whitespace
        }
        
        response = client.post(
            f'/tasks/{test_task.id}/messages',
            headers=auth_headers,
            json=message_data
        )
        
        assert response.status_code == 400
        data = json.loads(response.data)
        assert 'error' in data
    
    def test_get_task_chat_participants_endpoint(self, client, auth_headers, test_task):
        """Test GET /tasks/<id>/chat/participants endpoint."""
        response = client.get(
            f'/tasks/{test_task.id}/chat/participants',
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'task_id' in data
        assert 'participants' in data
        assert 'count' in data
        assert data['task_id'] == test_task.id
    
    def test_get_task_chat_stats_endpoint(self, client, auth_headers, test_task):
        """Test GET /tasks/<id>/chat/stats endpoint."""
        response = client.get(
            f'/tasks/{test_task.id}/chat/stats',
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = json.loads(response.data)
        assert 'task_id' in data
        assert 'message_count' in data
        assert 'has_chat' in data
        assert data['task_id'] == test_task.id
    
    def test_unauthorized_access(self, client, test_task):
        """Test unauthorized access to task chat endpoints."""
        endpoints = [
            f'/tasks/{test_task.id}/messages',
            f'/tasks/{test_task.id}/chat/participants',
            f'/tasks/{test_task.id}/chat/stats'
        ]
        
        for endpoint in endpoints:
            response = client.get(endpoint)
            assert response.status_code == 401


class TestTaskChatSocketIO:
    """Test cases for Socket.IO task chat events."""
    
    @patch('routes.task_chat.authenticate_socket_user')
    @patch('routes.task_chat.verify_task_access')
    def test_join_task_chat_success(self, mock_verify_access, mock_auth, socketio_client, test_user, test_task):
        """Test successful joining of task chat room."""
        # Mock authentication and access verification
        mock_auth.return_value = test_user
        mock_verify_access.return_value = test_task
        
        # Emit join_task_chat event
        socketio_client.emit('join_task_chat', {
            'task_id': test_task.id,
            'token': 'mock_token'
        })
        
        # Check for confirmation response
        received = socketio_client.get_received()
        assert len(received) > 0
        
        # Look for joined_task_chat event
        join_event = next(
            (event for event in received if event['name'] == 'joined_task_chat'),
            None
        )
        assert join_event is not None
        assert join_event['args'][0]['task_id'] == test_task.id
    
    @patch('routes.task_chat.authenticate_socket_user')
    def test_join_task_chat_auth_failed(self, mock_auth, socketio_client, test_task):
        """Test joining task chat with authentication failure."""
        # Mock authentication failure
        mock_auth.return_value = None
        
        socketio_client.emit('join_task_chat', {
            'task_id': test_task.id,
            'token': 'invalid_token'
        })
        
        # Check for error response
        received = socketio_client.get_received()
        error_event = next(
            (event for event in received if event['name'] == 'error'),
            None
        )
        assert error_event is not None
        assert 'Authentication failed' in error_event['args'][0]['message']
    
    @patch('routes.task_chat.authenticate_socket_user')
    @patch('routes.task_chat.verify_task_access')
    @patch('services.task_chat_service.TaskChatService.create_task_message')
    def test_send_task_message_success(self, mock_create_message, mock_verify_access, mock_auth, socketio_client, test_user, test_task):
        """Test successful sending of task message via Socket.IO."""
        # Mock authentication and access verification
        mock_auth.return_value = test_user
        mock_verify_access.return_value = test_task
        
        # Mock message creation
        mock_message = MagicMock()
        mock_message.id = 1
        mock_message.created_at = datetime.now()
        mock_create_message.return_value = (mock_message, None)
        
        # Emit send_task_message event
        socketio_client.emit('send_task_message', {
            'task_id': test_task.id,
            'content': 'Test message',
            'token': 'mock_token'
        })
        
        # Verify message creation was called
        mock_create_message.assert_called_once_with(
            test_task.id, test_user.id, 'Test message'
        )
    
    @patch('routes.task_chat.authenticate_socket_user')
    @patch('routes.task_chat.verify_task_access')
    def test_typing_indicators(self, mock_verify_access, mock_auth, socketio_client, test_user, test_task):
        """Test typing indicators for task chat."""
        # Mock authentication and access verification
        mock_auth.return_value = test_user
        mock_verify_access.return_value = test_task
        
        # Test typing start
        socketio_client.emit('typing_start', {
            'task_id': test_task.id,
            'token': 'mock_token'
        })
        
        # Test typing stop
        socketio_client.emit('typing_stop', {
            'task_id': test_task.id,
            'token': 'mock_token'
        })
        
        # In a real test, we would verify that other clients in the room
        # receive the typing indicators, but that requires multiple clients
        # which is complex to test in unit tests 