from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
import cloudinary.uploader
import logging
from models import Task, User, Project, TaskAttachment, Notification, Status
from extensions import db
from utils.email import send_email
from utils.datetime_utils import ensure_utc

logger = logging.getLogger(__name__)

task_bp = Blueprint('task', __name__)

# Helper functions for status management
def get_status_id_from_name(status_name):
    """Get status ID from status name, with fallback creation for legacy statuses."""
    if not status_name:
        status_name = 'pending'
    
    status = Status.query.filter_by(name=status_name).first()
    if status:
        return status.id
    
    # If status doesn't exist, initialize default statuses
    Status.initialize_default_statuses()
    status = Status.query.filter_by(name=status_name).first()
    return status.id if status else 1  # Default to first status

def normalize_status_input(status_input):
    """Normalize various status input formats to standard status name."""
    if not status_input:
        return 'pending'
    
    status_mapping = {
        'To Do': 'pending',
        'Not Started': 'pending',
        'In Progress': 'in_progress', 
        'Done': 'completed',
        'Completed': 'completed',
        'pending': 'pending',
        'in_progress': 'in_progress',
        'completed': 'completed'
    }
    
    return status_mapping.get(status_input, 'pending')

@task_bp.route('/projects/<int:project_id>/tasks', methods=['POST'])
@jwt_required()
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
    status_input = data.get('status', 'pending')
    # Normalize status input and get status_id
    status_name = normalize_status_input(status_input)
    status_id = get_status_id_from_name(status_name)
    
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
        status_id=status_id,
        project_id=project_id,
        owner_id=assignee.id if assignee else user_id
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
            notification = Notification(
                user_id=assignee.id, 
                message=message,
                task_id=task.id,
                project_id=project.id,
                notification_type='assigned'
            )
            db.session.add(notification)
            if hasattr(assignee, 'notify_email') and assignee.notify_email:
                send_email("Task Assigned", [assignee.email], "", message)
            db.session.commit()
    return jsonify({'msg': 'Task created', 'task_id': task.id}), 201

@task_bp.route('/tasks/<int:task_id>/attachment', methods=['POST'])
@jwt_required()
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
def get_all_tasks():
    user_id = int(get_jwt_identity())
    
    # Parse query parameters for filtering
    search = request.args.get('search', '').strip()
    project_id = request.args.get('project_id')
    status = request.args.get('status')
    limit = min(int(request.args.get('limit', 50)), 100)
    offset = int(request.args.get('offset', 0))
    
    try:
        # Base query: Get tasks from projects where user is a member
        from models.project import Membership
        query = db.session.query(Task).join(Project).join(Membership).filter(
            Membership.user_id == user_id
        )
        
        # Apply search filter
        if search:
            search_pattern = f"%{search}%"
            query = query.filter(
                db.or_(
                    Task.title.ilike(search_pattern),
                    Task.description.ilike(search_pattern)
                )
            )
        
        # Apply project filter
        if project_id:
            query = query.filter(Task.project_id == project_id)
        
        # Apply status filter
        if status:
            # Map frontend status values to enum values
            status_mapping = {
                'pending': 'pending',
                'in_progress': 'in_progress', 
                'completed': 'completed'
            }
            mapped_status = status_mapping.get(status)
            if mapped_status:
                query = query.filter(Task.status == mapped_status)
        
        # Get total count for pagination
        total_count = query.count()
        
        # Apply pagination and ordering
        tasks = query.order_by(Task.created_at.desc()).offset(offset).limit(limit).all()
        
        tasks_data = []
        for task in tasks:
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
                'status': task.current_status,  # Use new status system
                'status_id': task.status_id,
                'status_info': task.get_status_dict(),
                'project_id': task.project_id,
                'owner_id': task.owner_id,
                'assignee_id': task.owner_id,
                'assignee': assignee_name,
                'assigned_to_name': assignee_name,
                'created_at': task.created_at.isoformat() if task.created_at else None,
                'project_name': task.project.name if task.project else None,
                'total_expenses': task.total_expenses,
                'is_favorite': task.is_favorite
            }
            tasks_data.append(task_data)
        
        return jsonify({
            'tasks': tasks_data,
            'pagination': {
                'total': total_count,
                'limit': limit,
                'offset': offset,
                'has_more': offset + limit < total_count
            }
        }), 200
        
    except Exception as e:
        print(f"Get all tasks error: {e}")
        return jsonify({'msg': 'An error occurred while fetching tasks'}), 500

@task_bp.route('/tasks', methods=['POST'])
@jwt_required()
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
    
    status_input = data.get('status', 'pending')
    # Normalize status input and get status_id
    status_name = normalize_status_input(status_input)
    status_id = get_status_id_from_name(status_name)
    
    assignee = None
    if 'assigned_to' in data and data['assigned_to']:
        # Handle both user ID and email for assignee
        assigned_to_value = data['assigned_to']
        try:
            # Try to convert to int (user ID)
            assignee_id = int(assigned_to_value)
            assignee = User.query.get(assignee_id)
        except (ValueError, TypeError):
            # If conversion fails, treat as email
            assignee = User.query.filter_by(email=assigned_to_value).first()
        
        if not assignee:
            return jsonify({'msg': 'Assignee not found'}), 404
        if not any(member.id == assignee.id for member in project.members):
            return jsonify({'msg': 'Assignee must be project member'}), 400
    
    task = Task(
        title=title, 
        description=description, 
        due_date=due_date,
        status_id=status_id,
        project_id=project_id,
        owner_id=assignee.id if assignee else user_id
    )
    
    # Add budget if provided
    if 'budget' in data and data['budget']:
        try:
            task.budget = float(data['budget'])
        except (ValueError, TypeError):
            return jsonify({'msg': 'Invalid budget value'}), 400
    
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
            notification = Notification(
                user_id=assignee.id, 
                message=message,
                task_id=task.id,
                project_id=project.id,
                notification_type='assigned'
            )
            db.session.add(notification)
            if hasattr(assignee, 'notify_email') and assignee.notify_email:
                send_email("Task Assigned", [assignee.email], "", message)
            db.session.commit()
    
    return jsonify({'msg': 'Task created', 'task_id': task.id}), 201

@task_bp.route('/tasks/<int:task_id>', methods=['PUT'])
@jwt_required()
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
        # Handle both status name and status_id
        status_input = data['status']
        status_name = normalize_status_input(status_input)
        status_id = get_status_id_from_name(status_name)
        task.status_id = status_id
    elif 'status_id' in data:
        # Direct status_id update
        task.status_id = data['status_id']
    # Prevent changing project_id - tasks cannot be moved between projects
    if 'project_id' in data and str(data['project_id']) != str(task.project_id):
        return jsonify({'msg': 'Project assignment cannot be changed when editing a task'}), 400
    if 'owner_id' in data:
        task.owner_id = data['owner_id']
    if 'assigned_to' in data:
        # Handle both user ID and email for assignee
        assigned_to_value = data['assigned_to']
        try:
            # Try to convert to int (user ID)
            assignee_id = int(assigned_to_value)
            # Verify user exists
            assignee = User.query.get(assignee_id)
            if assignee:
                task.owner_id = assignee_id
            else:
                return jsonify({'msg': 'Assignee not found'}), 404
        except (ValueError, TypeError):
            # If conversion fails, treat as email
            assignee = User.query.filter_by(email=assigned_to_value).first()
            if assignee:
                task.owner_id = assignee.id
            else:
                return jsonify({'msg': 'Assignee not found'}), 404
        
        # Verify assignee is a project member
        if not any(member.id == task.owner_id for member in project.members):
            return jsonify({'msg': 'Assignee must be project member'}), 400
    
    # Add budget field support
    if 'budget' in data:
        if data['budget']:
            try:
                task.budget = float(data['budget'])
            except (ValueError, TypeError):
                return jsonify({'msg': 'Invalid budget value'}), 400
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
def update_task_status(task_id):
    user_id = int(get_jwt_identity())
    data = request.get_json()
    
    if not data or 'status' not in data:
        return jsonify({'msg': 'Status is required'}), 400
        
    task = Task.query.get_or_404(task_id)
    project = task.project
    
    if not any(member.id == user_id for member in project.members):
        return jsonify({'msg': 'Not authorized'}), 403
    
    # Handle both status name and status_id
    if 'status_id' in data:
        task.status_id = data['status_id']
    else:
        status_input = data['status']
        status_name = normalize_status_input(status_input)
        status_id = get_status_id_from_name(status_name)
        task.status_id = status_id
    
    db.session.commit()
    return jsonify({'msg': 'Task status updated'})

@task_bp.route('/tasks/<int:task_id>/favorite', methods=['PUT'])
@jwt_required()
def update_task_favorite(task_id):
    """Update the favorite status of a task"""
    user_id = int(get_jwt_identity())
    data = request.get_json()
    
    if not data or 'is_favorite' not in data:
        return jsonify({'msg': 'is_favorite field is required'}), 400
        
    task = Task.query.get_or_404(task_id)
    project = task.project
    
    # Check if user has access to this task
    if not any(member.id == user_id for member in project.members):
        return jsonify({'msg': 'Not authorized'}), 403
    
    # Update favorite status
    task.is_favorite = bool(data['is_favorite'])
    
    db.session.commit()
    return jsonify({
        'msg': 'Task favorite status updated',
        'is_favorite': task.is_favorite
    })

@task_bp.route('/tasks/<int:task_id>', methods=['GET'])
@jwt_required()
def get_task(task_id):
    user_id = int(get_jwt_identity())
    task = Task.query.get_or_404(task_id)
    project = task.project
    
    if not any(member.id == user_id for member in project.members):
        return jsonify({'success': False, 'message': 'Not authorized'}), 403
    
    # Get assignee name
    assignee_name = None
    if task.owner_id:
        assignee = User.query.get(task.owner_id)
        assignee_name = assignee.full_name if assignee else 'Unknown User'
    
    # Get task expenses
    from models.expense import Expense
    task_expenses = Expense.query.filter_by(task_id=task_id).all()
    
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
        'status': task.current_status,  # Use new status system
        'status_id': task.status_id,
        'status_info': task.get_status_dict(),
        'project_id': task.project_id,
        'owner_id': task.owner_id,
        'assignee_id': task.owner_id,
        'assignee': assignee_name,
        'assigned_to_name': assignee_name,
        'created_at': task.created_at.isoformat() if task.created_at else None,
        'project_name': task.project.name if task.project else None,
        'total_expenses': task.total_expenses,
        'expenses': expenses_data,
        'attachments': attachments,
        'priority_score': task.priority_score,
        'estimated_effort': task.estimated_effort,
        'percent_complete': task.percent_complete,
        'parent_task_id': task.parent_task_id,
        'dependency_count': task.dependency_count,
        'is_overdue': task.is_overdue(),
        'is_favorite': task.is_favorite
    }
    return jsonify({'success': True, 'data': task_data})

@task_bp.route('/projects/<int:project_id>/tasks', methods=['GET'])
@jwt_required()
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
            # Return raw status values for consistency with frontend
            # Reason: Frontend expects 'pending', 'in_progress', 'completed' for proper synchronization
            raw_status = task.status.value if hasattr(task.status, 'value') else str(task.status)
            
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
                'status': raw_status,
                'project_id': task.project_id,
                'owner_id': task.owner_id,
                'assignee_id': task.owner_id,
                'assignee': assignee_name,
                'assigned_to_name': assignee_name,
                'created_at': task.created_at.isoformat() if task.created_at else None,
                'project_name': task.project.name if task.project else None,
                'total_expenses': task.total_expenses,
                'is_favorite': task.is_favorite
            }
            tasks_data.append(task_data)
        
        return jsonify(tasks_data), 200
        
    except Exception as e:
        logger.error(f"Get project tasks error: {e}")
        return jsonify({'msg': 'An error occurred while fetching project tasks'}), 500

@task_bp.route('/projects/<int:project_id>/tasks/grouped', methods=['GET'])
@jwt_required()
def get_project_tasks_grouped(project_id):
    """Get all tasks for a specific project grouped by status"""
    user_id = int(get_jwt_identity())
    
    # Check if user has access to this project
    project = Project.query.get_or_404(project_id)
    if not any(member.id == user_id for member in project.members):
        return jsonify({'msg': 'Not authorized'}), 403
    
    try:
        # Get all tasks for this project
        tasks = Task.query.filter_by(project_id=project_id).order_by(Task.created_at.desc()).all()
        
        # Group tasks by status with favorites at the top of each group
        grouped_tasks = {
            'pending': [],
            'in_progress': [],
            'completed': []
        }
        
        for task in tasks:
            # Return raw status values for consistency with frontend
            raw_status = task.status.value if hasattr(task.status, 'value') else str(task.status)
            
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
                'status': raw_status,
                'project_id': task.project_id,
                'owner_id': task.owner_id,
                'assignee_id': task.owner_id,
                'assignee': assignee_name,
                'assigned_to_name': assignee_name,
                'created_at': task.created_at.isoformat() if task.created_at else None,
                'project_name': task.project.name if task.project else None,
                'total_expenses': task.total_expenses,
                'is_favorite': task.is_favorite
            }
            
            # Add to appropriate status group
            if raw_status in grouped_tasks:
                grouped_tasks[raw_status].append(task_data)
        
        # Sort each group with favorites first
        for status in grouped_tasks:
            grouped_tasks[status].sort(key=lambda x: (not x['is_favorite'], x['created_at']))
        
        return jsonify(grouped_tasks), 200
        
    except Exception as e:
        logger.error(f"Get project tasks grouped error: {e}")
        return jsonify({'msg': 'An error occurred while fetching project tasks'}), 500

@task_bp.route('/tasks/grouped', methods=['GET'])
@jwt_required()
def get_all_tasks_grouped():
    """Get all tasks for user grouped by status"""
    user_id = int(get_jwt_identity())
    
    # Parse query parameters for filtering
    search = request.args.get('search', '').strip()
    project_id = request.args.get('project_id')
    limit = min(int(request.args.get('limit', 200)), 500)  # Higher limit for board view
    offset = int(request.args.get('offset', 0))
    
    try:
        # Base query: Get tasks from projects where user is a member
        from models.project import Membership
        query = db.session.query(Task).join(Project).join(Membership).filter(
            Membership.user_id == user_id
        )
        
        # Apply search filter
        if search:
            search_pattern = f"%{search}%"
            query = query.filter(
                db.or_(
                    Task.title.ilike(search_pattern),
                    Task.description.ilike(search_pattern)
                )
            )
        
        # Apply project filter
        if project_id:
            query = query.filter(Task.project_id == project_id)
        
        # Get tasks with pagination
        tasks = query.order_by(Task.created_at.desc()).offset(offset).limit(limit).all()
        
        # Group tasks by status with favorites at the top of each group
        grouped_tasks = {
            'pending': [],
            'in_progress': [],
            'completed': []
        }
        
        for task in tasks:
            # Return raw status values for consistency with frontend
            raw_status = task.status.value if hasattr(task.status, 'value') else str(task.status)
            
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
                'status': raw_status,
                'project_id': task.project_id,
                'owner_id': task.owner_id,
                'assignee_id': task.owner_id,
                'assignee': assignee_name,
                'assigned_to_name': assignee_name,
                'created_at': task.created_at.isoformat() if task.created_at else None,
                'project_name': task.project.name if task.project else None,
                'total_expenses': task.total_expenses,
                'is_favorite': task.is_favorite
            }
            
            # Add to appropriate status group
            if raw_status in grouped_tasks:
                grouped_tasks[raw_status].append(task_data)
        
        # Sort each group with favorites first
        for status in grouped_tasks:
            grouped_tasks[status].sort(key=lambda x: (not x['is_favorite'], x['created_at']))
        
        return jsonify(grouped_tasks), 200
        
    except Exception as e:
        logger.error(f"Get all tasks grouped error: {e}")
        return jsonify({'msg': 'An error occurred while fetching tasks'}), 500

