from datetime import datetime, timedelta
from typing import List, Dict, Any
from models import Task, Project, User, Expense, Budget
from extensions import db
from utils.datetime_utils import get_utc_now, ensure_utc
from sqlalchemy import func, and_, or_, extract, case


class AnalyticsService:
    """Service for generating analytics and insights for projects and users."""
    
    @staticmethod
    def get_productivity_metrics(user_id: int, project_id: int = None) -> Dict[str, Any]:
        """
        Get productivity metrics for a user, optionally filtered by project.
        
        Args:
            user_id (int): User ID
            project_id (int, optional): Project ID to filter by
            
        Returns:
            Dict[str, Any]: Productivity metrics
        """
        query = Task.query.filter_by(owner_id=user_id)
        if project_id:
            query = query.filter_by(project_id=project_id)
        
        tasks = query.all()
        
        # Basic counts
        total_tasks = len(tasks)
        completed_tasks = len([t for t in tasks if t.status.value == 'completed'])
        in_progress_tasks = len([t for t in tasks if t.status.value == 'in_progress'])
        pending_tasks = len([t for t in tasks if t.status.value == 'pending'])
        overdue_tasks = len([t for t in tasks if t.is_overdue()])
        
        # Completion rate
        completion_rate = (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0
        
        # Average completion time for completed tasks
        completed_task_times = []
        for task in tasks:
            if task.status.value == 'completed' and task.created_at:
                completion_time = (get_utc_now() - task.created_at).days
                completed_task_times.append(completion_time)
        
        avg_completion_time = sum(completed_task_times) / len(completed_task_times) if completed_task_times else 0
        
        # Tasks completed per week (last 12 weeks)
        week_data = []
        for i in range(12):
            week_start = get_utc_now() - timedelta(weeks=i+1)
            week_end = get_utc_now() - timedelta(weeks=i)
            
            week_completed = len([
                t for t in tasks 
                if t.status.value == 'completed' and 
                t.last_progress_update and
                week_start <= t.last_progress_update <= week_end
            ])
            
            week_data.append({
                'week': week_start.strftime('%Y-%m-%d'),
                'completed': week_completed
            })
        
        week_data.reverse()  # Chronological order
        
        return {
            'total_tasks': total_tasks,
            'completed_tasks': completed_tasks,
            'in_progress_tasks': in_progress_tasks,
            'pending_tasks': pending_tasks,
            'overdue_tasks': overdue_tasks,
            'completion_rate': round(completion_rate, 1),
            'avg_completion_time_days': round(avg_completion_time, 1),
            'tasks_completed_per_week': week_data
        }
    
    @staticmethod
    def get_resource_utilization(project_id: int, user_id: int) -> Dict[str, Any]:
        """
        Get resource utilization metrics for a project.
        
        Args:
            project_id (int): Project ID
            user_id (int): User ID (for permission check)
            
        Returns:
            Dict[str, Any]: Resource utilization metrics
        """
        # Verify user is project member
        project = Project.query.get_or_404(project_id)
        if not any(member.id == user_id for member in project.members):
            raise PermissionError("User is not a member of this project")
        
        budget = Budget.query.filter_by(project_id=project_id).first()
        expenses = Expense.query.filter_by(project_id=project_id).all()
        tasks = Task.query.filter_by(project_id=project_id).all()
        
        # Budget utilization
        budget_data = {}
        if budget:
            budget_data = {
                'allocated_amount': budget.allocated_amount,
                'spent_amount': budget.spent_amount,
                'remaining_amount': budget.remaining_amount,
                'utilization_percentage': budget.utilization_percentage,
                'is_over_budget': budget.spent_amount > budget.allocated_amount
            }
        
        # Expenses by category
        expenses_by_category = {}
        for expense in expenses:
            category = expense.category or 'Uncategorized'
            expenses_by_category[category] = expenses_by_category.get(category, 0) + expense.amount
        
        # Monthly expense trend (last 12 months)
        monthly_expenses = []
        for i in range(12):
            month_start = get_utc_now().replace(day=1) - timedelta(days=i*30)
            month_end = month_start + timedelta(days=30)
            
            month_total = sum([
                e.amount for e in expenses 
                if month_start <= e.incurred_at <= month_end
            ])
            
            monthly_expenses.append({
                'month': month_start.strftime('%Y-%m'),
                'amount': month_total
            })
        
        monthly_expenses.reverse()
        
        # Cost per completed task
        completed_tasks = [t for t in tasks if t.status.value == 'completed']
        total_expenses = sum(e.amount for e in expenses)
        cost_per_task = total_expenses / len(completed_tasks) if completed_tasks else 0
        
        return {
            'budget': budget_data,
            'total_expenses': total_expenses,
            'expenses_by_category': expenses_by_category,
            'monthly_expenses': monthly_expenses,
            'cost_per_completed_task': round(cost_per_task, 2),
            'expenses_count': len(expenses)
        }
    
    @staticmethod
    def get_project_health(project_id: int, user_id: int) -> Dict[str, Any]:
        """
        Get project health metrics.
        
        Args:
            project_id (int): Project ID
            user_id (int): User ID (for permission check)
            
        Returns:
            Dict[str, Any]: Project health metrics
        """
        # Verify user is project member
        project = Project.query.get_or_404(project_id)
        if not any(member.id == user_id for member in project.members):
            raise PermissionError("User is not a member of this project")
        
        tasks = Task.query.filter_by(project_id=project_id).all()
        
        if not tasks:
            return {
                'total_tasks': 0,
                'health_score': 100,
                'status': 'healthy',
                'overdue_percentage': 0,
                'on_time_completion_rate': 100,
                'average_delay_days': 0,
                'bottleneck_tasks': []
            }
        
        # Basic metrics
        total_tasks = len(tasks)
        overdue_tasks = [t for t in tasks if t.is_overdue()]
        completed_tasks = [t for t in tasks if t.status.value == 'completed']
        
        # On-time completion analysis
        on_time_completed = 0
        total_delays = 0
        
        for task in completed_tasks:
            if task.due_date and task.last_progress_update:
                due_date = ensure_utc(task.due_date)
                completion_date = ensure_utc(task.last_progress_update)
                
                if completion_date <= due_date:
                    on_time_completed += 1
                else:
                    delay_days = (completion_date - due_date).days
                    total_delays += delay_days
        
        on_time_rate = (on_time_completed / len(completed_tasks) * 100) if completed_tasks else 100
        avg_delay = total_delays / (len(completed_tasks) - on_time_completed) if (len(completed_tasks) - on_time_completed) > 0 else 0
        
        # Identify bottleneck tasks (tasks with many subtasks that are overdue)
        bottleneck_tasks = []
        for task in tasks:
            if task.subtasks and task.is_overdue():
                bottleneck_tasks.append({
                    'id': task.id,
                    'title': task.title,
                    'subtask_count': len(task.subtasks),
                    'days_overdue': (get_utc_now() - ensure_utc(task.due_date)).days if task.due_date else 0
                })
        
        # Sort bottlenecks by impact (subtask count * days overdue)
        bottleneck_tasks.sort(key=lambda t: t['subtask_count'] * t['days_overdue'], reverse=True)
        
        # Calculate health score (0-100)
        overdue_percentage = len(overdue_tasks) / total_tasks * 100
        health_score = max(0, 100 - (overdue_percentage * 2) - ((100 - on_time_rate) * 0.5))
        
        # Determine status
        if health_score >= 80:
            status = 'healthy'
        elif health_score >= 60:
            status = 'warning'
        else:
            status = 'critical'
        
        return {
            'total_tasks': total_tasks,
            'completed_tasks': len(completed_tasks),
            'overdue_tasks': len(overdue_tasks),
            'overdue_percentage': round(overdue_percentage, 1),
            'on_time_completion_rate': round(on_time_rate, 1),
            'average_delay_days': round(avg_delay, 1),
            'health_score': round(health_score, 1),
            'status': status,
            'bottleneck_tasks': bottleneck_tasks[:5]  # Top 5 bottlenecks
        }
    
    @staticmethod
    def get_project_stats(user_id: int, project_id: int) -> Dict[str, Any]:
        """
        Get comprehensive project statistics.
        
        Args:
            user_id (int): User ID (for permission check)
            project_id (int): Project ID
            
        Returns:
            Dict[str, Any]: Comprehensive project statistics
        """
        productivity = AnalyticsService.get_productivity_metrics(user_id, project_id)
        resources = AnalyticsService.get_resource_utilization(project_id, user_id)
        health = AnalyticsService.get_project_health(project_id, user_id)
        
        return {
            'project_id': project_id,
            'productivity_metrics': productivity,
            'resource_utilization': resources,
            'project_health': health,
            'generated_at': get_utc_now().isoformat()
        }
    
    @staticmethod
    def get_user_dashboard(user_id: int) -> Dict[str, Any]:
        """
        Get user dashboard data with cross-project analytics.
        
        Args:
            user_id (int): User ID
            
        Returns:
            Dict[str, Any]: User dashboard data
        """
        try:
            user = User.query.get_or_404(user_id)
            print(f"Retrieved user: {user.id}, {user.full_name}")
            
            # Get user's projects
            projects = user.projects
            print(f"Found {len(projects)} projects for user")
            
            # Overall productivity metrics
            try:
                overall_productivity = AnalyticsService.get_productivity_metrics(user_id)
                print("Productivity metrics calculated successfully")
            except Exception as e:
                print(f"Error calculating productivity metrics: {str(e)}")
                overall_productivity = {
                    'total_tasks': 0,
                    'completed_tasks': 0,
                    'in_progress_tasks': 0,
                    'pending_tasks': 0,
                    'overdue_tasks': 0,
                    'completion_rate': 0,
                    'avg_completion_time_days': 0,
                    'tasks_completed_per_week': []
                }
            
            # Project summaries
            project_summaries = []
            for project in projects:
                try:
                    health = AnalyticsService.get_project_health(project.id, user_id)
                    project_summaries.append({
                        'id': project.id,
                        'name': project.name,
                        'health_score': health['health_score'],
                        'status': health['status'],
                        'total_tasks': health['total_tasks'],
                        'overdue_tasks': health['overdue_tasks']
                    })
                except Exception as e:
                    print(f"Error getting project health for project {project.id}: {str(e)}")
                    # Add a minimal project summary even if health calculation fails
                    project_summaries.append({
                        'id': project.id,
                        'name': project.name,
                        'health_score': 0,
                        'status': 'unknown',
                        'total_tasks': 0,
                        'overdue_tasks': 0
                    })
            
            # Task status distribution across all projects
            try:
                all_tasks = Task.query.filter_by(owner_id=user_id).all()
                print(f"Found {len(all_tasks)} tasks for user")
                
                status_distribution = {
                    'pending': len([t for t in all_tasks if t.status.value == 'pending']),
                    'in_progress': len([t for t in all_tasks if t.status.value == 'in_progress']),
                    'completed': len([t for t in all_tasks if t.status.value == 'completed'])
                }
                print(f"Status distribution: {status_distribution}")
            except Exception as e:
                print(f"Error calculating status distribution: {str(e)}")
                status_distribution = {'pending': 0, 'in_progress': 0, 'completed': 0}
                all_tasks = []
            
            # Recent activity (tasks updated in last 7 days)
            try:
                recent_cutoff = get_utc_now() - timedelta(days=7)
                recent_tasks = [
                    t for t in all_tasks 
                    if t.last_progress_update and t.last_progress_update >= recent_cutoff
                ]
                
                recent_activity = []
                for task in recent_tasks[-10:]:  # Last 10 activities
                    try:
                        project_name = task.project.name if task.project else 'Unknown'
                        recent_activity.append({
                            'id': task.id,
                            'title': task.title,
                            'status': task.status.value,
                            'project_name': project_name,
                            'last_updated': task.last_progress_update.isoformat() if task.last_progress_update else None
                        })
                    except Exception as e:
                        print(f"Error processing recent task {task.id}: {str(e)}")
                        continue
                        
                print(f"Found {len(recent_activity)} recent activities")
            except Exception as e:
                print(f"Error calculating recent activity: {str(e)}")
                recent_activity = []
            
            user_name = user.full_name if user.full_name else f"{user.username}"
            
            result = {
                'user_id': user_id,
                'user_name': user_name,
                'total_tasks': overall_productivity.get('total_tasks', 0),
                'completed_tasks': overall_productivity.get('completed_tasks', 0),
                'productivity_metrics': overall_productivity,
                'project_summaries': project_summaries,
                'status_distribution': status_distribution,
                'recent_activity': recent_activity,
                'projects_count': len(projects),
                'generated_at': get_utc_now().isoformat()
            }
            
            print("Dashboard data generated successfully")
            return result
            
        except Exception as e:
            print(f"Critical error in get_user_dashboard: {str(e)}")
            import traceback
            traceback.print_exc()
            raise e