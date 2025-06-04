"""
Database migration script for SynergySphere advanced features.
This script adds new fields to existing tables and creates new tables for budgets and expenses.
"""

from extensions import db
from models import *
import sys
from sqlalchemy import text

def migrate_database():
    """Apply database migrations for advanced features."""
    try:
        # Create Flask app context
        from app import create_app
        app = create_app()
        
        with app.app_context():
            # Add new columns to Task table
            print("Adding new columns to Task table...")
            
            # These columns will be added automatically when the Task model is updated
            # and db.create_all() is called, but we need to handle existing databases
            
            # Check if columns exist before adding them
            inspector = db.inspect(db.engine)
            task_columns = [column['name'] for column in inspector.get_columns('task')]
            
            # Check if we're using SQLite or PostgreSQL
            is_sqlite = 'sqlite' in str(db.engine.url)
            
            # Use appropriate column definitions based on database type
            if is_sqlite:
                new_task_columns = [
                    ('priority_score', 'REAL DEFAULT 0.0'),
                    ('parent_task_id', 'INTEGER'),
                    ('estimated_effort', 'INTEGER DEFAULT 0'),
                    ('percent_complete', 'INTEGER DEFAULT 0'),
                    ('last_progress_update', 'DATETIME'),
                    ('budget', 'REAL')
                ]
            else:
                new_task_columns = [
                    ('priority_score', 'REAL DEFAULT 0.0'),
                    ('parent_task_id', 'INTEGER'),
                    ('estimated_effort', 'INTEGER DEFAULT 0'),
                    ('percent_complete', 'INTEGER DEFAULT 0'),
                    ('last_progress_update', 'TIMESTAMP'),
                    ('budget', 'REAL')
                ]
            
            with db.engine.begin() as connection:
                for column_name, column_def in new_task_columns:
                    if column_name not in task_columns:
                        try:
                            connection.execute(text(f'ALTER TABLE task ADD COLUMN {column_name} {column_def}'))
                            print(f"  Added {column_name} to task table")
                        except Exception as e:
                            print(f"  Warning: Could not add {column_name}: {str(e)}")
                
                # Add task_id column to Message table
                message_columns = [column['name'] for column in inspector.get_columns('message')]
                if 'task_id' not in message_columns:
                    try:
                        connection.execute(text('ALTER TABLE message ADD COLUMN task_id INTEGER'))
                        print("  Added task_id to message table")
                    except Exception as e:
                        print(f"  Warning: Could not add task_id: {str(e)}")
            
            # Create new tables if they don't exist
            print("Creating new tables...")
            db.create_all()
            
            # Add foreign key constraints if needed (SQLite limitations)
            print("Database migration completed successfully!")
            
            return True
        
    except Exception as e:
        print(f"Error during migration: {str(e)}")
        return False

def rollback_migration():
    """Rollback database migrations (limited in SQLite)."""
    print("Warning: Rollback is limited in SQLite. Consider backing up your database before migration.")
    # In a production environment, you would implement proper rollback logic here
    pass

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "rollback":
        rollback_migration()
    else:
        migrate_database()