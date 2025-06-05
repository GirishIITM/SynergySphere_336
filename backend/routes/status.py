from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required
from models import Status

status_bp = Blueprint('status', __name__)

@status_bp.route('/statuses', methods=['GET'])
@jwt_required()
def get_all_statuses():
    """Get all available task statuses."""
    try:
        statuses = Status.query.order_by(Status.display_order).all()
        statuses_data = [status.to_dict() for status in statuses]
        return jsonify(statuses_data), 200
    except Exception as e:
        return jsonify({'msg': 'Error fetching statuses'}), 500

@status_bp.route('/statuses/<int:status_id>', methods=['GET'])
@jwt_required()
def get_status(status_id):
    """Get a specific status by ID."""
    try:
        status = Status.query.get_or_404(status_id)
        return jsonify(status.to_dict()), 200
    except Exception as e:
        return jsonify({'msg': 'Error fetching status'}), 500