from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import Notification
from extensions import db
from utils.route_cache import cache_route, invalidate_cache_on_change

notification_bp = Blueprint('notification', __name__)

@notification_bp.route('/notifications', methods=['GET'])
@jwt_required()
@cache_route(ttl=60, user_specific=True)  # Cache for 1 minute
def list_notifications():
    user_id = int(get_jwt_identity())
    notifications = Notification.query.filter_by(user_id=user_id).order_by(Notification.timestamp.desc()).all()
    return jsonify([
        {'id': n.id, 'message': n.message, 'is_read': n.is_read, 'timestamp': n.timestamp.isoformat()}
        for n in notifications
    ])

@notification_bp.route('/notifications/<int:notif_id>/read', methods=['PUT'])
@jwt_required()
@invalidate_cache_on_change(['notifications'])
def mark_read(notif_id):
    user_id = int(get_jwt_identity())
    notification = Notification.query.get_or_404(notif_id)
    if notification.user_id != user_id:
        return jsonify({'msg': 'Not authorized'}), 403
    notification.is_read = True
    db.session.commit()
    return jsonify({'msg': 'Notification marked as read'})
