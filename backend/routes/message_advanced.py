from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import Message, Task, Project, User, Notification
from extensions import db
from utils.route_cache import invalidate_cache_on_change
from utils.mention_utils import get_mentioned_users, create_mention_notifications

message_advanced_bp = Blueprint('message_advanced', __name__)

@message_advanced_bp.route('/projects/<int:project_id>/tasks/<int:task_id>/messages', methods=['GET'])
@jwt_required()
def get_task_messages(project_id, task_id):
    """Get messages for a specific task."""
    user_id = int(get_jwt_identity())
    
    # Verify user is project member
    project = Project.query.get_or_404(project_id)
    if not any(member.id == user_id for member in project.members):
        return jsonify({'msg': 'Not a member of this project'}), 403
    
    # Verify task belongs to project
    task = Task.query.get_or_404(task_id)
    if task.project_id != project_id:
        return jsonify({'msg': 'Task does not belong to this project'}), 400
    
    # Get messages for this task
    messages = Message.query.filter_by(
        project_id=project_id, 
        task_id=task_id
    ).order_by(Message.created_at.asc()).all()
    
    return jsonify([message.to_dict() for message in messages]), 200

@message_advanced_bp.route('/projects/<int:project_id>/tasks/<int:task_id>/messages', methods=['POST'])
@jwt_required()
@invalidate_cache_on_change(['messages'])
def post_task_message(project_id, task_id):
    """Post a message to a specific task."""
    user_id = int(get_jwt_identity())
    data = request.get_json()
    
    if not data or 'content' not in data:
        return jsonify({'msg': 'Message content is required'}), 400
    
    content = data.get('content')
    if not content.strip():
        return jsonify({'msg': 'Message content cannot be empty'}), 400
    
    # Verify user is project member
    project = Project.query.get_or_404(project_id)
    if not any(member.id == user_id for member in project.members):
        return jsonify({'msg': 'Not a member of this project'}), 403
    
    # Verify task belongs to project
    task = Task.query.get_or_404(task_id)
    if task.project_id != project_id:
        return jsonify({'msg': 'Task does not belong to this project'}), 400
    
    # Create message
    message = Message(
        content=content,
        user_id=user_id,
        project_id=project_id,
        task_id=task_id
    )
    db.session.add(message)
    db.session.commit()
    
    # Get current user for notifications
    current_user = User.query.get(user_id)
    
    # Handle @mentions - create targeted notifications for mentioned users
    mentioned_users = get_mentioned_users(content, project.members)
    if mentioned_users:
        create_mention_notifications(message, mentioned_users, current_user)
    
    # Create general notifications for other project members (excluding mentioned users to avoid duplicates)
    mentioned_user_ids = [user.id for user in mentioned_users]
    general_notification_message = f"New message in task '{task.title}' from {current_user.full_name if hasattr(current_user, 'full_name') else 'Unknown User'}"
    
    for member in project.members:
        if member.id != user_id and member.id not in mentioned_user_ids:  # Don't notify sender or mentioned users
            notification = Notification(
                user_id=member.id,
                message=general_notification_message,
                task_id=task.id,
                message_id=message.id,
                notification_type='general'
            )
            db.session.add(notification)
    
    db.session.commit()
    
    return jsonify({'msg': 'Message posted', 'message': message.to_dict()}), 201 