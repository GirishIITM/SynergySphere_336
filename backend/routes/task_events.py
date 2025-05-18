from flask import Blueprint, request, jsonify
from datetime import datetime
from models.user import Message, Project, Task, User, db 
from routes import auth_bp  

@auth_bp.route('/tasks', methods=['GET'])
def get_tasks():
    tasks = Task.query.all()
    return jsonify([task.to_dict() for task in tasks])



@auth_bp.route('/tasks', methods=['POST'])
def create_task():
    data = request.json
    new_task = Task(**data)
    db.session.add(new_task)
    db.session.commit()
    return jsonify(new_task.to_dict()), 201


@auth_bp.route('/tasks/<int:task_id>', methods=['PUT'])
def update_task(task_id):
    data = request.json
    task = Task.query.get_or_404(task_id)
    for key, value in data.items():
        setattr(task, key, value)
    db.session.commit()
    return jsonify(task.to_dict())


@auth_bp.route('/tasks/<int:task_id>', methods=['DELETE'])
def delete_task(task_id):
    task = Task.query.get_or_404(task_id)
    db.session.delete(task)
    db.session.commit()
    return '', 204

@auth_bp.route('/messages', methods=['GET'])
def get_messages():
    messages = Message.query.all()
    return jsonify([message.to_dict() for message in messages])




@auth_bp.route('/messages', methods=['POST'])
def create_message():
    data = request.json
    new_message = Message(**data)
    db.session.add(new_message)
    db.session.commit()
    return jsonify(new_message.to_dict()), 201


@auth_bp.route('/messages/<int:message_id>', methods=['PUT'])
def update_message(message_id):
    data = request.json
    message = Message.query.get_or_404(message_id)
    for key, value in data.items():
        setattr(message, key, value)
    db.session.commit()
    return jsonify(message.to_dict())


@auth_bp.route('/messages/<int:message_id>', methods=['DELETE'])
def delete_message(message_id):
    message = Message.query.get_or_404(message_id)
    db.session.delete(message)
    db.session.commit()
    return '', 204

@auth_bp.route('/projects', methods=['GET'])
def get_projects():
    projects = Project.query.all()
    return jsonify([project.to_dict() for project in projects])




@auth_bp.route('/projects', methods=['POST'])
def create_project():
    data = request.json
    name = data.get('name')
    # find thhe current user and set the creator_id to the current user's id
    current_user = User.query.get(data.get('user_id'))
    if not current_user:
        return jsonify({'error': 'User not found'}), 404
    description = data.get('description')
    new_project = Project(name=name, creator_id=current_user.id, description=description)
    db.session.add(new_project)
    db.session.commit()
    return jsonify(new_project.to_dict()), 201


@auth_bp.route('/projects/<int:project_id>', methods=['PUT'])
def update_project(project_id):
    data = request.json
    project = Project.query.get_or_404(project_id)
    for key, value in data.items():
        setattr(project, key, value)
    db.session.commit()
    return jsonify(project.to_dict())


@auth_bp.route('/projects/<int:project_id>', methods=['DELETE'])
def delete_project(project_id):
    project = Project.query.get_or_404(project_id)
    db.session.delete(project)
    db.session.commit()
    return '', 204

