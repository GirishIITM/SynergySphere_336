from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import Project, Message, Notification
from extensions import db
from utils.email import send_email
from utils.route_cache import cache_route, invalidate_cache_on_change

message_bp = Blueprint('message', __name__)

@message_bp.route('/projects/<int:project_id>/messages', methods=['GET'])
@jwt_required()
@cache_route(ttl=30, user_specific=True)  # Cache for 30 seconds (real-time data)
def get_messages(project_id):
    user_id = int(get_jwt_identity())
    project = Project.query.get_or_404(project_id)
    if not any(member.id == user_id for member in project.members):
        return jsonify({'msg': 'Not authorized'}), 403
    messages = [
        {'id': m.id, 'user': m.user.username, 'content': m.content,
         'timestamp': m.timestamp.isoformat()}
        for m in project.messages
    ]
    return jsonify(messages)

@message_bp.route('/projects/<int:project_id>/messages', methods=['POST'])
@jwt_required()
@invalidate_cache_on_change(['messages'])
def post_message(project_id):
    user_id = int(get_jwt_identity())
    project = Project.query.get_or_404(project_id)
    if not any(member.id == user_id for member in project.members):
        return jsonify({'msg': 'Not authorized'}), 403
    data = request.get_json()
    content = data.get('content')
    if not content:
        return jsonify({'msg': 'Content required'}), 400
    message = Message(content=content, user_id=user_id, project_id=project_id)
    db.session.add(message)
    db.session.commit()
    # Notify other members
    for member in project.members:
        if member.id != user_id:
            note = Notification(
                user_id=member.id,
                message=f"New message in project '{project.name}': {content[:20]}..."
            )
            db.session.add(note)
            if member.notify_email:
                send_email("New Project Message", [member.email], "", f"{message.user.username}: {content}")
    db.session.commit()
    return jsonify({'msg': 'Message posted'}), 201
