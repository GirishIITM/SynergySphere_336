#!/usr/bin/env python
"""
Celery worker script for SynergySphere deadline notifications
Usage: python celery_worker.py
"""

import os
import sys
from app import app

# Use the existing celery instance from the app
celery = app.celery

if __name__ == '__main__':
    # Run celery worker
    celery.start()
