from celery import Celery
from config import get_config
import os

def make_celery(app=None):
    """Create Celery instance with Flask app context"""
    config = get_config()
    
    celery = Celery(
        'synergysphere',
        broker=config.REDIS_URL,
        backend=config.REDIS_URL,
        include=['tasks.deadline_tasks']
    )
    
    # Configure Celery
    celery.conf.update(
        timezone='UTC',
        enable_utc=True,
        broker_connection_retry_on_startup=True,
        task_serializer='json',
        accept_content=['json'],
        result_serializer='json',
        task_always_eager=False,
        task_eager_propagates=True,
        worker_prefetch_multiplier=1,
        task_acks_late=True,
        worker_disable_rate_limits=True,
        # Deadline task routing
        task_routes={
            'tasks.deadline_tasks.*': {'queue': 'deadline_queue'},
        },
        beat_schedule={
            'check-project-deadlines': {
                'task': 'tasks.deadline_tasks.check_all_project_deadlines',
                'schedule': 300.0,  # Run every 5 minutes
            },
        }
    )
    
    if app:
        class ContextTask(celery.Task):
            """Make celery tasks work with Flask app context"""
            def __call__(self, *args, **kwargs):
                with app.app_context():
                    return self.run(*args, **kwargs)
        
        celery.Task = ContextTask
    
    return celery

# Create global celery instance
celery_app = make_celery()
