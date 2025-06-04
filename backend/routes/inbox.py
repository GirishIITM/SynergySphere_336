from flask import Blueprint, jsonify

inbox_bp = Blueprint('inbox', __name__)

@inbox_bp.route('/api/inbox', methods=['GET'])
def get_inbox():
    notifications = [
        {
            "message": "Team work makes dream work",
            "user": "User 1",
            "timeAgo": "10 min ago"
        }
    ]
    return jsonify(notifications)