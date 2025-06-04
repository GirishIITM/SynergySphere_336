from celery import current_app as celery_app
from models import User, Notification, Task, Project
from extensions import db
from utils.email import send_email
import logging

logger = logging.getLogger(__name__)

@celery_app.task(bind=True, max_retries=3)
def send_task_assignment_notification(self, task_id, assigned_user_id, assigner_user_id):
    """
    Send notification when a task is assigned to a user.
    
    Args:
        task_id (int): ID of the assigned task
        assigned_user_id (int): ID of user receiving the task
        assigner_user_id (int): ID of user who assigned the task
    """
    try:
        # Ensure we're in app context
        from flask import current_app
        with current_app.app_context():
            task = Task.query.get(task_id)
            assigned_user = User.query.get(assigned_user_id)
            assigner = User.query.get(assigner_user_id)
            
            if not all([task, assigned_user, assigner]):
                logger.warning(f"Missing entities for task assignment notification: task={task_id}, assigned={assigned_user_id}, assigner={assigner_user_id}")
                return
            
            project_name = task.project.name if task.project else 'Unknown Project'
            
            # Create in-app notification
            message = f"You have been assigned task '{task.title}' in project '{project_name}' by {assigner.full_name}"
            notification = Notification(user_id=assigned_user.id, message=message)
            db.session.add(notification)
            
            # Send email if enabled
            if hasattr(assigned_user, 'notify_email') and assigned_user.notify_email:
                email_subject = f"Task Assigned: {task.title}"
                email_body = f"""
                Hello {assigned_user.full_name},
                
                You have been assigned a new task:
                
                Task: {task.title}
                Project: {project_name}
                Assigned by: {assigner.full_name}
                Due Date: {task.due_date.strftime('%Y-%m-%d %H:%M') if task.due_date else 'Not set'}
                
                Description:
                {task.description or 'No description provided'}
                
                Please log in to SynergySphere to view and manage your task.
                """
                
                send_email(email_subject, [assigned_user.email], "", email_body)
            
            db.session.commit()
            logger.info(f"Task assignment notification sent for task {task_id}")
        
    except Exception as exc:
        logger.error(f"Error sending task assignment notification: {exc}")
        raise self.retry(exc=exc, countdown=60 * (2 ** self.request.retries))

@celery_app.task(bind=True, max_retries=3)
def send_project_update_notification(self, project_id, update_type, user_ids=None):
    """
    Send notifications for project updates.
    
    Args:
        project_id (int): ID of the project
        update_type (str): Type of update ('member_added', 'deadline_changed', etc.)
        user_ids (list): List of user IDs to notify (optional, defaults to all members)
    """
    try:
        # Ensure we're in app context
        from flask import current_app
        with current_app.app_context():
            project = Project.query.get(project_id)
            if not project:
                logger.warning(f"Project {project_id} not found for update notification")
                return
            
            # Get users to notify
            if user_ids:
                users = User.query.filter(User.id.in_(user_ids)).all()
            else:
                users = project.members
            
            update_messages = {
                'member_added': f"New member added to project '{project.name}'",
                'deadline_changed': f"Deadline updated for project '{project.name}'",
                'project_updated': f"Project '{project.name}' has been updated",
                'task_completed': f"A task was completed in project '{project.name}'"
            }
            
            message = update_messages.get(update_type, f"Update in project '{project.name}'")
            
            for user in users:
                notification = Notification(user_id=user.id, message=message)
                db.session.add(notification)
                
                # Send email if enabled
                if hasattr(user, 'notify_email') and user.notify_email:
                    email_subject = f"Project Update: {project.name}"
                    send_email(email_subject, [user.email], "", message)
            
            db.session.commit()
            logger.info(f"Project update notifications sent for project {project_id}")
        
    except Exception as exc:
        logger.error(f"Error sending project update notification: {exc}")
        raise self.retry(exc=exc, countdown=60 * (2 ** self.request.retries))
