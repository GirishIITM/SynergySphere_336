"""
SQLite-specific migration script to add missing columns to task table
"""

import sqlite3
import os
from datetime import datetime

def migrate_sqlite():
    """Add missing columns to SQLite task table"""
    
    # Path to SQLite database - checking both possible locations
    db_paths = ['app.db', 'instance/app.db']
    db_path = None
    
    for path in db_paths:
        if os.path.exists(path):
            db_path = path
            print(f"Found database at: {path}")
            break
    
    if not db_path:
        print("No database file found! Tried: " + ", ".join(db_paths))
        return False
    
    try:
        # Connect to SQLite database
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        print("Checking current task table schema...")
        cursor.execute("PRAGMA table_info(task)")
        existing_columns = [row[1] for row in cursor.fetchall()]
        print(f"Existing columns: {existing_columns}")
        
        # Define columns to add
        new_columns = [
            ('priority_score', 'REAL DEFAULT 0.0'),
            ('parent_task_id', 'INTEGER'),
            ('estimated_effort', 'INTEGER DEFAULT 0'),
            ('percent_complete', 'INTEGER DEFAULT 0'),
            ('last_progress_update', 'DATETIME')
        ]
        
        # Add missing columns
        for column_name, column_def in new_columns:
            if column_name not in existing_columns:
                try:
                    sql = f"ALTER TABLE task ADD COLUMN {column_name} {column_def}"
                    print(f"Executing: {sql}")
                    cursor.execute(sql)
                    print(f"  Added {column_name} to task table")
                except Exception as e:
                    print(f"  Error adding {column_name}: {str(e)}")
        
        # Update last_progress_update for existing tasks
        cursor.execute("UPDATE task SET last_progress_update = created_at WHERE last_progress_update IS NULL")
        
        # Check message table and add task_id if missing
        cursor.execute("PRAGMA table_info(message)")
        message_columns = [row[1] for row in cursor.fetchall()]
        
        if 'task_id' not in message_columns:
            try:
                cursor.execute("ALTER TABLE message ADD COLUMN task_id INTEGER")
                print("  Added task_id to message table")
            except Exception as e:
                print(f"  Error adding task_id to message: {str(e)}")
        
        # Commit changes
        conn.commit()
        print("Migration completed successfully!")
        
        # Verify the changes
        cursor.execute("PRAGMA table_info(task)")
        final_columns = [row[1] for row in cursor.fetchall()]
        print(f"Final task table columns: {final_columns}")
        
        conn.close()
        return True
        
    except Exception as e:
        print(f"Migration failed: {str(e)}")
        return False

if __name__ == "__main__":
    migrate_sqlite() 