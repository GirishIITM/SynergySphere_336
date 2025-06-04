from celery import Celery
from celery.schedules import crontab
import os

def make_celery(app):
    """Create Celery instance and configure it with Flask app."""
    # Use Redis URL from environment or default to localhost
    broker_url = os.environ.get('REDIS_URL', 'redis://localhost:6379/0')
    result_backend = os.environ.get('REDIS_URL', 'redis://localhost:6379/0')
    
    celery = Celery(
        app.import_name,
        backend=result_backend,
        broker=broker_url,
        include=['tasks.deadline_tasks', 'tasks.notification_tasks']
    )
    
    # Configure Celery
    celery.conf.update(
        # Task routing
        task_routes={
            'tasks.deadline_tasks.*': {'queue': 'deadlines'},
            'tasks.notification_tasks.*': {'queue': 'notifications'},
        },
        # Timezone settings
        timezone='UTC',
        enable_utc=True,
        # Task serialization
        task_serializer='json',
        accept_content=['json'],
        result_serializer='json',
        # Task execution settings
        task_acks_late=True,
        worker_prefetch_multiplier=1,
        # Beat schedule for periodic tasks
        beat_schedule={
            'check-deadline-reminders': {
                'task': 'tasks.deadline_tasks.check_and_schedule_reminders',
                'schedule': crontab(minute='*/30'),  # Every 30 minutes
            },
            'cleanup-expired-reminders': {
                'task': 'tasks.deadline_tasks.cleanup_expired_reminders',
                'schedule': crontab(hour=2, minute=0),  # Daily at 2 AM
            },
        },
    )
    
    # Update task base classes
    class ContextTask(celery.Task):
        """Make celery tasks work with Flask app context."""
        def __call__(self, *args, **kwargs):
            with app.app_context():
                return self.run(*args, **kwargs)
    
    celery.Task = ContextTask
    return celery

# Initialize Celery (will be configured when app is created)
celery = None
