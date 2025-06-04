from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
import cloudinary.uploader
from models import Task, User, Project, TaskAttachment, Notification
from extensions import db
from utils.email import send_email
from utils.datetime_utils import ensure_utc
from utils.route_cache import cache_route, invalidate_cache_on_change

task_bp = Blueprint('task', __name__)

@task_bp.route('/projects/<int:project_id>/tasks', methods=['POST'])
@jwt_required()
@invalidate_cache_on_change(['tasks', 'projects'])
def create_task(project_id):
    user_id = int(get_jwt_identity())
    project = Project.query.get_or_404(project_id)
    if not any(member.id == user_id for member in project.members):
        return jsonify({'msg': 'Not a member of this project'}), 403
    data = request.get_json()
    if not data or 'title' not in data:
        return jsonify({'msg': 'Title required'}), 400
    title = data.get('title')
    description = data.get('description')
    due_date = None
    if 'due_date' in data and data['due_date']:
        try:
            # Handle both date and datetime formats
            date_str = data['due_date']
            if 'T' not in date_str:
                # If only date is provided, add time
                date_str += 'T23:59:59'
            if not date_str.endswith('Z') and '+' not in date_str and '-' not in date_str[-6:]:
                # If no timezone info, assume local time
                date_str += 'Z'
            parsed_date = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
            due_date = ensure_utc(parsed_date)
        except ValueError:
            return jsonify({'msg': 'Invalid date format. Use ISO format with timezone.'}), 400
    status = data.get('status', 'To Do')
    status_mapping = {
        'To Do': 'pending',
        'In Progress': 'in_progress', 
        'Done': 'completed',
        'pending': 'pending',
        'in_progress': 'in_progress',
        'completed': 'completed'
    }
    status = status_mapping.get(status, 'pending')
    
    assignee = None
    if 'assignee_id' in data:
        assignee = User.query.get(data['assignee_id'])
        if not assignee:
            return jsonify({'msg': 'Assignee not found'}), 404
        if not any(member.id == assignee.id for member in project.members):
            return jsonify({'msg': 'Assignee must be project member'}), 400
    
    task = Task(
        title=title, 
        description=description, 
        due_date=due_date,
        status=status, 
        project_id=project_id,
        owner_id=assignee.id if assignee else user_id
    )
    db.session.add(task)
    db.session.commit()
    
    if assignee and assignee.id != user_id:
        message = f"You have been assigned task '{task.title}' in project '{project.name}'"
        notification = Notification(user_id=assignee.id, message=message)
        db.session.add(notification)
        if hasattr(assignee, 'notify_email') and assignee.notify_email:
            send_email("Task Assigned", [assignee.email], "", message)
        db.session.commit()
    return jsonify({'msg': 'Task created', 'task_id': task.id}), 201

@task_bp.route('/tasks/<int:task_id>/attachment', methods=['POST'])
@jwt_required()
@invalidate_cache_on_change(['tasks'])
def add_attachment(task_id):
    user_id = int(get_jwt_identity())
    task = Task.query.get_or_404(task_id)
    project = task.project
    if not any(member.id == user_id for member in project.members):
        return jsonify({'msg': 'Not authorized'}), 403
    if 'file' not in request.files:
        return jsonify({'msg': 'No file part'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'msg': 'No selected file'}), 400
    upload_result = cloudinary.uploader.upload(file)
    attachment = TaskAttachment(task_id=task_id, file_url=upload_result.get('secure_url'))
    db.session.add(attachment)
    db.session.commit()
    return jsonify({'msg': 'File uploaded', 'url': attachment.file_url})

@task_bp.route('/tasks', methods=['GET'])
@jwt_required()
@cache_route(ttl=120, user_specific=True)  # Cache for 2 minutes
def get_all_tasks():
    user_id = int(get_jwt_identity())
    tasks = Task.query.filter_by(owner_id=user_id).all()
    tasks_data = []
    for task in tasks:
        status_mapping = {
            'pending': 'Not Started',
            'in_progress': 'In Progress',
            'completed': 'Completed'
        }
        readable_status = status_mapping.get(task.status.value if hasattr(task.status, 'value') else str(task.status), 'Not Started')
        
        # Get assignee name
        assignee_name = None
        if task.owner_id:
            assignee = User.query.get(task.owner_id)
            assignee_name = assignee.full_name if assignee else 'Unknown User'
        
        task_data = {
            'id': task.id,
            'title': task.title,
            'description': task.description,
            'due_date': task.due_date.isoformat() if task.due_date else None,
            'status': readable_status,
            'project_id': task.project_id,
            'owner_id': task.owner_id,
            'assignee_id': task.owner_id,
            'assignee': assignee_name,
            'created_at': task.created_at.isoformat() if task.created_at else None,
            'project_name': task.project.name if task.project else None
        }
        tasks_data.append(task_data)
    return jsonify(tasks_data)

@task_bp.route('/tasks', methods=['POST'])
@jwt_required()
@invalidate_cache_on_change(['tasks', 'projects'])
def create_task_direct():
    user_id = int(get_jwt_identity())
    data = request.get_json()
    
    if not data:
        return jsonify({'msg': 'No data provided'}), 400
    
    required_fields = ['project_id', 'title']
    for field in required_fields:
        if field not in data or not data[field]:
            return jsonify({'msg': f'{field.replace("_", " ").title()} is required'}), 400
    
    project_id = data['project_id']
    title = data['title']
    description = data.get('description', '')
    
    project = Project.query.get_or_404(project_id)
    if not any(member.id == user_id for member in project.members):
        return jsonify({'msg': 'Not a member of this project'}), 403
    
    due_date = None
    if 'due_date' in data and data['due_date']:
        try:
            # Handle both date and datetime formats
            date_str = data['due_date']
            if 'T' not in date_str:
                # If only date is provided, add time
                date_str += 'T23:59:59'
            if not date_str.endswith('Z') and '+' not in date_str and '-' not in date_str[-6:]:
                # If no timezone info, assume local time
                date_str += 'Z'
            parsed_date = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
            due_date = ensure_utc(parsed_date)
        except ValueError:
            return jsonify({'msg': 'Invalid date format. Use ISO format with timezone.'}), 400
    
    status = data.get('status', 'To Do')
    # Map status to enum values
    status_mapping = {
        'To Do': 'pending',
        'In Progress': 'in_progress', 
        'Done': 'completed',
        'pending': 'pending',
        'in_progress': 'in_progress',
        'completed': 'completed'
    }
    status = status_mapping.get(status, 'pending')
    
    assignee_id = data.get('assignee_id')
    
    if assignee_id:
        assignee = User.query.get(assignee_id)
        if not assignee:
            return jsonify({'msg': 'Assignee not found'}), 404
        if not any(member.id == assignee.id for member in project.members):
            return jsonify({'msg': 'Assignee must be project member'}), 400
    
    task = Task(
        title=title, 
        description=description, 
        due_date=due_date, 
        status=status, 
        project_id=project_id, 
        owner_id=assignee_id if assignee_id else user_id
    )
    db.session.add(task)
    db.session.commit()
    
    if assignee_id and assignee_id != user_id:
        assignee = User.query.get(assignee_id)
        message = f"You have been assigned task '{task.title}' in project '{project.name}'"
        notification = Notification(user_id=assignee.id, message=message)
        db.session.add(notification)
        if hasattr(assignee, 'notify_email') and assignee.notify_email:
            send_email("Task Assigned", [assignee.email], "", message)
        db.session.commit()
    
    return jsonify({'msg': 'Task created', 'task_id': task.id}), 201

@task_bp.route('/tasks/<int:task_id>', methods=['PUT'])
@jwt_required()
@invalidate_cache_on_change(['tasks', 'projects'])
def update_task_direct(task_id):
    user_id = int(get_jwt_identity())
    data = request.get_json()
    
    if not data:
        return jsonify({'msg': 'No data provided'}), 400
        
    task = Task.query.get_or_404(task_id)
    project = task.project
    
    if not any(member.id == user_id for member in project.members):
        return jsonify({'msg': 'Not authorized'}), 403
    
    if 'title' in data:
        task.title = data['title']
    if 'description' in data:
        task.description = data['description']
    if 'due_date' in data:
        if data['due_date']:
            try:
                # Handle both date and datetime formats
                date_str = data['due_date']
                if 'T' not in date_str:
                    # If only date is provided, add time
                    date_str += 'T23:59:59'
                if not date_str.endswith('Z') and '+' not in date_str and '-' not in date_str[-6:]:
                    # If no timezone info, assume local time
                    date_str += 'Z'
                parsed_date = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
                task.due_date = ensure_utc(parsed_date)
            except ValueError:
                return jsonify({'msg': 'Invalid date format. Use ISO format with timezone.'}), 400
        else:
            task.due_date = None
    
    if 'status' in data:
        status_mapping = {
            'To Do': 'pending',
            'In Progress': 'in_progress', 
            'Done': 'completed',
            'pending': 'pending',
            'in_progress': 'in_progress',
            'completed': 'completed'
        }
        task.status = status_mapping.get(data['status'], 'pending')
    if 'project_id' in data:
        task.project_id = data['project_id']
    if 'owner_id' in data:
        task.owner_id = data['owner_id']
    db.session.commit()
    return jsonify({'msg': 'Task updated'})

@task_bp.route('/tasks/<int:task_id>', methods=['DELETE'])
@jwt_required()
@invalidate_cache_on_change(['tasks', 'projects'])
def delete_task_direct(task_id):
    user_id = int(get_jwt_identity())
    task = Task.query.get_or_404(task_id)
    project = task.project
    
    # Check permissions - project owner, task assignee, or project editor can delete
    from models.project import Membership
    user_membership = Membership.query.filter_by(
        user_id=user_id, 
        project_id=project.id
    ).first()
    
    can_delete = (
        project.owner_id == user_id or 
        task.owner_id == user_id or 
        (user_membership and user_membership.is_editor)
    )
    
    if not can_delete:
        return jsonify({'msg': 'Not authorized to delete this task'}), 403
    
    # Delete task attachments first
    TaskAttachment.query.filter_by(task_id=task_id).delete()
    
    # Delete the task
    db.session.delete(task)
    db.session.commit()
    return jsonify({'msg': 'Task deleted'})

@task_bp.route('/tasks/<int:task_id>/status', methods=['PUT'])
@jwt_required()
@invalidate_cache_on_change(['tasks', 'projects'])
def update_task_status(task_id):
    user_id = int(get_jwt_identity())
    data = request.get_json()
    
    if not data or 'status' not in data:
        return jsonify({'msg': 'Status is required'}), 400
        
    task = Task.query.get_or_404(task_id)
    project = task.project
    
    if not any(member.id == user_id for member in project.members):
        return jsonify({'msg': 'Not authorized'}), 403
    
    status_mapping = {
        'Not Started': 'pending',
        'In Progress': 'in_progress', 
        'Completed': 'completed',
        'pending': 'pending',
        'in_progress': 'in_progress',
        'completed': 'completed'
    }
    new_status = status_mapping.get(data['status'], 'pending')
    task.status = new_status
    
    db.session.commit()
    return jsonify({'msg': 'Task status updated'})

