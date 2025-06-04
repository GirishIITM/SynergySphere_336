from datetime import datetime, timedelta
from typing import List, Dict, Any
from models import Task, User, Notification
from extensions import db
from utils.datetime_utils import get_utc_now, ensure_utc
from utils.email import send_email
from sqlalchemy import and_, or_


class DeadlineService:
    """Service for monitoring task progress and predicting deadline risks."""
    
    @staticmethod
    def calculate_completion_velocity(task: Task) -> float:
        """
        Calculate task completion velocity (percent per day).
        
        Args:
            task (Task): Task to analyze
            
        Returns:
            float: Completion velocity (percent per day)
        """
        if not task.created_at or task.percent_complete <= 0:
            return 0.0
        
        now = get_utc_now()
        days_elapsed = (now - task.created_at).total_seconds() / (24 * 3600)
        
        if days_elapsed <= 0:
            return 0.0
        
        return task.percent_complete / days_elapsed
    
    @staticmethod
    def predict_completion_date(task: Task) -> datetime:
        """
        Predict when task will be completed based on current velocity.
        
        Args:
            task (Task): Task to analyze
            
        Returns:
            datetime: Predicted completion date
        """
        velocity = DeadlineService.calculate_completion_velocity(task)
        
        if velocity <= 0 or task.percent_complete >= 100:
            # If no progress or already complete, return far future or current time
            if task.percent_complete >= 100:
                return get_utc_now()
            else:
                return get_utc_now() + timedelta(days=365)  # Far future
        
        remaining_percent = 100 - task.percent_complete
        days_to_complete = remaining_percent / velocity
        
        return get_utc_now() + timedelta(days=days_to_complete)
    
    @staticmethod
    def is_at_risk(task: Task) -> bool:
        """
        Determine if a task is at risk of missing its deadline.
        
        Args:
            task (Task): Task to evaluate
            
        Returns:
            bool: True if task is at risk
        """
        if not task.due_date or task.status.value == 'completed':
            return False
        
        due_date = ensure_utc(task.due_date)
        predicted_completion = DeadlineService.predict_completion_date(task)
        
        # At risk if predicted completion is after due date
        return predicted_completion > due_date
    
    @staticmethod
    def get_risk_level(task: Task) -> str:
        """
        Get risk level for a task.
        
        Args:
            task (Task): Task to evaluate
            
        Returns:
            str: Risk level ('low', 'medium', 'high', 'critical')
        """
        if not DeadlineService.is_at_risk(task):
            return 'low'
        
        if not task.due_date:
            return 'low'
        
        due_date = ensure_utc(task.due_date)
        predicted_completion = DeadlineService.predict_completion_date(task)
        delay_days = (predicted_completion - due_date).days
        
        if delay_days <= 1:
            return 'medium'
        elif delay_days <= 3:
            return 'high'
        else:
            return 'critical'
    
    @staticmethod
    def get_tasks_at_risk(user_id: int) -> List[Dict[str, Any]]:
        """
        Get all tasks assigned to user that are at risk of missing deadlines.
        
        Args:
            user_id (int): User ID
            
        Returns:
            List[Dict[str, Any]]: List of at-risk tasks with metadata
        """
        tasks = Task.query.filter(
            and_(
                Task.owner_id == user_id,
                or_(Task.status == 'pending', Task.status == 'in_progress'),
                Task.due_date.isnot(None)
            )
        ).all()
        
        at_risk_tasks = []
        
        for task in tasks:
            if DeadlineService.is_at_risk(task):
                risk_level = DeadlineService.get_risk_level(task)
                predicted_completion = DeadlineService.predict_completion_date(task)
                velocity = DeadlineService.calculate_completion_velocity(task)
                
                task_data = task.to_dict()
                task_data.update({
                    'risk_level': risk_level,
                    'predicted_completion': predicted_completion.isoformat(),
                    'completion_velocity': round(velocity, 2),
                    'project_name': task.project.name if task.project else 'Unknown Project'
                })
                
                at_risk_tasks.append(task_data)
        
        # Sort by risk level (critical first)
        risk_order = {'critical': 4, 'high': 3, 'medium': 2, 'low': 1}
        at_risk_tasks.sort(key=lambda t: risk_order.get(t['risk_level'], 0), reverse=True)
        
        return at_risk_tasks
    
    @staticmethod
    def scan_and_notify(user_id: int) -> Dict[str, Any]:
        """
        Scan user's tasks for deadline risks and create notifications.
        
        Args:
            user_id (int): User ID to scan
            
        Returns:
            Dict[str, Any]: Summary of notifications sent
        """
        user = User.query.get(user_id)
        if not user:
            return {'error': 'User not found'}
        
        at_risk_tasks = DeadlineService.get_tasks_at_risk(user_id)
        notifications_created = 0
        emails_sent = 0
        
        for task_data in at_risk_tasks:
            task_id = task_data['id']
            risk_level = task_data['risk_level']
            
            # Check if we already sent a notification recently (within 24 hours)
            recent_notification = Notification.query.filter(
                and_(
                    Notification.user_id == user_id,
                    Notification.message.contains(f"Task '{task_data['title']}'"),
                    Notification.created_at >= get_utc_now() - timedelta(hours=24)
                )
            ).first()
            
            if recent_notification:
                continue  # Skip if already notified recently
            
            # Create notification message
            if risk_level == 'critical':
                message = f"🚨 CRITICAL: Task '{task_data['title']}' is severely behind schedule and may miss its deadline!"
            elif risk_level == 'high':
                message = f"⚠️ HIGH RISK: Task '{task_data['title']}' is at high risk of missing its deadline."
            else:
                message = f"⚡ WARNING: Task '{task_data['title']}' may miss its deadline based on current progress."
            
            # Create notification
            notification = Notification(
                user_id=user_id,
                message=message
            )
            db.session.add(notification)
            notifications_created += 1
            
            # Send email if user has email notifications enabled
            if hasattr(user, 'notify_email') and user.notify_email:
                try:
                    email_subject = f"Task Deadline Warning - {task_data['title']}"
                    send_email(email_subject, [user.email], "", message)
                    emails_sent += 1
                except Exception as e:
                    print(f"Failed to send email to {user.email}: {str(e)}")
        
        db.session.commit()
        
        return {
            'user_id': user_id,
            'at_risk_tasks_count': len(at_risk_tasks),
            'notifications_created': notifications_created,
            'emails_sent': emails_sent,
            'timestamp': get_utc_now().isoformat()
        }
    
    @staticmethod
    def update_task_progress(task_id: int, percent_complete: int) -> bool:
        """
        Update task progress and track progress timestamp.
        
        Args:
            task_id (int): Task ID
            percent_complete (int): New completion percentage (0-100)
            
        Returns:
            bool: True if update was successful
        """
        task = Task.query.get(task_id)
        if not task:
            return False
        
        # Validate percent_complete
        percent_complete = max(0, min(100, percent_complete))
        
        # Only update if progress changed
        if task.percent_complete != percent_complete:
            task.percent_complete = percent_complete
            task.last_progress_update = get_utc_now()
            
            # If task is now complete, update status
            if percent_complete >= 100:
                task.status = 'completed'
            elif percent_complete > 0 and task.status.value == 'pending':
                task.status = 'in_progress'
            
            db.session.commit()
        
        return True 