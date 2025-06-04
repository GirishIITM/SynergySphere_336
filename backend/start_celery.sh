#!/bin/bash

# Start Celery worker and beat scheduler for deadline notifications

# Start Celery worker in background
celery -A celery_config.celery_app worker --loglevel=info --queues=deadline_queue &

# Start Celery beat scheduler for periodic tasks
celery -A celery_config.celery_app beat --loglevel=info &

echo "Celery worker and beat scheduler started"
echo "Worker PID: $!"

# Keep script running
wait
