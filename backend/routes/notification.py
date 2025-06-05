from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import Notification
from extensions import db
from utils.route_cache import cache_route, invalidate_cache_on_change

notification_bp = Blueprint('notification', __name__)

@notification_bp.route('/notifications', methods=['GET'])
@jwt_required()
@cache_route(ttl=60, user_specific=True)  # Cache for 1 minute
def list_notifications():
    """Get all notifications for the current user."""
    user_id = int(get_jwt_identity())
    notifications = Notification.query.filter_by(user_id=user_id).order_by(Notification.created_at.desc()).all()
    return jsonify([notification.to_dict() for notification in notifications])

@notification_bp.route('/notifications/tagged', methods=['GET'])
@jwt_required()
@cache_route(ttl=30, user_specific=True)  # Cache for 30 seconds (more real-time)
def list_tagged_notifications():
    """Get notifications where the user is tagged/mentioned."""
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
    
    return jsonify([notification.to_dict() for notification in notifications])

@notification_bp.route('/notifications/<int:notif_id>/read', methods=['PUT'])
@jwt_required()
@invalidate_cache_on_change(['notifications'])
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
@invalidate_cache_on_change(['notifications'])
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
