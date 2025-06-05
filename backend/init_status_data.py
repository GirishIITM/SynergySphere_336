#!/usr/bin/env python3
"""
Initialize Status Data Script

This script initializes the default status records in the database
and migrates existing task statuses to use the new status_id system.
"""

import sys
import os
import logging

# Add the backend directory to the Python path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app import create_app
from extensions import db
from models import Status, Task

def init_status_data():
    """Initialize default status data and migrate existing tasks."""
    
    print("🔄 Initializing status data...")
    
    try:
        # Initialize default statuses
        print("📊 Creating default statuses...")
        Status.initialize_default_statuses()
        
        # Get status mappings
        status_mapping = {
            'pending': Status.query.filter_by(name='pending').first(),
            'in_progress': Status.query.filter_by(name='in_progress').first(), 
            'completed': Status.query.filter_by(name='completed').first()
        }
        
        # Migrate existing tasks
        print("🔧 Migrating existing task statuses...")
        tasks = Task.query.all()
        migrated_count = 0
        
        for task in tasks:
            if task.status_id is None:  # Only migrate tasks without status_id
                # Map legacy status to new status_id
                if hasattr(task.status, 'value'):
                    legacy_status = task.status.value
                else:
                    legacy_status = str(task.status) if task.status else 'pending'
                
                # Get corresponding status object
                status_obj = status_mapping.get(legacy_status, status_mapping['pending'])
                if status_obj:
                    task.status_id = status_obj.id
                    migrated_count += 1
                    print(f"  ✅ Migrated task {task.id}: {legacy_status} -> status_id {status_obj.id}")
        
        # Commit changes
        db.session.commit()
        
        print(f"✅ Successfully migrated {migrated_count} tasks")
        print("✅ Status data initialization complete!")
        
        # Display status summary
        print("\n📋 Available Statuses:")
        statuses = Status.query.order_by(Status.display_order).all()
        for status in statuses:
            print(f"  • {status.name} (ID: {status.id}) - {status.description}")
            
    except Exception as e:
        print(f"❌ Error initializing status data: {e}")
        db.session.rollback()
        raise

def main():
    """Main function to run the status data initialization."""
    
    # Create Flask app context
    app = create_app()
    
    with app.app_context():
        print("🚀 Starting status data initialization...")
        init_status_data()
        print("🎉 Status data initialization completed successfully!")

if __name__ == '__main__':
    main() 