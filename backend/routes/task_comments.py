"""
Task Comments REST API routes.

Provides HTTP endpoints for task comment functionality,
complementing the real-time Socket.IO integration.
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from services.task_comment_service import TaskCommentService


task_comments_bp = Blueprint('task_comments', __name__)


@task_comments_bp.route('/api/tasks/<int:task_id>/comments', methods=['GET'])
@jwt_required()
def get_task_comments(task_id):
    """
    Get all comments for a specific task.

    Args:
        task_id (int): The ID of the task.

    Returns:
        JSON response with comments list or error message.
    """
    try:
        user_id = get_jwt_identity()
        
        # Check if user can access this task
        if not TaskCommentService.user_can_access_task(user_id, task_id):
            return jsonify({'error': 'Access denied to this task'}), 403
        
        limit = request.args.get('limit', 50, type=int)
        comments = TaskCommentService.get_task_comments(task_id, limit)
        
        return jsonify({
            'comments': comments,
            'task_id': task_id,
            'total': len(comments)
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 400


@task_comments_bp.route('/api/tasks/<int:task_id>/comments', methods=['POST'])
@jwt_required()
def create_task_comment(task_id):
    """
    Create a new comment for a task.

    Args:
        task_id (int): The ID of the task.

    Returns:
        JSON response with created comment or error message.
    """
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        if not data or not data.get('content'):
            return jsonify({'error': 'Content is required'}), 400
        
        # Check if user can access this task
        if not TaskCommentService.user_can_access_task(user_id, task_id):
            return jsonify({'error': 'Access denied to this task'}), 403
        
        content = data['content'].strip()
        if not content:
            return jsonify({'error': 'Content cannot be empty'}), 400
        
        comment = TaskCommentService.create_task_comment(task_id, user_id, content)
        
        return jsonify({
            'message': 'Comment created successfully',
            'comment': comment
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 400


@task_comments_bp.route('/api/tasks/<int:task_id>/comments/count', methods=['GET'])
@jwt_required()
def get_task_comment_count(task_id):
    """
    Get the total number of comments for a task.

    Args:
        task_id (int): The ID of the task.

    Returns:
        JSON response with comment count or error message.
    """
    try:
        user_id = get_jwt_identity()
        
        # Check if user can access this task
        if not TaskCommentService.user_can_access_task(user_id, task_id):
            return jsonify({'error': 'Access denied to this task'}), 403
        
        from models.message import Message
        count = Message.query.filter_by(task_id=task_id).count()
        
        return jsonify({
            'task_id': task_id,
            'comment_count': count
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 400 