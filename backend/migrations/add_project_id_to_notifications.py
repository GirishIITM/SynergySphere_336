"""
Database migration to add project_id field to Notification table
"""

import sqlite3
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

def upgrade_notification_table():
    """Add project_id column to notification table."""
    try:
        # Connect to the database
        conn = sqlite3.connect('instance/synergysphere.db')
        cursor = conn.cursor()
        
        # Check if project_id column already exists
        cursor.execute("PRAGMA table_info(notification)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'project_id' not in columns:
            # Add project_id column
            cursor.execute("""
                ALTER TABLE notification 
                ADD COLUMN project_id INTEGER REFERENCES project(id)
            """)
            
            # Update existing notifications to link them to projects where possible
            # For task-related notifications, get project_id from task.project_id
            cursor.execute("""
                UPDATE notification 
                SET project_id = (
                    SELECT task.project_id 
                    FROM task 
                    WHERE task.id = notification.task_id
                )
                WHERE notification.task_id IS NOT NULL 
                AND notification.project_id IS NULL
            """)
            
            logger.info("Added project_id column to notification table and populated existing records")
        else:
            logger.info("project_id column already exists in notification table")
        
        conn.commit()
        conn.close()
        
        return True
        
    except Exception as e:
        logger.error(f"Error upgrading notification table: {e}")
        if 'conn' in locals():
            conn.rollback()
            conn.close()
        return False

def run_migration():
    """Run the notification table migration."""
    print(f"Starting notification table migration - {datetime.now()}")
    
    success = upgrade_notification_table()
    
    if success:
        print("✅ Notification table migration completed successfully!")
    else:
        print("❌ Notification table migration failed!")
    
    return success

if __name__ == "__main__":
    run_migration() 