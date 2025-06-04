from datetime import datetime, timedelta
from typing import List, Dict, Any
from models import Task, Project, User
from extensions import db
from utils.datetime_utils import get_utc_now, ensure_utc
from sqlalchemy import and_, or_


class PriorityService:
    """Service for calculating and managing task priorities."""
    
    @staticmethod
    def calculate_urgency_score(due_date: datetime) -> float:
        """
        Calculate urgency score based on due date proximity.
        
        Args:
            due_date (datetime): Task due date
            
        Returns:
            float: Urgency score (0-10, higher is more urgent)
        """
        if not due_date:
            return 0.0
            
        now = get_utc_now()
        due_date = ensure_utc(due_date)
        time_diff = due_date - now
        
        # If overdue, maximum urgency
        if time_diff.total_seconds() <= 0:
            return 10.0
            
        days_remaining = time_diff.days
        
        # Urgency decreases as deadline is further away
        if days_remaining <= 1:
            return 9.0
        elif days_remaining <= 3:
            return 7.0
        elif days_remaining <= 7:
            return 5.0
        elif days_remaining <= 14:
            return 3.0
        elif days_remaining <= 30:
            return 1.0
        else:
            return 0.5
    
    @staticmethod
    def calculate_effort_score(estimated_effort: int) -> float:
        """
        Calculate effort impact on priority (higher effort = slightly lower priority).
        
        Args:
            estimated_effort (int): Estimated effort in hours
            
        Returns:
            float: Effort score modifier (-2 to 0)
        """
        if estimated_effort <= 0:
            return 0.0
        elif estimated_effort <= 2:
            return 0.0
        elif estimated_effort <= 8:
            return -0.5
        elif estimated_effort <= 24:
            return -1.0
        else:
            return -2.0
    
    @staticmethod
    def calculate_dependency_score(task: Task) -> float:
        """
        Calculate priority boost based on task dependencies.
        
        Args:
            task (Task): Task to evaluate
            
        Returns:
            float: Dependency score (0-5, higher for blocking tasks)
        """
        # Tasks that have subtasks (blocking other work) get higher priority
        subtask_count = len(task.subtasks)
        if subtask_count > 0:
            return min(subtask_count * 1.5, 5.0)
        
        # Tasks that are subtasks get slightly lower priority
        if task.parent_task_id:
            return -0.5
            
        return 0.0
    
    @staticmethod
    def calculate_status_modifier(status: str) -> float:
        """
        Calculate status-based priority modifier.
        
        Args:
            status (str): Task status
            
        Returns:
            float: Status modifier
        """
        if status == 'in_progress':
            return 2.0  # In-progress tasks get priority boost
        elif status == 'pending':
            return 0.0
        else:  # completed
            return -10.0  # Completed tasks should have lowest priority
    
    @staticmethod
    def compute_priority_score(task: Task) -> float:
        """
        Compute overall priority score for a task.
        
        Args:
            task (Task): Task to prioritize
            
        Returns:
            float: Priority score
        """
        urgency = PriorityService.calculate_urgency_score(task.due_date)
        effort = PriorityService.calculate_effort_score(task.estimated_effort)
        dependency = PriorityService.calculate_dependency_score(task)
        status_mod = PriorityService.calculate_status_modifier(task.status.value)
        
        # Base score calculation
        priority_score = urgency + effort + dependency + status_mod
        
        # Progress penalty - tasks that haven't progressed get deprioritized
        if task.percent_complete == 0 and task.status.value == 'in_progress':
            priority_score -= 1.0
        
        return max(priority_score, 0.0)  # Ensure non-negative
    
    @staticmethod
    def compute_priority_scores(user_id: int) -> Dict[str, Any]:
        """
        Recalculate priority scores for all tasks assigned to a user.
        
        Args:
            user_id (int): User ID to calculate priorities for
            
        Returns:
            Dict[str, Any]: Summary of updated tasks
        """
        tasks = Task.query.filter_by(owner_id=user_id).all()
        updated_count = 0
        
        for task in tasks:
            new_score = PriorityService.compute_priority_score(task)
            if abs(task.priority_score - new_score) > 0.1:  # Only update if significant change
                task.priority_score = new_score
                updated_count += 1
        
        db.session.commit()
        
        return {
            'total_tasks': len(tasks),
            'updated_tasks': updated_count,
            'timestamp': get_utc_now().isoformat()
        }
    
    @staticmethod
    def get_prioritized_tasks_for_project(project_id: int, user_id: int) -> List[Dict[str, Any]]:
        """
        Get prioritized task list for a project.
        
        Args:
            project_id (int): Project ID
            user_id (int): User ID (for permission check)
            
        Returns:
            List[Dict[str, Any]]: List of prioritized tasks
        """
        # Verify user is project member
        project = Project.query.get_or_404(project_id)
        if not any(member.id == user_id for member in project.members):
            raise PermissionError("User is not a member of this project")
        
        # Get all non-completed tasks for the project
        tasks = Task.query.filter(
            and_(
                Task.project_id == project_id,
                or_(Task.status == 'pending', Task.status == 'in_progress')
            )
        ).all()
        
        # Recalculate priorities for these tasks
        for task in tasks:
            task.priority_score = PriorityService.compute_priority_score(task)
        
        db.session.commit()
        
        # Sort by priority score descending
        tasks.sort(key=lambda t: t.priority_score, reverse=True)
        
        # Convert to dict format
        return [task.to_dict() for task in tasks] 