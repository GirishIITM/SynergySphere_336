#!/usr/bin/env python3
"""
Celery worker startup script for SynergySphere.

Usage:
    celery -A celery_worker.celery worker --loglevel=info
    celery -A celery_worker.celery beat --loglevel=info
"""

import os
import sys

# Import the celery instance from the main app
from app import celery

if __name__ == '__main__':
    # Allow running celery commands directly
    celery.start()
