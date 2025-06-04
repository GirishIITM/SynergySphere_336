"""
Task Chat Service for managing real-time communication within tasks.

Provides business logic for task-specific messaging, user presence, 
and chat room management separated from the Socket.IO event handlers.
"""

from typing import List, Dict, Optional, Tuple
from models import Task, Message, User, Project
from extensions import db
from utils.datetime_utils import get_utc_now
import logging

logger = logging.getLogger(__name__)

class TaskChatService:
    """Service class for managing task-specific chat functionality."""
    
    @staticmethod
    def get_task_with_access_check(task_id: int, user_id: int) -> Optional[Task]:
        """
        Get task if user has access to it.
        
        Args:
            task_id (int): ID of the task
            user_id (int): ID of the user requesting access
            
        Returns:
            Task: Task object if user has access, None otherwise
        """
        try:
            task = Task.query.get(task_id)
            if not task:
                return None
                
            # Check if user is task owner or project member
            project = task.project
            if task.owner_id == user_id or any(member.id == user_id for member in project.members):
                return task
            return None
        except Exception as e:
            logger.error(f"Task access check error: {str(e)}")
            return None
    
    @staticmethod
    def create_task_message(
        task_id: int, 
        user_id: int, 
        content: str
    ) -> Tuple[Optional[Message], Optional[str]]:
        """
        Create a new message for a task.
        
        Args:
            task_id (int): ID of the task
            user_id (int): ID of the user sending the message
            content (str): Message content
            
        Returns:
            Tuple[Message, str]: Message object and error message (if any)
        """
        try:
            if not content.strip():
                return None, "Message content cannot be empty"
                
            task = TaskChatService.get_task_with_access_check(task_id, user_id)
            if not task:
                return None, "Task not found or access denied"
                
            message = Message(
                content=content.strip(),
                user_id=user_id,
                project_id=task.project_id,
                task_id=task_id,
                created_at=get_utc_now()
            )
            
            db.session.add(message)
            db.session.commit()
            
            return message, None
            
        except Exception as e:
            logger.error(f"Create task message error: {str(e)}")
            db.session.rollback()
            return None, "Failed to create message"
    
    @staticmethod
    def get_task_messages(
        task_id: int, 
        user_id: int, 
        limit: int = 50, 
        offset: int = 0
    ) -> Tuple[List[Dict], Optional[str], bool]:
        """
        Get historical messages for a task.
        
        Args:
            task_id (int): ID of the task
            user_id (int): ID of the user requesting messages
            limit (int): Maximum number of messages to return
            offset (int): Number of messages to skip
            
        Returns:
            Tuple[List[Dict], str, bool]: Messages list, error message, has_more flag
        """
        try:
            task = TaskChatService.get_task_with_access_check(task_id, user_id)
            if not task:
                return [], "Task not found or access denied", False
                
            messages = Message.query.filter_by(task_id=task_id)\
                                  .order_by(Message.created_at.desc())\
                                  .offset(offset)\
                                  .limit(limit)\
                                  .all()
            
            messages_data = []
            for message in reversed(messages):  # Reverse to show oldest first
                messages_data.append({
                    'id': message.id,
                    'content': message.content,
                    'user_id': message.user_id,
                    'username': message.user.username,
                    'full_name': message.user.full_name,
                    'task_id': task_id,
                    'created_at': message.created_at.isoformat()
                })
            
            has_more = len(messages) == limit
            return messages_data, None, has_more
            
        except Exception as e:
            logger.error(f"Get task messages error: {str(e)}")
            return [], "Failed to retrieve messages", False
    
    @staticmethod
    def get_task_chat_participants(task_id: int, user_id: int) -> Tuple[List[Dict], Optional[str]]:
        """
        Get list of users who can participate in task chat.
        
        Args:
            task_id (int): ID of the task
            user_id (int): ID of the user requesting participants
            
        Returns:
            Tuple[List[Dict], str]: Participants list and error message (if any)
        """
        try:
            task = TaskChatService.get_task_with_access_check(task_id, user_id)
            if not task:
                return [], "Task not found or access denied"
                
            # Get all project members who can participate
            participants = []
            for member in task.project.members:
                participants.append({
                    'id': member.id,
                    'username': member.username,
                    'full_name': member.full_name,
                    'email': member.email,
                    'is_task_owner': member.id == task.owner_id
                })
            
            return participants, None
            
        except Exception as e:
            logger.error(f"Get task participants error: {str(e)}")
            return [], "Failed to retrieve participants"
    
    @staticmethod
    def get_task_message_count(task_id: int, user_id: int) -> Tuple[int, Optional[str]]:
        """
        Get total count of messages in a task chat.
        
        Args:
            task_id (int): ID of the task
            user_id (int): ID of the user requesting count
            
        Returns:
            Tuple[int, str]: Message count and error message (if any)
        """
        try:
            task = TaskChatService.get_task_with_access_check(task_id, user_id)
            if not task:
                return 0, "Task not found or access denied"
                
            count = Message.query.filter_by(task_id=task_id).count()
            return count, None
            
        except Exception as e:
            logger.error(f"Get task message count error: {str(e)}")
            return 0, "Failed to get message count"
    
    @staticmethod
    def mark_messages_as_read(task_id: int, user_id: int) -> Optional[str]:
        """
        Mark all messages in a task as read for a user.
        
        Note: This would require additional Message model fields for read status.
        For now, this is a placeholder for future implementation.
        
        Args:
            task_id (int): ID of the task
            user_id (int): ID of the user marking messages as read
            
        Returns:
            str: Error message if any
        """
        try:
            task = TaskChatService.get_task_with_access_check(task_id, user_id)
            if not task:
                return "Task not found or access denied"
                
            # TODO: Implement read status tracking
            # This would require adding a MessageRead model or read_by field
            logger.info(f"Messages marked as read for user {user_id} in task {task_id}")
            return None
            
        except Exception as e:
            logger.error(f"Mark messages as read error: {str(e)}")
            return "Failed to mark messages as read" 