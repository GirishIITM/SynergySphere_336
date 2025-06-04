from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import func, and_, or_
from datetime import datetime, timezone, timedelta

from models import User, Project, Task, Membership
from extensions import db
from utils.route_cache import cache_route
from utils.datetime_utils import get_utc_now, ensure_utc, is_expired

dashboard_bp = Blueprint('dashboard', __name__)

@dashboard_bp.route('/dashboard/overview', methods=['GET'])
@jwt_required()
@cache_route(ttl=300, user_specific=True)  # Cache for 5 minutes
def get_dashboard_overview():
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get_or_404(user_id)
        
        user_projects = db.session.query(Project).join(
            Membership, Project.id == Membership.project_id
        ).filter(
            or_(Project.owner_id == user_id, Membership.user_id == user_id)
        ).distinct().all()
        
        project_ids = [p.id for p in user_projects]
        
        user_tasks = Task.query.filter(
            or_(
                Task.project_id.in_(project_ids),
                Task.owner_id == user_id
            )
        ).all()
        
        total_tasks = len(user_tasks)
        completed_tasks = len([t for t in user_tasks if t.status == 'completed'])
        in_progress_tasks = len([t for t in user_tasks if t.status == 'in_progress'])
        pending_tasks = len([t for t in user_tasks if t.status == 'pending'])
        
        current_time = get_utc_now()
        overdue_tasks = len([
            t for t in user_tasks 
            if t.due_date and ensure_utc(t.due_date) < current_time and t.status != 'completed'
        ])
        
        recent_projects = sorted(user_projects, key=lambda p: ensure_utc(p.updated_at or p.created_at), reverse=True)[:5]
        recent_projects_data = []
        for project in recent_projects:
            project_tasks = [t for t in user_tasks if t.project_id == project.id]
            project_completed = len([t for t in project_tasks if t.status == 'completed'])
            
            recent_projects_data.append({
                'id': project.id,
                'name': project.name,
                'description': project.description,
                'created_at': project.created_at.isoformat() if project.created_at else None,
                'updated_at': project.updated_at.isoformat() if project.updated_at else None,
                'deadline': project.deadline.isoformat() if project.deadline else None,
                'task_count': len(project_tasks),
                'completed_tasks': project_completed,
                'is_owner': project.owner_id == user_id
            })
        
        recent_tasks = sorted(user_tasks, key=lambda t: ensure_utc(t.created_at or datetime.min.replace(tzinfo=timezone.utc)), reverse=True)[:5]
        recent_tasks_data = []
        for task in recent_tasks:
            assignee_name = None
            if task.owner_id:
                assignee = User.query.get(task.owner_id)
                assignee_name = assignee.full_name if assignee else 'Unknown User'
            
            project_name = 'Unknown Project'
            if task.project:
                project_name = task.project.name
            
            status_mapping = {
                'pending': 'Not Started',
                'in_progress': 'In Progress',
                'completed': 'Completed'
            }
            readable_status = status_mapping.get(task.status, 'Not Started')
            
            recent_tasks_data.append({
                'id': task.id,
                'title': task.title,
                'description': task.description,
                'status': readable_status,
                'due_date': task.due_date.isoformat() if task.due_date else None,
                'created_at': task.created_at.isoformat() if task.created_at else None,
                'project_id': task.project_id,
                'project_name': project_name,
                'assignee': assignee_name,
                'is_overdue': task.due_date and ensure_utc(task.due_date) < current_time and task.status != 'completed'
            })
        
        last_week = current_time - timedelta(days=7)
        weekly_tasks = len([t for t in user_tasks if t.created_at and ensure_utc(t.created_at) >= last_week])
        weekly_projects = len([p for p in user_projects if p.created_at and ensure_utc(p.created_at) >= last_week])
        
        all_member_ids = set()
        for project in user_projects:
            all_member_ids.add(project.owner_id)
            for member in project.members:
                all_member_ids.add(member.id)
        team_member_count = len(all_member_ids)
        
        completion_rate = round((completed_tasks / total_tasks * 100) if total_tasks > 0 else 0, 1)
        
        return jsonify({
            'user': {
                'id': user.id,
                'name': user.full_name,
                'email': user.email
            },
            'statistics': {
                'total_projects': len(user_projects),
                'owned_projects': len([p for p in user_projects if p.owner_id == user_id]),
                'member_projects': len([p for p in user_projects if p.owner_id != user_id]),
                'total_tasks': total_tasks,
                'completed_tasks': completed_tasks,
                'in_progress_tasks': in_progress_tasks,
                'pending_tasks': pending_tasks,
                'overdue_tasks': overdue_tasks,
                'completion_rate': completion_rate,
                'team_members': team_member_count,
                'weekly_activity': {
                    'new_tasks': weekly_tasks,
                    'new_projects': weekly_projects
                }
            },
            'recent_projects': recent_projects_data,
            'recent_tasks': recent_tasks_data
        }), 200
        
    except Exception as e:
        print(f"Dashboard overview error: {e}")
        return jsonify({'msg': 'Failed to fetch dashboard data'}), 500

@dashboard_bp.route('/dashboard/stats', methods=['GET'])
@jwt_required()
@cache_route(ttl=180, user_specific=True)  # Cache for 3 minutes
def get_dashboard_stats():
    try:
        user_id = int(get_jwt_identity())
        
        projects_count = db.session.query(func.count(Project.id)).join(
            Membership, Project.id == Membership.project_id
        ).filter(
            or_(Project.owner_id == user_id, Membership.user_id == user_id)
        ).scalar()
        
        tasks_count = Task.query.filter(Task.owner_id == user_id).count()
        completed_count = Task.query.filter(
            and_(Task.owner_id == user_id, Task.status == 'completed')
        ).count()
        
        return jsonify({
            'total_projects': projects_count or 0,
            'total_tasks': tasks_count or 0,
            'completed_tasks': completed_count or 0,
            'pending_tasks': (tasks_count or 0) - (completed_count or 0)
        }), 200
        
    except Exception as e:
        print(f"Dashboard stats error: {e}")
        return jsonify({'msg': 'Failed to fetch dashboard stats'}), 500
