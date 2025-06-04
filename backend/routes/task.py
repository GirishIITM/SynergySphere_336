from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
import cloudinary.uploader
import logging
from models import Task, User, Project, TaskAttachment, Notification
from extensions import db
from utils.email import send_email
from utils.datetime_utils import ensure_utc
from utils.route_cache import cache_route, invalidate_cache_on_change

logger = logging.getLogger(__name__)

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
    
    # Get budget from request data with validation
    budget = data.get('budget')
    if budget is not None:
        try:
            budget = float(budget)
            if budget < 0:
                return jsonify({'msg': 'Budget must be a positive number'}), 400
        except (ValueError, TypeError):
            return jsonify({'msg': 'Budget must be a valid number'}), 400
    
    task = Task(
        title=title, 
        description=description, 
        due_date=due_date,
        status=status, 
        project_id=project_id,
        owner_id=assignee.id if assignee else user_id,
        budget=budget
    )
    db.session.add(task)
    db.session.commit()
    
    # Send assignment notification if assigning to someone else
    if assignee and assignee.id != user_id:
        try:
            from tasks.notification_tasks import send_task_assignment_notification
            send_task_assignment_notification.delay(task.id, assignee.id, user_id)
        except Exception as e:
            # Fallback to direct notification if Celery is not available
            logger.warning(f"Celery task failed, using direct notification: {e}")
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
            'project_name': task.project.name if task.project else None,
            'budget': task.budget
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
    
    # Get budget from request data with validation
    budget = data.get('budget')
    if budget is not None:
        try:
            budget = float(budget)
            if budget < 0:
                return jsonify({'msg': 'Budget must be a positive number'}), 400
        except (ValueError, TypeError):
            return jsonify({'msg': 'Budget must be a valid number'}), 400
    
    task = Task(
        title=title, 
        description=description, 
        due_date=due_date, 
        status=status, 
        project_id=project_id, 
        owner_id=assignee_id if assignee_id else user_id,
        budget=budget
    )
    db.session.add(task)
    db.session.commit()
    
    # Schedule dynamic reminders for the new task
    if due_date:
        from services.deadline_service import DeadlineService
        DeadlineService.schedule_dynamic_reminders(task.id)
    
    # Send assignment notification if assigning to someone else
    if assignee_id and assignee_id != user_id:
        try:
            from tasks.notification_tasks import send_task_assignment_notification
            send_task_assignment_notification.delay(task.id, assignee_id, user_id)
        except Exception as e:
            # Fallback to direct notification if Celery is not available
            logger.warning(f"Celery task failed, using direct notification: {e}")
            message = f"You have been assigned task '{task.title}' in project '{project.name}'"
            notification = Notification(user_id=assignee_id, message=message)
            db.session.add(notification)
            assignee = User.query.get(assignee_id)
            if assignee and hasattr(assignee, 'notify_email') and assignee.notify_email:
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
    due_date_changed = False
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
                old_due_date = task.due_date
                task.due_date = ensure_utc(parsed_date)
                due_date_changed = old_due_date != task.due_date
            except ValueError:
                return jsonify({'msg': 'Invalid date format. Use ISO format with timezone.'}), 400
        else:
            due_date_changed = task.due_date is not None
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
    
    # Handle budget updates
    if 'budget' in data:
        budget = data.get('budget')
        if budget is not None:
            try:
                budget = float(budget)
                if budget < 0:
                    return jsonify({'msg': 'Budget must be a positive number'}), 400
                task.budget = budget
            except (ValueError, TypeError):
                return jsonify({'msg': 'Budget must be a valid number'}), 400
        else:
            task.budget = None
    
    db.session.commit()
    
    # Reschedule reminders if due date changed
    if due_date_changed and task.due_date:
        from services.deadline_service import DeadlineService
        DeadlineService.schedule_dynamic_reminders(task.id)
    
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

@task_bp.route('/tasks/<int:task_id>', methods=['GET'])
@jwt_required()
@cache_route(ttl=120, user_specific=True)  # Cache for 2 minutes
def get_task(task_id):
    user_id = int(get_jwt_identity())
    task = Task.query.get_or_404(task_id)
    project = task.project
    
    if not any(member.id == user_id for member in project.members):
        return jsonify({'success': False, 'message': 'Not authorized'}), 403
    
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
    
    # Get task expenses and calculate financial metrics
    from models.expense import Expense
    task_expenses = Expense.query.filter_by(task_id=task_id).all()
    total_spent = sum(expense.amount for expense in task_expenses)
    budget_remaining = (task.budget - total_spent) if task.budget else None
    budget_utilization = (total_spent / task.budget * 100) if task.budget and task.budget > 0 else 0
    
    # Get attachments
    attachments = [{'id': att.id, 'file_url': att.file_url, 'uploaded_at': att.uploaded_at.isoformat()} 
                   for att in task.attachments]
    
    # Format expenses for response
    expenses_data = []
    for expense in task_expenses:
        # Get the user who created the expense
        expense_creator = User.query.get(expense.created_by) if expense.created_by else None
        expense_data = expense.to_dict()
        expense_data['created_by_name'] = expense_creator.full_name if expense_creator else 'Unknown User'
        expenses_data.append(expense_data)
    
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
        'project_name': task.project.name if task.project else None,
        'budget': task.budget,
        'total_spent': total_spent,
        'budget_remaining': budget_remaining,
        'budget_utilization': budget_utilization,
        'expenses': expenses_data,
        'attachments': attachments,
        'priority_score': task.priority_score,
        'estimated_effort': task.estimated_effort,
        'percent_complete': task.percent_complete,
        'parent_task_id': task.parent_task_id,
        'dependency_count': task.dependency_count,
        'is_overdue': task.is_overdue()
    }
    return jsonify({'success': True, 'data': task_data})

@task_bp.route('/projects/<int:project_id>/tasks', methods=['GET'])
@jwt_required()
@cache_route(ttl=120, user_specific=True)  # Cache for 2 minutes
def get_project_tasks(project_id):
    """Get all tasks for a specific project"""
    user_id = int(get_jwt_identity())
    
    # Check if user has access to this project
    project = Project.query.get_or_404(project_id)
    if not any(member.id == user_id for member in project.members):
        return jsonify({'msg': 'Not authorized'}), 403
    
    try:
        # Get all tasks for this project
        tasks = Task.query.filter_by(project_id=project_id).order_by(Task.created_at.desc()).all()
        
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
                'project_name': task.project.name if task.project else None,
                'budget': task.budget
            }
            tasks_data.append(task_data)
        
        return jsonify(tasks_data), 200
        
    except Exception as e:
        logger.error(f"Get project tasks error: {e}")
        return jsonify({'msg': 'An error occurred while fetching project tasks'}), 500

@task_bp.route('/tasks/<int:task_id>/messages', methods=['GET'])
@jwt_required()
@cache_route(ttl=30, user_specific=True)
def get_task_messages(task_id):
    """
    Get messages for a specific task.
    
    Query Parameters:
        limit (int): Maximum number of messages (default: 50)
        offset (int): Number of messages to skip (default: 0)
    
    Returns:
        JSON: Task messages with pagination info
    """
    try:
        user_id = int(get_jwt_identity())
        limit = request.args.get('limit', 50, type=int)
        offset = request.args.get('offset', 0, type=int)
        
        from services.task_chat_service import TaskChatService
        
        messages, error, has_more = TaskChatService.get_task_messages(
            task_id, user_id, limit, offset
        )
        
        if error:
            return jsonify({'error': error}), 403 if 'access denied' in error else 400
            
        return jsonify({
            'task_id': task_id,
            'messages': messages,
            'has_more': has_more,
            'count': len(messages)
        })
        
    except Exception as e:
        logger.error(f"Get task messages error: {str(e)}")
        return jsonify({'error': 'Failed to retrieve messages'}), 500

@task_bp.route('/tasks/<int:task_id>/messages', methods=['POST'])
@jwt_required()
@invalidate_cache_on_change(['task_messages'])
def post_task_message(task_id):
    """
    Post a new message to a task chat.
    
    Request Body:
        content (str): Message content
        
    Returns:
        JSON: Created message details
    """
    try:
        user_id = int(get_jwt_identity())
        data = request.get_json()
        content = data.get('content', '').strip()
        
        if not content:
            return jsonify({'error': 'Message content is required'}), 400
            
        from services.task_chat_service import TaskChatService
        
        message, error = TaskChatService.create_task_message(
            task_id, user_id, content
        )
        
        if error:
            return jsonify({'error': error}), 403 if 'access denied' in error else 400
            
        # Broadcast via Socket.IO if available
        try:
            from extensions import socketio
            from models import User
            
            user = User.query.get(user_id)
            message_data = {
                'id': message.id,
                'content': content,
                'user_id': user_id,
                'username': user.username,
                'full_name': user.full_name,
                'task_id': task_id,
                'created_at': message.created_at.isoformat(),
                'message_type': 'task_message'
            }
            
            room_name = f'task_{task_id}'
            socketio.emit('new_task_message', message_data, room=room_name)
            
        except Exception as socket_error:
            logger.warning(f"Socket.IO broadcast failed: {str(socket_error)}")
            
        return jsonify({
            'id': message.id,
            'content': content,
            'user_id': user_id,
            'task_id': task_id,
            'created_at': message.created_at.isoformat(),
            'message': 'Message posted successfully'
        }), 201
        
    except Exception as e:
        logger.error(f"Post task message error: {str(e)}")
        return jsonify({'error': 'Failed to post message'}), 500

@task_bp.route('/tasks/<int:task_id>/chat/participants', methods=['GET'])
@jwt_required()
@cache_route(ttl=300, user_specific=True)  # Cache for 5 minutes
def get_task_chat_participants(task_id):
    """
    Get list of users who can participate in task chat.
    
    Returns:
        JSON: List of participants with their details
    """
    try:
        user_id = int(get_jwt_identity())
        
        from services.task_chat_service import TaskChatService
        
        participants, error = TaskChatService.get_task_chat_participants(task_id, user_id)
        
        if error:
            return jsonify({'error': error}), 403 if 'access denied' in error else 400
            
        return jsonify({
            'task_id': task_id,
            'participants': participants,
            'count': len(participants)
        })
        
    except Exception as e:
        logger.error(f"Get task participants error: {str(e)}")
        return jsonify({'error': 'Failed to retrieve participants'}), 500

@task_bp.route('/tasks/<int:task_id>/chat/stats', methods=['GET'])
@jwt_required()
@cache_route(ttl=60, user_specific=True)  # Cache for 1 minute
def get_task_chat_stats(task_id):
    """
    Get chat statistics for a task.
    
    Returns:
        JSON: Chat statistics including message count
    """
    try:
        user_id = int(get_jwt_identity())
        
        from services.task_chat_service import TaskChatService
        
        message_count, error = TaskChatService.get_task_message_count(task_id, user_id)
        
        if error:
            return jsonify({'error': error}), 403 if 'access denied' in error else 400
            
        return jsonify({
            'task_id': task_id,
            'message_count': message_count,
            'has_chat': message_count > 0
        })
        
    except Exception as e:
        logger.error(f"Get task chat stats error: {str(e)}")
        return jsonify({'error': 'Failed to retrieve chat stats'}), 500

