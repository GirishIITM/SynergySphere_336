from datetime import datetime, timedelta
from utils.datetime_utils import get_utc_now, ensure_utc
from tasks.deadline_tasks import (
    schedule_project_deadline_notifications,
    cancel_project_deadline_notifications,
    reschedule_user_deadline_notifications
)
import logging

logger = logging.getLogger(__name__)

class DeadlineService:
    """Service for managing project deadline notifications"""
    
    @staticmethod
    def schedule_project_notifications(project_id, deadline=None):
        """Schedule deadline notifications for a project"""
        try:
            if deadline:
                current_time = get_utc_now()
                deadline_time = ensure_utc(deadline)
                
                # Only schedule if deadline is in the future
                if deadline_time > current_time:
                    schedule_project_deadline_notifications.delay(project_id)
                    logger.info(f"Scheduled deadline notifications for project {project_id}")
                    return True
                else:
                    logger.info(f"Project {project_id} deadline is in the past, not scheduling")
                    return False
            return False
        except Exception as e:
            logger.error(f"Error scheduling project notifications: {e}")
            return False
    
    @staticmethod
    def cancel_project_notifications(project_id):
        """Cancel all deadline notifications for a project"""
        try:
            cancel_project_deadline_notifications.delay(project_id)
            logger.info(f"Cancelled deadline notifications for project {project_id}")
            return True
        except Exception as e:
            logger.error(f"Error cancelling project notifications: {e}")
            return False
    
    @staticmethod
    def reschedule_project_notifications(project_id, new_deadline=None):
        """Reschedule deadline notifications for a project"""
        try:
            # Cancel existing notifications
            DeadlineService.cancel_project_notifications(project_id)
            
            # Schedule new notifications if deadline exists
            if new_deadline:
                return DeadlineService.schedule_project_notifications(project_id, new_deadline)
            return True
        except Exception as e:
            logger.error(f"Error rescheduling project notifications: {e}")
            return False
    
    @staticmethod
    def reschedule_user_notifications(user_id):
        """Reschedule all deadline notifications for a user with new timing preference"""
        try:
            reschedule_user_deadline_notifications.delay(user_id)
            logger.info(f"Rescheduled user deadline notifications for user {user_id}")
            return True
        except Exception as e:
            logger.error(f"Error rescheduling user notifications: {e}")
            return False
    
    @staticmethod
    def get_notification_timing_options():
        """Get available notification timing options"""
        return [
            {'value': 0.5, 'label': '30 minutes before'},
            {'value': 1, 'label': '1 hour before'},
            {'value': 2, 'label': '2 hours before'},
            {'value': 6, 'label': '6 hours before'},
            {'value': 12, 'label': '12 hours before'},
            {'value': 24, 'label': '1 day before'},
            {'value': 48, 'label': '2 days before'},
            {'value': 72, 'label': '3 days before'}
        ]
