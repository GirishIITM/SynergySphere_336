from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import Task, User, Project, TaskStatus
from extensions import db
from services.priority_service import PriorityService
from services.deadline_service import DeadlineService
from sqlalchemy import and_, or_
from datetime import datetime, timezone
from utils.datetime_utils import ensure_utc
import traceback

task_advanced_bp = Blueprint('task_advanced', __name__)

@task_advanced_bp.route('/projects/<int:project_id>/tasks/prioritized', methods=['GET'])
@jwt_required()
def get_prioritized_tasks(project_id):
    try:
        user_id = int(get_jwt_identity())
        
        # Verify project exists and user has access
        project = Project.query.get_or_404(project_id)
        if project.owner_id != user_id and not any(m.id == user_id for m in project.members):
            return jsonify({'error': 'Unauthorized access to project'}), 403
        
        # Get tasks for the project
        tasks = Task.query.filter_by(project_id=project_id).all()
        
        # Calculate priority scores and sort tasks
        prioritized_tasks = []
        for task in tasks:
            try:
                # Basic priority calculation (can be enhanced)
                priority_score = 0
                
                # Status weight
                status_weights = {
                    TaskStatus.pending.value: 1,
                    TaskStatus.in_progress.value: 2,
                    TaskStatus.completed.value: 0
                }
                
                # Get status value safely
                status_value = task.status.value if isinstance(task.status, TaskStatus) else str(task.status)
                priority_score += status_weights.get(status_value, 1)
                
                # Due date weight (if due date exists)
                if task.due_date:
                    # Ensure both dates are timezone-aware
                    current_time = datetime.now(timezone.utc)
                    due_date = ensure_utc(task.due_date)
                    days_until_due = (due_date - current_time).days
                    
                    if days_until_due < 0:  # Overdue
                        priority_score += 3
                    elif days_until_due <= 3:  # Due soon
                        priority_score += 2
                    elif days_until_due <= 7:  # Due within a week
                        priority_score += 1
                
                # Get status value safely for response
                task_status = task.status.value if isinstance(task.status, TaskStatus) else str(task.status)
                
                prioritized_tasks.append({
                    'id': task.id,
                    'title': task.title,
                    'description': task.description,
                    'status': task_status,
                    'due_date': task.due_date.isoformat() if task.due_date else None,
                    'priority_score': priority_score,
                    'project_id': task.project_id,
                    'owner_id': task.owner_id
                })
            except Exception as task_error:
                print(f"Error processing task {task.id}: {str(task_error)}")
                print(traceback.format_exc())
                continue
        
        # Sort by priority score (highest first)
        prioritized_tasks.sort(key=lambda x: x['priority_score'], reverse=True)
        
        return jsonify({
            'tasks': prioritized_tasks,
            'project_id': project_id
        }), 200
        
    except Exception as e:
        print(f"Error getting prioritized tasks: {str(e)}")
        print("Full traceback:")
        print(traceback.format_exc())
        return jsonify({'error': f'Failed to get prioritized tasks: {str(e)}'}), 500

@task_advanced_bp.route('/tasks/at_risk', methods=['GET'])
@jwt_required()
def get_at_risk_tasks():
    """Get all tasks assigned to user that are at risk of missing deadlines."""
    user_id = int(get_jwt_identity())
    try:
        at_risk_tasks = DeadlineService.get_tasks_at_risk(user_id)
        return jsonify(at_risk_tasks), 200
    except Exception as e:
        return jsonify({'msg': 'Error fetching at-risk tasks'}), 500

@task_advanced_bp.route('/tasks/<int:task_id>/progress', methods=['PUT'])
@jwt_required()
def update_task_progress(task_id):
    """Update task progress percentage."""
    user_id = int(get_jwt_identity())
    data = request.get_json()
    
    if not data or 'percent_complete' not in data:
        return jsonify({'msg': 'Percent complete is required'}), 400
    
    task = Task.query.get_or_404(task_id)
    project = task.project
    
    if not any(member.id == user_id for member in project.members):
        return jsonify({'msg': 'Not authorized'}), 403
    
    try:
        percent_complete = int(data['percent_complete'])
        success = DeadlineService.update_task_progress(task_id, percent_complete)
        if success:
            return jsonify({'msg': 'Task progress updated'}), 200
        else:
            return jsonify({'msg': 'Failed to update task progress'}), 400
    except ValueError:
        return jsonify({'msg': 'Invalid percent_complete value'}), 400

@task_advanced_bp.route('/users/<int:user_id>/priority_scores', methods=['POST'])
@jwt_required()
def recalculate_priority_scores(user_id):
    try:
        # Verify the requesting user matches the user_id
        requesting_user_id = int(get_jwt_identity())
        if requesting_user_id != user_id:
            return jsonify({'error': 'Unauthorized'}), 403
        
        # Get all tasks for the user
        tasks = Task.query.filter(
            Task.owner_id == user_id
        ).all()
        
        # Recalculate priority scores
        for task in tasks:
            # Basic priority calculation (can be enhanced)
            priority_score = 0
            
            # Status weight
            status_weights = {
                TaskStatus.pending.value: 1,
                TaskStatus.in_progress.value: 2,
                TaskStatus.completed.value: 0
            }
            
            # Get status value safely
            status_value = task.status.value if isinstance(task.status, TaskStatus) else str(task.status)
            priority_score += status_weights.get(status_value, 1)
            
            # Due date weight (if due date exists)
            if task.due_date:
                current_time = datetime.now(timezone.utc)
                due_date = ensure_utc(task.due_date)
                days_until_due = (due_date - current_time).days
                
                if days_until_due < 0:  # Overdue
                    priority_score += 3
                elif days_until_due <= 3:  # Due soon
                    priority_score += 2
                elif days_until_due <= 7:  # Due within a week
                    priority_score += 1
            
            # Update task priority score
            task.priority_score = priority_score
        
        db.session.commit()
        
        return jsonify({
            'message': 'Priority scores recalculated successfully',
            'tasks_updated': len(tasks)
        }), 200
        
    except Exception as e:
        print(f"Error recalculating priority scores: {e}")
        return jsonify({'error': 'Failed to recalculate priority scores'}), 500

@task_advanced_bp.route('/users/<int:user_id>/reminders/check', methods=['POST'])
@jwt_required()
def trigger_reminder_check(user_id):
    """Manually trigger reminder check for a user."""
    try:
        # Verify the requesting user matches the user_id
        requesting_user_id = int(get_jwt_identity())
        if requesting_user_id != user_id:
            return jsonify({'error': 'Unauthorized'}), 403
        
        result = DeadlineService.scan_and_notify(user_id)
        
        return jsonify(result), 200
        
    except Exception as e:
        print(f"Error triggering reminder check: {e}")
        return jsonify({'error': 'Failed to trigger reminder check'}), 500