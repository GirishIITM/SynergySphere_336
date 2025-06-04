from celery import current_app as celery_app
from datetime import datetime, timedelta
from models import Task, User, Notification
from extensions import db
from utils.datetime_utils import get_utc_now, ensure_utc
from utils.email import send_email
from services.deadline_service import DeadlineService
import logging

logger = logging.getLogger(__name__)

@celery_app.task(bind=True, max_retries=3)
def send_deadline_reminder(self, task_id, reminder_type='due_soon'):
    """
    Send deadline reminder for a specific task.
    
    Args:
        task_id (int): ID of the task
        reminder_type (str): Type of reminder ('due_soon', 'overdue', 'at_risk')
    """
    try:
        task = Task.query.get(task_id)
        if not task:
            logger.warning(f"Task {task_id} not found for deadline reminder")
            return
        
        user = User.query.get(task.owner_id)
        if not user:
            logger.warning(f"User {task.owner_id} not found for task {task_id}")
            return
        
        # Check if task is still relevant for reminders
        if task.status.value == 'completed':
            logger.info(f"Task {task_id} completed, skipping reminder")
            return
        
        # Generate reminder message based on type
        messages = {
            'due_soon': f"⏰ Reminder: Task '{task.title}' is due soon ({task.due_date.strftime('%Y-%m-%d %H:%M')})",
            'overdue': f"🚨 OVERDUE: Task '{task.title}' was due on {task.due_date.strftime('%Y-%m-%d %H:%M')}",
            'at_risk': f"⚠️ AT RISK: Task '{task.title}' may miss its deadline based on current progress",
            'progress_stalled': f"📈 Progress Update: Task '{task.title}' hasn't seen progress updates recently"
        }
        
        message = messages.get(reminder_type, messages['due_soon'])
        
        # Create in-app notification
        notification = Notification(
            user_id=user.id,
            message=message
        )
        db.session.add(notification)
        
        # Send email if user has email notifications enabled
        if hasattr(user, 'notify_email') and user.notify_email:
            try:
                email_subject = f"Task Deadline Reminder - {task.title}"
                project_name = task.project.name if task.project else 'Unknown Project'
                email_body = f"""
                {message}
                
                Project: {project_name}
                Task Description: {task.description or 'No description'}
                
                Please log in to SynergySphere to update your task progress.
                """
                
                send_email(email_subject, [user.email], "", email_body)
                logger.info(f"Deadline reminder email sent to {user.email} for task {task_id}")
                
            except Exception as email_error:
                logger.error(f"Failed to send email reminder: {email_error}")
        
        db.session.commit()
        logger.info(f"Deadline reminder sent for task {task_id} to user {user.id}")
        
    except Exception as exc:
        logger.error(f"Error sending deadline reminder for task {task_id}: {exc}")
        # Retry with exponential backoff
        raise self.retry(exc=exc, countdown=60 * (2 ** self.request.retries))

@celery_app.task
def check_and_schedule_reminders():
    """
    Check all active tasks and schedule deadline reminders.
    This task runs periodically via Celery Beat.
    """
    try:
        current_time = get_utc_now()
        
        # Get all active tasks with due dates
        active_tasks = Task.query.filter(
            Task.due_date.isnot(None),
            Task.status.in_(['pending', 'in_progress'])
        ).all()
        
        reminder_count = 0
        
        for task in active_tasks:
            try:
                due_date = ensure_utc(task.due_date)
                time_until_due = due_date - current_time
                
                # Skip if task is already overdue by more than 7 days
                if time_until_due.total_seconds() < -7 * 24 * 3600:
                    continue
                
                # Determine if reminders should be sent
                should_remind = False
                reminder_type = 'due_soon'
                
                if time_until_due.total_seconds() <= 0:
                    # Task is overdue
                    should_remind = True
                    reminder_type = 'overdue'
                    # Schedule reminder every 24 hours for overdue tasks
                    reminder_delay = timedelta(hours=24)
                    
                elif time_until_due.total_seconds() <= 24 * 3600:
                    # Task due within 24 hours
                    should_remind = True
                    reminder_type = 'due_soon'
                    reminder_delay = timedelta(hours=4)  # Remind every 4 hours
                    
                elif time_until_due.total_seconds() <= 3 * 24 * 3600:
                    # Task due within 3 days
                    should_remind = True
                    reminder_type = 'due_soon'
                    reminder_delay = timedelta(hours=12)  # Remind every 12 hours
                
                # Check if task is at risk based on progress
                elif DeadlineService.is_at_risk(task):
                    should_remind = True
                    reminder_type = 'at_risk'
                    reminder_delay = timedelta(hours=24)  # Daily reminders for at-risk tasks
                
                if should_remind:
                    # Check if we've sent a reminder recently to avoid spam
                    recent_reminder = Notification.query.filter(
                        Notification.user_id == task.owner_id,
                        Notification.message.contains(f"Task '{task.title}'"),
                        Notification.created_at >= current_time - reminder_delay
                    ).first()
                    
                    if not recent_reminder:
                        # Schedule reminder task
                        send_deadline_reminder.delay(task.id, reminder_type)
                        reminder_count += 1
                        
            except Exception as task_error:
                logger.error(f"Error processing reminders for task {task.id}: {task_error}")
                continue
        
        logger.info(f"Scheduled {reminder_count} deadline reminders")
        return reminder_count
        
    except Exception as exc:
        logger.error(f"Error in check_and_schedule_reminders: {exc}")
        raise

@celery_app.task
def schedule_task_reminder(task_id, reminder_datetime):
    """
    Schedule a specific reminder for a task at a given datetime.
    
    Args:
        task_id (int): ID of the task
        reminder_datetime (str): ISO formatted datetime string
    """
    try:
        reminder_time = datetime.fromisoformat(reminder_datetime.replace('Z', '+00:00'))
        current_time = get_utc_now()
        
        if reminder_time <= current_time:
            # Send reminder immediately if time has passed
            send_deadline_reminder.delay(task_id, 'due_soon')
        else:
            # Schedule reminder for future
            delay_seconds = (reminder_time - current_time).total_seconds()
            send_deadline_reminder.apply_async(
                args=[task_id, 'due_soon'],
                countdown=delay_seconds
            )
            
        logger.info(f"Scheduled reminder for task {task_id} at {reminder_datetime}")
        
    except Exception as exc:
        logger.error(f"Error scheduling task reminder: {exc}")
        raise

@celery_app.task
def cleanup_expired_reminders():
    """
    Clean up old notifications and expired reminder tasks.
    Runs daily to maintain database performance.
    """
    try:
        # Delete notifications older than 30 days
        thirty_days_ago = get_utc_now() - timedelta(days=30)
        old_notifications = Notification.query.filter(
            Notification.created_at < thirty_days_ago
        ).count()
        
        Notification.query.filter(
            Notification.created_at < thirty_days_ago
        ).delete()
        
        db.session.commit()
        
        logger.info(f"Cleaned up {old_notifications} old notifications")
        return old_notifications
        
    except Exception as exc:
        logger.error(f"Error in cleanup_expired_reminders: {exc}")
        raise

@celery_app.task
def bulk_reminder_check(user_id):
    """
    Check and send reminders for all tasks assigned to a specific user.
    Useful for manual trigger or user-specific reminder updates.
    
    Args:
        user_id (int): ID of the user
    """
    try:
        user = User.query.get(user_id)
        if not user:
            logger.warning(f"User {user_id} not found for bulk reminder check")
            return
        
        # Use existing deadline service to get at-risk tasks
        summary = DeadlineService.scan_and_notify(user_id)
        
        logger.info(f"Bulk reminder check completed for user {user_id}: {summary}")
        return summary
        
    except Exception as exc:
        logger.error(f"Error in bulk_reminder_check for user {user_id}: {exc}")
        raise

@celery_app.task
def update_task_priority_reminders(task_id):
    """
    Update reminder schedule when task priority or deadline changes.
    
    Args:
        task_id (int): ID of the task
    """
    try:
        task = Task.query.get(task_id)
        if not task or task.status.value == 'completed':
            return
        
        # Cancel existing reminders for this task
        # Note: In production, you'd track reminder task IDs to cancel them
        
        # Reschedule based on new priority/deadline
        if task.due_date:
            current_time = get_utc_now()
            due_date = ensure_utc(task.due_date)
            
            # Schedule reminders at strategic intervals
            reminder_intervals = []
            
            if task.priority_score >= 8:  # High priority
                reminder_intervals = [
                    timedelta(days=7),   # 1 week before
                    timedelta(days=3),   # 3 days before
                    timedelta(days=1),   # 1 day before
                    timedelta(hours=4),  # 4 hours before
                ]
            elif task.priority_score >= 5:  # Medium priority
                reminder_intervals = [
                    timedelta(days=3),   # 3 days before
                    timedelta(days=1),   # 1 day before
                ]
            else:  # Low priority
                reminder_intervals = [
                    timedelta(days=1),   # 1 day before
                ]
            
            for interval in reminder_intervals:
                reminder_time = due_date - interval
                if reminder_time > current_time:
                    schedule_task_reminder.delay(task_id, reminder_time.isoformat())
        
        logger.info(f"Updated reminder schedule for task {task_id}")
        
    except Exception as exc:
        logger.error(f"Error updating task priority reminders: {exc}")
        raise

@celery_app.task
def check_project_deadlines():
    """
    Check all projects with deadlines and send reminders.
    This task runs periodically via Celery Beat.
    """
    try:
        from models import Project
        current_time = get_utc_now()
        
        # Get all projects with deadlines
        projects_with_deadlines = Project.query.filter(
            Project.deadline.isnot(None)
        ).all()
        
        reminder_count = 0
        
        for project in projects_with_deadlines:
            try:
                deadline = ensure_utc(project.deadline)
                time_until_deadline = deadline - current_time
                
                # Skip projects that are overdue by more than 7 days
                if time_until_deadline.total_seconds() < -7 * 24 * 3600:
                    continue
                
                should_remind = False
                reminder_type = 'due_soon'
                reminder_delay = timedelta(hours=24)
                
                if time_until_deadline.total_seconds() <= 0:
                    # Project is overdue
                    should_remind = True
                    reminder_type = 'overdue'
                    reminder_delay = timedelta(hours=24)  # Daily reminders for overdue
                    
                elif time_until_deadline.total_seconds() <= 4 * 3600:
                    # Project due within 4 hours
                    should_remind = True
                    reminder_type = 'final_reminder'
                    reminder_delay = timedelta(hours=1)  # Hourly reminders
                    
                elif time_until_deadline.total_seconds() <= 24 * 3600:
                    # Project due within 24 hours
                    should_remind = True
                    reminder_type = 'due_soon'
                    reminder_delay = timedelta(hours=6)  # Every 6 hours
                    
                elif time_until_deadline.total_seconds() <= 3 * 24 * 3600:
                    # Project due within 3 days
                    should_remind = True
                    reminder_type = 'due_soon'
                    reminder_delay = timedelta(hours=12)  # Every 12 hours
                
                if should_remind:
                    # Check if we've sent a reminder recently
                    recent_reminder = Notification.query.filter(
                        Notification.message.contains(f"Project '{project.name}'"),
                        Notification.created_at >= current_time - reminder_delay
                    ).first()
                    
                    if not recent_reminder:
                        from tasks.notification_tasks import send_project_deadline_reminder
                        send_project_deadline_reminder.delay(project.id, reminder_type)
                        reminder_count += 1
                        
            except Exception as project_error:
                logger.error(f"Error processing project deadline {project.id}: {project_error}")
                continue
        
        logger.info(f"Scheduled {reminder_count} project deadline reminders")
        return reminder_count
        
    except Exception as exc:
        logger.error(f"Error in check_project_deadlines: {exc}")
        raise
