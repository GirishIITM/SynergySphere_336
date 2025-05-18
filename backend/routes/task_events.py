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
    project_id = data.get('project_id')
    title = data.get('title')
    description = data.get('description')
    due_date = data.get('due_date')
    status = data.get('status')
    # conert date to datetime object
    due_date = datetime.strptime(due_date, '%Y-%m-%d')
    new_task = Task(project_id=project_id, title=title, description=description, due_date=due_date, status=status)
    db.session.add(new_task)
    db.session.commit()
    return jsonify(new_task.to_dict()), 201


@auth_bp.route('/tasks/<int:task_id>', methods=['PUT'])
def update_task(task_id):
    data = request.json
    project_id = data.get('project_id')
    title = data.get('title')
    description = data.get('description')
    due_date = data.get('due_date')
    status = data.get('status')
    # conert date to datetime object
    due_date = datetime.strptime(due_date, '%Y-%m-%d')
    task = Task.query.get_or_404(task_id)
    task.project_id = project_id
    task.title = title
    task.description = description
    task.due_date = due_date
    task.status = status
    # delete the task from the project
    project = Project.query.get(project_id)
    project.tasks.remove(task)
    # add the task to the project
    project = Project.query.get(project_id)
    project.tasks.append(task)
    db.session.commit()
    return jsonify(task.to_dict())


@auth_bp.route('/tasks/<int:task_id>', methods=['DELETE'])
def delete_task(task_id):
    data = request.json
    project_id = data.get('project_id')
    task = Task.query.get_or_404(task_id)
    # delete the task from the project
    project = Project.query.get(project_id)
    project.tasks.remove(task)
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
    project_id = data.get('project_id')
    user_id = data.get('user_id')
    content = data.get('content')
    new_message = Message(project_id=project_id, user_id=user_id, content=content)
    db.session.add(new_message)
    db.session.commit()
    return jsonify(new_message.to_dict()), 201


@auth_bp.route('/messages/<int:message_id>', methods=['PUT'])
def update_message(message_id):
    data = request.json
    project_id = data.get('project_id')
    user_id = data.get('user_id')
    content = data.get('content')
    message = Message.query.get_or_404(message_id)
    message.project_id = project_id
    message.user_id = user_id
    message.content = content
    # delete the message from the project
    project = Project.query.get(project_id)
    project.messages.remove(message)
    # add the message to the project
    project = Project.query.get(project_id)
    project.messages.append(message)
    db.session.commit()
    return jsonify(message.to_dict())


@auth_bp.route('/messages/<int:message_id>', methods=['DELETE'])
def delete_message(message_id):
    data = request.json
    project_id = data.get('project_id')
    message = Message.query.get_or_404(message_id)
    # delete the message from the project
    project = Project.query.get(project_id)
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
    creator_id = data.get('creator_id')
    new_project = Project(name=name, created_by=creator_id)
    db.session.add(new_project)
    db.session.commit()
    # add the project to the user's projects
    current_user = User.query.get(creator_id)
    current_user.projects.append(new_project)
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

