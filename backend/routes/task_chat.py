"""
Real-time task chat functionality using Socket.IO.

Provides seamless communication directly integrated into tasks with 
real-time messaging, typing indicators, and message persistence.
"""

from flask import request
from flask_socketio import emit, join_room, leave_room, rooms
from flask_jwt_extended import decode_token, get_jwt_identity
from extensions import socketio, db
from models import Task, Message, User, Project
from utils.datetime_utils import get_utc_now
import logging

logger = logging.getLogger(__name__)

def authenticate_socket_user(auth_token):
    """
    Authenticate user from Socket.IO connection.
    
    Args:
        auth_token (str): JWT token from client
        
    Returns:
        User: Authenticated user object or None if invalid
    """
    try:
        if not auth_token:
            return None
        
        # Remove "Bearer " prefix if present
        if auth_token.startswith('Bearer '):
            auth_token = auth_token[7:]
            
        decoded_token = decode_token(auth_token)
        user_id = decoded_token['sub']
        user = User.query.get(int(user_id))
        return user
    except Exception as e:
        logger.error(f"Socket authentication error: {str(e)}")
        return None

def verify_task_access(user_id, task_id):
    """
    Verify user has access to the task.
    
    Args:
        user_id (int): User ID to check access for
        task_id (int): Task ID to verify access to
        
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
        logger.error(f"Task access verification error: {str(e)}")
        return None

@socketio.on('connect')
def handle_connect(auth):
    """Handle client connection with authentication."""
    try:
        auth_token = auth.get('token') if auth else None
        user = authenticate_socket_user(auth_token)
        
        if not user:
            logger.warning("Unauthorized socket connection attempt")
            return False  # Reject connection
            
        # Store user info in session
        request.sid_user_map = getattr(socketio.server.manager, 'sid_user_map', {})
        request.sid_user_map[request.sid] = user.id
        
        logger.info(f"User {user.username} connected via Socket.IO")
        emit('connection_status', {'status': 'connected', 'user_id': user.id})
        return True
        
    except Exception as e:
        logger.error(f"Connection error: {str(e)}")
        return False

@socketio.on('disconnect')
def handle_disconnect():
    """Handle client disconnection."""
    try:
        # Clean up user mapping
        sid_user_map = getattr(socketio.server.manager, 'sid_user_map', {})
        user_id = sid_user_map.pop(request.sid, None)
        
        if user_id:
            # Leave all task rooms
            user_rooms = [room for room in rooms() if room.startswith('task_')]
            for room in user_rooms:
                leave_room(room)
                
            logger.info(f"User {user_id} disconnected from Socket.IO")
            
    except Exception as e:
        logger.error(f"Disconnect error: {str(e)}")

@socketio.on('join_task_chat')
def handle_join_task_chat(data):
    """
    Join a task's chat room.
    
    Args:
        data (dict): Contains task_id and auth token
    """
    try:
        task_id = data.get('task_id')
        auth_token = data.get('token')
        
        if not task_id or not auth_token:
            emit('error', {'message': 'Missing task_id or token'})
            return
            
        user = authenticate_socket_user(auth_token)
        if not user:
            emit('error', {'message': 'Authentication failed'})
            return
            
        task = verify_task_access(user.id, task_id)
        if not task:
            emit('error', {'message': 'Task not found or access denied'})
            return
            
        room_name = f'task_{task_id}'
        join_room(room_name)
        
        # Notify other users in the room
        emit('user_joined_chat', {
            'user_id': user.id,
            'username': user.username,
            'full_name': user.full_name,
            'task_id': task_id
        }, room=room_name, include_self=False)
        
        # Send confirmation to user
        emit('joined_task_chat', {
            'task_id': task_id,
            'task_title': task.title,
            'room': room_name
        })
        
        logger.info(f"User {user.username} joined task {task_id} chat")
        
    except Exception as e:
        logger.error(f"Join task chat error: {str(e)}")
        emit('error', {'message': 'Failed to join task chat'})

@socketio.on('leave_task_chat')
def handle_leave_task_chat(data):
    """
    Leave a task's chat room.
    
    Args:
        data (dict): Contains task_id and auth token
    """
    try:
        task_id = data.get('task_id')
        auth_token = data.get('token')
        
        user = authenticate_socket_user(auth_token)
        if not user:
            return
            
        room_name = f'task_{task_id}'
        leave_room(room_name)
        
        # Notify other users in the room
        emit('user_left_chat', {
            'user_id': user.id,
            'username': user.username,
            'task_id': task_id
        }, room=room_name)
        
        emit('left_task_chat', {'task_id': task_id})
        logger.info(f"User {user.username} left task {task_id} chat")
        
    except Exception as e:
        logger.error(f"Leave task chat error: {str(e)}")

@socketio.on('send_task_message')
def handle_send_task_message(data):
    """
    Send a message to a task chat room.
    
    Args:
        data (dict): Contains task_id, message content, and auth token
    """
    try:
        task_id = data.get('task_id')
        content = data.get('content', '').strip()
        auth_token = data.get('token')
        
        if not task_id or not content or not auth_token:
            emit('error', {'message': 'Missing required fields'})
            return
            
        user = authenticate_socket_user(auth_token)
        if not user:
            emit('error', {'message': 'Authentication failed'})
            return
            
        task = verify_task_access(user.id, task_id)
        if not task:
            emit('error', {'message': 'Task not found or access denied'})
            return
            
        # Create and save message to database
        message = Message(
            content=content,
            user_id=user.id,
            project_id=task.project_id,
            task_id=task_id,
            created_at=get_utc_now()
        )
        
        db.session.add(message)
        db.session.commit()
        
        # Prepare message data for broadcasting
        message_data = {
            'id': message.id,
            'content': content,
            'user_id': user.id,
            'username': user.username,
            'full_name': user.full_name,
            'task_id': task_id,
            'created_at': message.created_at.isoformat(),
            'message_type': 'task_message'
        }
        
        # Broadcast to all users in the task room
        room_name = f'task_{task_id}'
        emit('new_task_message', message_data, room=room_name)
        
        logger.info(f"Message sent by {user.username} to task {task_id}")
        
    except Exception as e:
        logger.error(f"Send message error: {str(e)}")
        emit('error', {'message': 'Failed to send message'})

@socketio.on('typing_start')
def handle_typing_start(data):
    """
    Handle user starting to type in task chat.
    
    Args:
        data (dict): Contains task_id and auth token
    """
    try:
        task_id = data.get('task_id')
        auth_token = data.get('token')
        
        user = authenticate_socket_user(auth_token)
        if not user or not task_id:
            return
            
        task = verify_task_access(user.id, task_id)
        if not task:
            return
            
        room_name = f'task_{task_id}'
        emit('user_typing', {
            'user_id': user.id,
            'username': user.username,
            'task_id': task_id,
            'typing': True
        }, room=room_name, include_self=False)
        
    except Exception as e:
        logger.error(f"Typing start error: {str(e)}")

@socketio.on('typing_stop')
def handle_typing_stop(data):
    """
    Handle user stopping typing in task chat.
    
    Args:
        data (dict): Contains task_id and auth token
    """
    try:
        task_id = data.get('task_id')
        auth_token = data.get('token')
        
        user = authenticate_socket_user(auth_token)
        if not user or not task_id:
            return
            
        task = verify_task_access(user.id, task_id)
        if not task:
            return
            
        room_name = f'task_{task_id}'
        emit('user_typing', {
            'user_id': user.id,
            'username': user.username,
            'task_id': task_id,
            'typing': False
        }, room=room_name, include_self=False)
        
    except Exception as e:
        logger.error(f"Typing stop error: {str(e)}")

@socketio.on('get_task_messages')
def handle_get_task_messages(data):
    """
    Retrieve historical messages for a task.
    
    Args:
        data (dict): Contains task_id, optional limit/offset, and auth token
    """
    try:
        task_id = data.get('task_id')
        limit = data.get('limit', 50)  # Default to last 50 messages
        offset = data.get('offset', 0)
        auth_token = data.get('token')
        
        user = authenticate_socket_user(auth_token)
        if not user or not task_id:
            emit('error', {'message': 'Invalid request'})
            return
            
        task = verify_task_access(user.id, task_id)
        if not task:
            emit('error', {'message': 'Task not found or access denied'})
            return
            
        # Query messages for this task
        messages = Message.query.filter_by(task_id=task_id)\
                              .order_by(Message.created_at.desc())\
                              .offset(offset)\
                              .limit(limit)\
                              .all()
        
        # Convert to dict format (reverse to show oldest first)
        messages_data = []
        for message in reversed(messages):
            messages_data.append({
                'id': message.id,
                'content': message.content,
                'user_id': message.user_id,
                'username': message.user.username,
                'full_name': message.user.full_name,
                'task_id': task_id,
                'created_at': message.created_at.isoformat()
            })
        
        emit('task_messages_history', {
            'task_id': task_id,
            'messages': messages_data,
            'has_more': len(messages) == limit
        })
        
    except Exception as e:
        logger.error(f"Get task messages error: {str(e)}")
        emit('error', {'message': 'Failed to retrieve messages'}) 