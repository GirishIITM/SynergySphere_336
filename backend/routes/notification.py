from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import Notification
from extensions import db
# from utils.route_cache import invalidate_cache_on_change  # Redis functionality commented out

notification_bp = Blueprint('notification', __name__)

@notification_bp.route('/notifications', methods=['GET'])
@jwt_required()
def list_notifications():
    """Get all notifications for the current user."""
    user_id = int(get_jwt_identity())
    notifications = Notification.query.filter_by(user_id=user_id).order_by(Notification.created_at.desc()).all()
    return jsonify([notification.to_dict() for notification in notifications])

@notification_bp.route('/notifications/tagged', methods=['GET'])
@jwt_required()
# @cache_route(ttl=30, user_specific=True)  # Temporarily disabled for debugging
def list_tagged_notifications():
    """Get notifications where the user is tagged/mentioned."""
    try:
        user_id = int(get_jwt_identity())
        
        # Get query parameters for filtering
        limit = request.args.get('limit', 50, type=int)
        offset = request.args.get('offset', 0, type=int)
        unread_only = request.args.get('unread_only', 'false').lower() == 'true'
        
        # Build query
        query = Notification.query.filter_by(
            user_id=user_id, 
            notification_type='tagged'
        )
        
        if unread_only:
            query = query.filter_by(is_read=False)
        
        # Apply pagination and ordering
        notifications = query.order_by(Notification.created_at.desc()).limit(limit).offset(offset).all()
        
        # Convert notifications to dict with error handling
        result = []
        for notification in notifications:
            try:
                result.append(notification.to_dict())
            except Exception as e:
                # Log the error but continue with other notifications
                print(f"Error converting notification {notification.id} to dict: {str(e)}")
                # Add a basic version without relationships
                result.append({
                    'id': notification.id,
                    'user_id': notification.user_id,
                    'message': notification.message,
                    'is_read': notification.is_read,
                    'created_at': notification.created_at.isoformat() if notification.created_at else None,
                    'task_id': notification.task_id,
                    'message_id': notification.message_id,
                    'notification_type': notification.notification_type,
                    'error': 'Failed to load complete notification data'
                })
        
        return jsonify(result)
        
    except Exception as e:
        print(f"Error in list_tagged_notifications: {str(e)}")
        return jsonify({'error': 'Failed to fetch tagged notifications', 'details': str(e)}), 500

@notification_bp.route('/notifications/<int:notif_id>/read', methods=['PUT'])
@jwt_required()
def mark_read(notif_id):
    """Mark a notification as read."""
    user_id = int(get_jwt_identity())
    notification = Notification.query.get_or_404(notif_id)
    if notification.user_id != user_id:
        return jsonify({'msg': 'Not authorized'}), 403
    notification.is_read = True
    db.session.commit()
    return jsonify({'msg': 'Notification marked as read'})

@notification_bp.route('/notifications/mark-all-read', methods=['PUT'])
@jwt_required()
# @invalidate_cache_on_change(['notifications'])  # Redis functionality commented out
def mark_all_read():
    """Mark all notifications as read for the current user."""
    user_id = int(get_jwt_identity())
    
    # Get optional filter for notification type
    notification_type = request.args.get('type')
    
    query = Notification.query.filter_by(user_id=user_id, is_read=False)
    if notification_type:
        query = query.filter_by(notification_type=notification_type)
    
    updated_count = query.update({Notification.is_read: True})
    db.session.commit()
    
    return jsonify({
        'msg': f'{updated_count} notifications marked as read',
        'updated_count': updated_count
    })
