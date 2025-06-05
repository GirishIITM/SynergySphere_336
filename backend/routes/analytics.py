"""
Analytics routes for SynergySphere platform.

Provides advanced analytics and reporting capabilities for projects,
tasks, user performance, and team productivity metrics.
"""

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import func, and_, or_, extract
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Any, Optional

from models import User, Project, Task, Membership, Expense
from extensions import db
from utils.datetime_utils import get_utc_now, ensure_utc
from services.analytics_service import AnalyticsService

analytics_bp = Blueprint('analytics', __name__)


@analytics_bp.route('/productivity', methods=['GET'])
@jwt_required()
def get_productivity_analytics():
    """
    Get user productivity analytics including task completion rates,
    time-based performance metrics, and productivity trends.

    Returns:
        dict: Productivity analytics data including completion rates,
              daily/weekly/monthly metrics, and trend analysis.
    """
    try:
        user_id = int(get_jwt_identity())
        days = request.args.get('days', 30, type=int)  # Default to 30 days
        
        # Validate days parameter
        if days not in [7, 14, 30, 60, 90]:
            days = 30
        
        end_date = get_utc_now()
        start_date = end_date - timedelta(days=days)
        
        # Get user's tasks within the specified period
        user_tasks = Task.query.filter(
            and_(
                Task.owner_id == user_id,
                Task.created_at >= start_date
            )
        ).all()
        
        # Calculate completion metrics
        total_tasks = len(user_tasks)
        completed_tasks = len([t for t in user_tasks if t.status == 'completed'])
        in_progress_tasks = len([t for t in user_tasks if t.status == 'in_progress'])
        completion_rate = round((completed_tasks / total_tasks * 100) if total_tasks > 0 else 0, 2)
        
        # Daily productivity breakdown
        daily_metrics = {}
        for i in range(days):
            day = end_date - timedelta(days=i)
            day_str = day.strftime('%Y-%m-%d')
            day_tasks = [t for t in user_tasks 
                        if t.created_at and t.created_at.date() == day.date()]
            day_completed = len([t for t in day_tasks if t.status == 'completed'])
            
            daily_metrics[day_str] = {
                'tasks_created': len(day_tasks),
                'tasks_completed': day_completed,
                'completion_rate': round((day_completed / len(day_tasks) * 100) if day_tasks else 0, 1)
            }
        
        # Weekly averages
        weeks = days // 7
        avg_tasks_per_week = round(total_tasks / weeks if weeks > 0 else total_tasks, 1)
        avg_completed_per_week = round(completed_tasks / weeks if weeks > 0 else completed_tasks, 1)
        
        # Overdue task analysis
        current_time = get_utc_now()
        overdue_tasks = [t for t in user_tasks 
                        if t.due_date and ensure_utc(t.due_date) < current_time 
                        and t.status != 'completed']
        
        return jsonify({
            'period': {
                'days': days,
                'start_date': start_date.isoformat(),
                'end_date': end_date.isoformat()
            },
            'overview': {
                'total_tasks': total_tasks,
                'completed_tasks': completed_tasks,
                'in_progress_tasks': in_progress_tasks,
                'overdue_tasks': len(overdue_tasks),
                'completion_rate': completion_rate
            },
            'averages': {
                'tasks_per_week': avg_tasks_per_week,
                'completed_per_week': avg_completed_per_week,
                'completion_rate': completion_rate
            },
            'daily_breakdown': daily_metrics,
            'trends': {
                'productivity_score': min(completion_rate * 1.2, 100),  # Weighted score
                'consistency_score': _calculate_consistency_score(daily_metrics)
            }
        }), 200
        
    except Exception as e:
        print(f"Productivity analytics error: {e}")
        return jsonify({'msg': 'Failed to fetch productivity analytics'}), 500


@analytics_bp.route('/projects', methods=['GET'])
@jwt_required()
def get_project_analytics():
    """
    Get comprehensive project analytics including performance metrics,
    resource allocation, and project health indicators.

    Returns:
        dict: Project analytics including completion rates, timeline analysis,
              and resource utilization metrics.
    """
    try:
        user_id = int(get_jwt_identity())
        
        # Get user's projects (owned or member)
        user_projects = db.session.query(Project).join(
            Membership, Project.id == Membership.project_id
        ).filter(
            or_(Project.owner_id == user_id, Membership.user_id == user_id)
        ).distinct().all()
        
        project_analytics = []
        
        for project in user_projects:
            # Get project tasks
            project_tasks = Task.query.filter(Task.project_id == project.id).all()
            total_tasks = len(project_tasks)
            completed_tasks = len([t for t in project_tasks if t.status == 'completed'])
            
            # Calculate project health metrics
            completion_rate = round((completed_tasks / total_tasks * 100) if total_tasks > 0 else 0, 1)
            
            # Timeline analysis
            current_time = get_utc_now()
            overdue_tasks = len([t for t in project_tasks 
                               if t.due_date and ensure_utc(t.due_date) < current_time 
                               and t.status != 'completed'])
            
            # Project deadline status
            deadline_status = 'on_track'
            if project.deadline:
                project_deadline = ensure_utc(project.deadline)
                if project_deadline < current_time:
                    deadline_status = 'overdue'
                elif project_deadline < current_time + timedelta(days=7):
                    deadline_status = 'at_risk'
            
            # Team size
            team_size = len(project.members) + 1  # Include owner
            
            project_analytics.append({
                'id': project.id,
                'name': project.name,
                'owner_id': project.owner_id,
                'is_owner': project.owner_id == user_id,
                'created_at': project.created_at.isoformat() if project.created_at else None,
                'deadline': project.deadline.isoformat() if project.deadline else None,
                'deadline_status': deadline_status,
                'metrics': {
                    'total_tasks': total_tasks,
                    'completed_tasks': completed_tasks,
                    'completion_rate': completion_rate,
                    'overdue_tasks': overdue_tasks,
                    'team_size': team_size
                },
                'health_score': _calculate_project_health_score(
                    completion_rate, overdue_tasks, total_tasks, deadline_status
                )
            })
        
        # Overall statistics
        total_projects = len(user_projects)
        owned_projects = len([p for p in user_projects if p.owner_id == user_id])
        avg_completion = round(
            sum(p['metrics']['completion_rate'] for p in project_analytics) / total_projects
            if total_projects > 0 else 0, 1
        )
        
        return jsonify({
            'overview': {
                'total_projects': total_projects,
                'owned_projects': owned_projects,
                'member_projects': total_projects - owned_projects,
                'average_completion_rate': avg_completion
            },
            'projects': project_analytics
        }), 200
        
    except Exception as e:
        print(f"Project analytics error: {e}")
        return jsonify({'msg': 'Failed to fetch project analytics'}), 500


@analytics_bp.route('/team', methods=['GET'])
@jwt_required()
def get_team_analytics():
    """
    Get team performance analytics including collaboration metrics,
    workload distribution, and team productivity indicators.

    Returns:
        dict: Team analytics including member performance, workload
              distribution, and collaboration patterns.
    """
    try:
        user_id = int(get_jwt_identity())
        
        # Get projects where user is owner (can see team analytics)
        owned_projects = Project.query.filter(Project.owner_id == user_id).all()
        
        if not owned_projects:
            return jsonify({
                'msg': 'No owned projects found. Team analytics require project ownership.'
            }), 403
        
        team_members = set()
        project_ids = [p.id for p in owned_projects]
        
        # Collect all team members from owned projects
        for project in owned_projects:
            team_members.add(project.owner_id)  # Include self
            for member in project.members:
                team_members.add(member.id)
        
        member_analytics = []
        
        for member_id in team_members:
            member = User.query.get(member_id)
            if not member:
                continue
                
            # Get member's tasks in owned projects
            member_tasks = Task.query.filter(
                and_(
                    Task.owner_id == member_id,
                    Task.project_id.in_(project_ids)
                )
            ).all()
            
            total_tasks = len(member_tasks)
            completed_tasks = len([t for t in member_tasks if t.status == 'completed'])
            completion_rate = round((completed_tasks / total_tasks * 100) if total_tasks > 0 else 0, 1)
            
            # Calculate workload and performance metrics
            current_time = get_utc_now()
            overdue_tasks = len([t for t in member_tasks 
                               if t.due_date and ensure_utc(t.due_date) < current_time 
                               and t.status != 'completed'])
            
            member_analytics.append({
                'user_id': member.id,
                'name': member.full_name,
                'email': member.email,
                'is_owner': member_id == user_id,
                'metrics': {
                    'total_tasks': total_tasks,
                    'completed_tasks': completed_tasks,
                    'completion_rate': completion_rate,
                    'overdue_tasks': overdue_tasks,
                    'active_tasks': total_tasks - completed_tasks
                },
                'performance_score': _calculate_performance_score(
                    completion_rate, overdue_tasks, total_tasks
                )
            })
        
        # Team-wide statistics
        total_team_tasks = sum(m['metrics']['total_tasks'] for m in member_analytics)
        total_completed = sum(m['metrics']['completed_tasks'] for m in member_analytics)
        team_completion_rate = round((total_completed / total_team_tasks * 100) 
                                   if total_team_tasks > 0 else 0, 1)
        
        return jsonify({
            'team_overview': {
                'total_members': len(team_members),
                'total_projects': len(owned_projects),
                'total_tasks': total_team_tasks,
                'completed_tasks': total_completed,
                'team_completion_rate': team_completion_rate
            },
            'members': member_analytics,
            'workload_distribution': _calculate_workload_distribution(member_analytics)
        }), 200
        
    except Exception as e:
        print(f"Team analytics error: {e}")
        return jsonify({'msg': 'Failed to fetch team analytics'}), 500


def _calculate_consistency_score(daily_metrics: Dict) -> float:
    """
    Calculate productivity consistency score based on daily task completion.
    
    Args:
        daily_metrics (Dict): Daily productivity metrics
        
    Returns:
        float: Consistency score (0-100)
    """
    if not daily_metrics:
        return 0.0
    
    completion_rates = [day['completion_rate'] for day in daily_metrics.values()]
    if not completion_rates:
        return 0.0
    
    # Calculate standard deviation to measure consistency
    mean_rate = sum(completion_rates) / len(completion_rates)
    variance = sum((rate - mean_rate) ** 2 for rate in completion_rates) / len(completion_rates)
    std_dev = variance ** 0.5
    
    # Convert to consistency score (lower std_dev = higher consistency)
    consistency_score = max(0, 100 - (std_dev * 2))
    return round(consistency_score, 1)


def _calculate_project_health_score(completion_rate: float, overdue_tasks: int, 
                                  total_tasks: int, deadline_status: str) -> float:
    """
    Calculate project health score based on multiple factors.
    
    Args:
        completion_rate (float): Project completion percentage
        overdue_tasks (int): Number of overdue tasks
        total_tasks (int): Total number of tasks
        deadline_status (str): Project deadline status
        
    Returns:
        float: Health score (0-100)
    """
    base_score = completion_rate * 0.6  # 60% weight on completion
    
    # Penalty for overdue tasks
    overdue_penalty = (overdue_tasks / max(total_tasks, 1)) * 30
    
    # Penalty based on deadline status
    deadline_penalties = {
        'overdue': 20,
        'at_risk': 10,
        'on_track': 0
    }
    deadline_penalty = deadline_penalties.get(deadline_status, 0)
    
    health_score = max(0, base_score - overdue_penalty - deadline_penalty)
    return round(health_score, 1)


def _calculate_performance_score(completion_rate: float, overdue_tasks: int, 
                               total_tasks: int) -> float:
    """
    Calculate individual performance score.
    
    Args:
        completion_rate (float): Task completion percentage
        overdue_tasks (int): Number of overdue tasks
        total_tasks (int): Total number of tasks
        
    Returns:
        float: Performance score (0-100)
    """
    if total_tasks == 0:
        return 0.0
    
    # Base score from completion rate
    base_score = completion_rate * 0.8  # 80% weight on completion
    
    # Penalty for overdue tasks
    overdue_penalty = (overdue_tasks / total_tasks) * 30
    
    # Bonus for high task volume (encourages productivity)
    volume_bonus = min(total_tasks * 0.5, 10)  # Max 10 bonus points
    
    performance_score = max(0, min(100, base_score - overdue_penalty + volume_bonus))
    return round(performance_score, 1)


def _calculate_workload_distribution(member_analytics: List[Dict]) -> Dict:
    """
    Calculate workload distribution metrics across team members.
    
    Args:
        member_analytics (List[Dict]): List of member analytics data
        
    Returns:
        Dict: Workload distribution analysis
    """
    if not member_analytics:
        return {}
    
    task_counts = [m['metrics']['total_tasks'] for m in member_analytics]
    total_tasks = sum(task_counts)
    
    if total_tasks == 0:
        return {'balance_score': 100, 'distribution': 'even'}
    
    # Calculate ideal distribution (equal tasks per member)
    ideal_per_member = total_tasks / len(member_analytics)
    
    # Calculate deviation from ideal
    deviations = [abs(count - ideal_per_member) for count in task_counts]
    avg_deviation = sum(deviations) / len(deviations)
    
    # Convert to balance score (lower deviation = higher balance)
    balance_score = max(0, 100 - (avg_deviation / ideal_per_member * 100))
    
    # Determine distribution category
    if balance_score >= 80:
        distribution = 'even'
    elif balance_score >= 60:
        distribution = 'moderate'
    else:
        distribution = 'uneven'
    
    return {
        'balance_score': round(balance_score, 1),
        'distribution': distribution,
        'ideal_tasks_per_member': round(ideal_per_member, 1),
        'actual_range': {
            'min': min(task_counts),
            'max': max(task_counts)
        }
    }


@analytics_bp.route('/projects/<int:project_id>/stats', methods=['GET'])
@jwt_required()
def get_project_stats(project_id):
    """Get comprehensive project statistics."""
    user_id = int(get_jwt_identity())
    
    try:
        stats = AnalyticsService.get_project_stats(user_id, project_id)
        return jsonify(stats), 200
    except PermissionError as e:
        return jsonify({'msg': str(e)}), 403
    except Exception as e:
        return jsonify({'msg': 'Error fetching project statistics'}), 500


@analytics_bp.route('/users/<int:user_id>/dashboard', methods=['GET'])
@jwt_required()
def get_user_dashboard(user_id):
    """Get user dashboard data with cross-project analytics."""
    current_user_id = int(get_jwt_identity())
    
    # Users can only access their own dashboard
    if current_user_id != user_id:
        return jsonify({'msg': 'Not authorized'}), 403
    
    try:
        dashboard_data = AnalyticsService.get_user_dashboard(user_id)
        return jsonify(dashboard_data), 200
    except Exception as e:
        return jsonify({'msg': 'Error fetching user dashboard'}), 500


@analytics_bp.route('/users/<int:user_id>/productivity', methods=['GET'])
@jwt_required()
def get_user_productivity(user_id):
    """Get productivity metrics for a user."""
    current_user_id = int(get_jwt_identity())
    
    # Users can only access their own productivity metrics
    if current_user_id != user_id:
        return jsonify({'msg': 'Not authorized'}), 403
    
    # Optional project filter
    project_id = request.args.get('project_id', type=int)
    
    try:
        productivity = AnalyticsService.get_productivity_metrics(user_id, project_id)
        return jsonify(productivity), 200
    except Exception as e:
        return jsonify({'msg': 'Error fetching productivity metrics'}), 500


@analytics_bp.route('/projects/<int:project_id>/health', methods=['GET'])
@jwt_required()
def get_project_health(project_id):
    """Get project health metrics."""
    user_id = int(get_jwt_identity())
    
    try:
        health = AnalyticsService.get_project_health(project_id, user_id)
        return jsonify(health), 200
    except PermissionError as e:
        return jsonify({'msg': str(e)}), 403
    except Exception as e:
        return jsonify({'msg': 'Error fetching project health'}), 500


@analytics_bp.route('/projects/<int:project_id>/resources', methods=['GET'])
@jwt_required()
def get_resource_utilization(project_id):
    """Get resource utilization metrics for a project."""
    try:
        user_id = int(get_jwt_identity())
        metrics = AnalyticsService.get_resource_utilization(project_id, user_id)
        return jsonify(metrics), 200
    except PermissionError as e:
        return jsonify({'msg': str(e)}), 403
    except Exception as e:
        print(f"Resource utilization error: {e}")
        return jsonify({'msg': 'Failed to fetch resource utilization'}), 500


@analytics_bp.route('/trends', methods=['GET'])
@jwt_required()
def get_trend_analysis():
    """Get trend analysis for user productivity and performance."""
    try:
        user_id = int(get_jwt_identity())
        project_id = request.args.get('project_id', type=int)
        days = request.args.get('days', 90, type=int)
        
        # Validate days parameter
        if days not in [30, 60, 90, 180]:
            days = 90
        
        trends = AnalyticsService.get_trend_analysis(user_id, project_id, days)
        return jsonify(trends), 200
        
    except Exception as e:
        print(f"Trend analysis error: {e}")
        return jsonify({'msg': 'Failed to fetch trend analysis'}), 500


@analytics_bp.route('/projects/<int:project_id>/risk-assessment', methods=['GET'])
@jwt_required()
def get_project_risk_assessment(project_id):
    """Get comprehensive risk assessment for a project."""
    try:
        user_id = int(get_jwt_identity())
        risk_data = AnalyticsService.get_risk_assessment(project_id, user_id)
        return jsonify(risk_data), 200
        
    except PermissionError as e:
        return jsonify({'msg': str(e)}), 403
    except Exception as e:
        print(f"Risk assessment error: {e}")
        return jsonify({'msg': 'Failed to fetch risk assessment'}), 500


@analytics_bp.route('/performance-prediction', methods=['GET'])
@jwt_required()
def get_performance_prediction():
    """Get performance prediction based on historical data."""
    try:
        user_id = int(get_jwt_identity())
        project_id = request.args.get('project_id', type=int)
        
        prediction = AnalyticsService.get_performance_prediction(user_id, project_id)
        return jsonify(prediction), 200
        
    except Exception as e:
        print(f"Performance prediction error: {e}")
        return jsonify({'msg': 'Failed to fetch performance prediction'}), 500


@analytics_bp.route('/tasks/<int:task_id>/analytics', methods=['GET'])
@jwt_required()
def get_task_analytics(task_id):
    """Get analytics for a specific task."""
    try:
        user_id = int(get_jwt_identity())
        
        # Get task and verify permissions
        task = Task.query.get_or_404(task_id)
        project = task.project
        
        # Check if user is project member or task owner
        is_member = any(member.id == user_id for member in project.members) or project.owner_id == user_id
        if not is_member and task.owner_id != user_id:
            return jsonify({'msg': 'Access denied'}), 403
        
        # Calculate task-specific metrics
        task_expenses = Expense.query.filter_by(task_id=task_id).all()
        total_expenses = sum(expense.amount for expense in task_expenses)
        
        # Task timeline analysis
        timeline_data = {
            'created_at': task.created_at.isoformat() if task.created_at else None,
            'due_date': task.due_date.isoformat() if task.due_date else None,
            'last_updated': task.last_progress_update.isoformat() if task.last_progress_update else None,
            'is_overdue': task.is_overdue(),
            'days_since_creation': (get_utc_now() - task.created_at).days if task.created_at else 0
        }
        
        if task.due_date:
            due_date = ensure_utc(task.due_date)
            timeline_data['days_to_due'] = (due_date - get_utc_now()).days
        
        # Expense analysis
        expense_analysis = {
            'total_expenses': total_expenses,
            'expense_count': len(task_expenses),
            'average_expense': total_expenses / len(task_expenses) if task_expenses else 0,
            'expenses_by_category': {}
        }
        
        for expense in task_expenses:
            category = expense.category or 'General'
            if category not in expense_analysis['expenses_by_category']:
                expense_analysis['expenses_by_category'][category] = 0
            expense_analysis['expenses_by_category'][category] += expense.amount
        
        # Performance metrics
        performance_metrics = {
            'priority_score': task.priority_score,
            'percent_complete': task.percent_complete,
            'estimated_effort_hours': task.estimated_effort,
            'has_dependencies': task.dependency_count > 0,
            'dependency_count': task.dependency_count
        }
        
        return jsonify({
            'task_id': task_id,
            'task_title': task.title,
            'current_status': task.current_status,
            'timeline': timeline_data,
            'expenses': expense_analysis,
            'performance': performance_metrics,
            'insights': _generate_task_insights(task, timeline_data, expense_analysis)
        }), 200
        
    except Exception as e:
        print(f"Task analytics error: {e}")
        return jsonify({'msg': 'Failed to fetch task analytics'}), 500


def _generate_task_insights(task: Task, timeline_data: Dict, expense_analysis: Dict) -> List[str]:
    """Generate insights for a specific task."""
    insights = []
    
    # Timeline insights
    if timeline_data['is_overdue']:
        insights.append("⏰ Task is overdue - requires immediate attention")
    elif timeline_data.get('days_to_due', 0) <= 3 and timeline_data.get('days_to_due', 0) > 0:
        insights.append("🚨 Task due within 3 days - high priority")
    elif timeline_data['days_since_creation'] > 30 and task.current_status == 'pending':
        insights.append("📅 Task pending for over 30 days - review status")
    
    # Progress insights
    if task.percent_complete > 0:
        if task.percent_complete >= 80:
            insights.append("🎯 Task nearly complete - push to finish")
        elif task.percent_complete >= 50:
            insights.append("📈 Good progress made - maintain momentum")
        else:
            insights.append("🔄 Task started but needs more progress")
    elif timeline_data['days_since_creation'] > 7:
        insights.append("🚀 Consider starting this task soon")
    
    # Expense insights
    if expense_analysis['total_expenses'] > 1000:
        insights.append("💰 High expense task - monitor costs closely")
    elif expense_analysis['expense_count'] > 5:
        insights.append("📊 Multiple expenses recorded - good tracking")
    
    # Dependency insights
    if task.dependency_count > 3:
        insights.append("🔗 Complex task with multiple dependencies")
    
    if not insights:
        insights.append("✅ Task tracking looks good")
    
    return insights
