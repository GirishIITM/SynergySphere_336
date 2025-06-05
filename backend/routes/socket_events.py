import datetime
from flask_socketio import emit, join_room, leave_room, disconnect
from flask_jwt_extended import decode_token, jwt_required, JWTManager
from extensions import socketio
from models import User
import logging
import jwt

logger = logging.getLogger(__name__)

@socketio.on('connect')
def handle_connect(auth):
    """Handle client connection and authentication."""
    try:
        logger.info(f"Client attempting to connect with auth: {auth}")
        
        # Get token from auth data
        token = None
        if auth and isinstance(auth, dict):
            token = auth.get('token')
        
        if not token:
            logger.warning("Client connected without token")
            emit('connect_error', {'message': 'Authentication token required'})
            return False
        
        # Remove 'Bearer ' prefix if present
        if token.startswith('Bearer '):
            token = token[7:]
        
        # Decode JWT token to get user ID
        try:
            from flask import current_app
            decoded_token = jwt.decode(
                token, 
                current_app.config['JWT_SECRET_KEY'], 
                algorithms=['HS256']
            )
            user_id = decoded_token.get('sub')
            
            if not user_id:
                logger.warning("No user ID found in token")
                emit('connect_error', {'message': 'Invalid token format'})
                return False
            
            # Verify user exists
            user = User.query.get(user_id)
            if not user:
                logger.warning(f"Invalid user ID in token: {user_id}")
                emit('connect_error', {'message': 'User not found'})
                return False
            
            # Join user-specific room for targeted notifications
            join_room(f'user_{user_id}')
            
            logger.info(f"User {user_id} ({user.username}) connected to Socket.IO")
            
            # Send connection confirmation
            emit('connected', {
                'status': 'success',
                'user_id': user_id,
                'username': user.username,
                'message': 'Successfully connected to real-time notifications'
            })
            
            return True
            
        except jwt.ExpiredSignatureError:
            logger.warning("Expired token provided")
            emit('connect_error', {'message': 'Token has expired'})
            return False
        except jwt.InvalidTokenError as e:
            logger.error(f"Invalid token: {e}")
            emit('connect_error', {'message': 'Invalid token'})
            return False
        except Exception as e:
            logger.error(f"Token validation error: {e}")
            emit('connect_error', {'message': 'Token validation failed'})
            return False
            
    except Exception as e:
        logger.error(f"Connection error: {e}")
        emit('connect_error', {'message': 'Connection failed'})
        return False

@socketio.on('disconnect')
def handle_disconnect():
    """Handle client disconnection."""
    logger.info("Client disconnected from Socket.IO")

@socketio.on('join_user_room')
def handle_join_user_room(data):
    """Manually join user room (backup method)."""
    try:
        user_id = data.get('user_id')
        if user_id:
            join_room(f'user_{user_id}')
            emit('room_joined', {'room': f'user_{user_id}'})
            logger.info(f"User {user_id} manually joined their room")
    except Exception as e:
        logger.error(f"Error joining user room: {e}")
        emit('error', {'message': 'Failed to join user room'})

@socketio.on('leave_user_room')
def handle_leave_user_room(data):
    """Leave user room."""
    try:
        user_id = data.get('user_id')
        if user_id:
            leave_room(f'user_{user_id}')
            emit('room_left', {'room': f'user_{user_id}'})
            logger.info(f"User {user_id} left their room")
    except Exception as e:
        logger.error(f"Error leaving user room: {e}")

@socketio.on('ping')
def handle_ping():
    """Handle ping from client for connection testing."""
    emit('pong', {'timestamp': str(datetime.utcnow())})
