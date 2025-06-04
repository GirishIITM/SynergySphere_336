from celery import current_app as celery_app
from datetime import datetime, timedelta
from extensions import db
from models import Project, User, Notification
from models.project import Membership
from utils.email import send_email
from utils.email_templates import get_deadline_reminder_template
from utils.datetime_utils import get_utc_now, ensure_utc
from sqlalchemy import and_, or_
import logging

logger = logging.getLogger(__name__)

@celery_app.task(bind=True, name='tasks.deadline_tasks.send_deadline_notification')
def send_deadline_notification(self, project_id, user_id, notification_type='reminder'):
    """Send deadline notification to a specific user"""
    try:
        project = Project.query.get(project_id)
        user = User.query.get(user_id)
        
        if not project or not user:
            logger.error(f"Project {project_id} or User {user_id} not found")
            return False
        
        # Check if user is still a member
        membership = Membership.query.filter_by(
            user_id=user_id, 
            project_id=project_id
        ).first()
        
        if not membership:
            logger.info(f"User {user_id} no longer member of project {project_id}")
            return False
        
        # Calculate days until deadline
        current_time = get_utc_now()
        deadline = ensure_utc(project.deadline) if project.deadline else None
        
        if not deadline:
            logger.warning(f"Project {project_id} has no deadline")
            return False
        
        days_until = (deadline - current_time).days
        hours_until = (deadline - current_time).total_seconds() / 3600
        
        # Determine notification message
        if notification_type == 'final':
            if hours_until <= 0:
                message = f"⚠️ DEADLINE REACHED: Project '{project.name}' deadline has passed!"
                urgency = "CRITICAL"
            else:
                message = f"🚨 URGENT: Project '{project.name}' deadline is in {int(hours_until)} hours!"
                urgency = "URGENT"
        else:
            if days_until <= 0:
                message = f"⏰ Project '{project.name}' deadline is today!"
                urgency = "HIGH"
            elif days_until == 1:
                message = f"📅 Project '{project.name}' deadline is tomorrow!"
                urgency = "MEDIUM"
            else:
                message = f"📋 Project '{project.name}' deadline is in {days_until} days"
                urgency = "LOW"
        
        # Create in-app notification
        if user.notify_in_app:
            notification = Notification(
                user_id=user_id,
                message=message
            )
            db.session.add(notification)
            db.session.commit()
        
        # Send email notification
        if user.notify_email:
            try:
                email_content = get_deadline_reminder_template(
                    user.full_name or user.username,
                    project.name,
                    deadline,
                    max(1, days_until)
                )
                
                subject = f"[{urgency}] Deadline Reminder: {project.name}"
                send_email(subject, [user.email], email_content, "")
                logger.info(f"Deadline email sent to {user.email} for project {project.name}")
            except Exception as e:
                logger.error(f"Failed to send deadline email to {user.email}: {e}")
        
        return True
        
    except Exception as e:
        logger.error(f"Error in send_deadline_notification: {e}")
        self.retry(countdown=60, max_retries=3)
        return False

@celery_app.task(bind=True, name='tasks.deadline_tasks.schedule_project_deadline_notifications')
def schedule_project_deadline_notifications(self, project_id):
    """Schedule all deadline notifications for a project"""
    try:
        project = Project.query.get(project_id)
        if not project or not project.deadline:
            return False
        
        deadline = ensure_utc(project.deadline)
        current_time = get_utc_now()
        
        # Don't schedule if deadline has already passed
        if deadline <= current_time:
            logger.info(f"Project {project_id} deadline has already passed")
            return False
        
        # Get all project members
        memberships = Membership.query.filter_by(project_id=project_id).all()
        
        for membership in memberships:
            user = User.query.get(membership.user_id)
            if not user:
                continue
            
            # Schedule reminder notification based on user preference
            reminder_hours = user.deadline_notification_hours or 1
            reminder_time = deadline - timedelta(hours=reminder_hours)
            
            if reminder_time > current_time:
                # Schedule reminder notification
                send_deadline_notification.apply_async(
                    args=[project_id, user.id, 'reminder'],
                    eta=reminder_time,
                    task_id=f"reminder_{project_id}_{user.id}"
                )
                logger.info(f"Scheduled reminder for user {user.id} at {reminder_time}")
            
            # Schedule final notification at deadline
            send_deadline_notification.apply_async(
                args=[project_id, user.id, 'final'],
                eta=deadline,
                task_id=f"final_{project_id}_{user.id}"
            )
            logger.info(f"Scheduled final notification for user {user.id} at {deadline}")
        
        return True
        
    except Exception as e:
        logger.error(f"Error scheduling project deadline notifications: {e}")
        self.retry(countdown=300, max_retries=2)
        return False

@celery_app.task(name='tasks.deadline_tasks.cancel_project_deadline_notifications')
def cancel_project_deadline_notifications(project_id):
    """Cancel all scheduled deadline notifications for a project"""
    try:
        # Get all project members to cancel their notifications
        memberships = Membership.query.filter_by(project_id=project_id).all()
        
        for membership in memberships:
            user_id = membership.user_id
            
            # Cancel reminder notification
            try:
                celery_app.control.revoke(f"reminder_{project_id}_{user_id}", terminate=True)
            except:
                pass
            
            # Cancel final notification
            try:
                celery_app.control.revoke(f"final_{project_id}_{user_id}", terminate=True)
            except:
                pass
        
        logger.info(f"Cancelled deadline notifications for project {project_id}")
        return True
        
    except Exception as e:
        logger.error(f"Error cancelling project deadline notifications: {e}")
        return False

@celery_app.task(name='tasks.deadline_tasks.check_all_project_deadlines')
def check_all_project_deadlines():
    """Periodic task to check all project deadlines and ensure notifications are scheduled"""
    try:
        current_time = get_utc_now()
        upcoming_deadline = current_time + timedelta(days=7)  # Check projects with deadlines in next 7 days
        
        # Find projects with upcoming deadlines
        projects = Project.query.filter(
            and_(
                Project.deadline.isnot(None),
                Project.deadline > current_time,
                Project.deadline <= upcoming_deadline
            )
        ).all()
        
        scheduled_count = 0
        for project in projects:
            # Re-schedule notifications to ensure they're not missed
            schedule_project_deadline_notifications.delay(project.id)
            scheduled_count += 1
        
        logger.info(f"Checked {len(projects)} projects with upcoming deadlines, scheduled {scheduled_count}")
        return scheduled_count
        
    except Exception as e:
        logger.error(f"Error in check_all_project_deadlines: {e}")
        return 0

@celery_app.task(name='tasks.deadline_tasks.reschedule_user_deadline_notifications')
def reschedule_user_deadline_notifications(user_id):
    """Reschedule deadline notifications for a user when they change their notification preference"""
    try:
        user = User.query.get(user_id)
        if not user:
            return False
        
        current_time = get_utc_now()
        
        # Find all projects where user is a member with future deadlines
        memberships = Membership.query.filter_by(user_id=user_id).all()
        
        for membership in memberships:
            project = Project.query.get(membership.project_id)
            if not project or not project.deadline:
                continue
            
            deadline = ensure_utc(project.deadline)
            if deadline <= current_time:
                continue
            
            # Cancel existing notifications for this user and project
            try:
                celery_app.control.revoke(f"reminder_{project.id}_{user_id}", terminate=True)
            except:
                pass
            
            # Schedule new reminder with updated timing
            reminder_hours = user.deadline_notification_hours or 1
            reminder_time = deadline - timedelta(hours=reminder_hours)
            
            if reminder_time > current_time:
                send_deadline_notification.apply_async(
                    args=[project.id, user_id, 'reminder'],
                    eta=reminder_time,
                    task_id=f"reminder_{project.id}_{user_id}"
                )
        
        logger.info(f"Rescheduled deadline notifications for user {user_id}")
        return True
        
    except Exception as e:
        logger.error(f"Error rescheduling user deadline notifications: {e}")
        return False
