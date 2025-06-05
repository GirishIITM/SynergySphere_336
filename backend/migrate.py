#!/usr/bin/env python3
"""
Comprehensive Database Migration Script for SynergySphere
This single script handles all database schema updates and migrations.
"""

import os
import sys
import sqlite3
from datetime import datetime
from sqlalchemy import create_engine, text, inspect
from sqlalchemy.exc import SQLAlchemyError

def get_database_config():
    """Get database configuration from environment or use defaults."""
    use_postgresql = os.getenv('USE_POSTGRESQL', 'false').lower() == 'true'
    
    if use_postgresql:
        user = os.getenv('POSTGRES_USER', 'avnadmin')
        password = os.getenv('POSTGRES_PASSWORD', '')
        host = os.getenv('POSTGRES_HOST', 'localhost')
        port = os.getenv('POSTGRES_PORT', '5432')
        dbname = os.getenv('POSTGRES_DB', 'defaultdb')
        sslmode = os.getenv('POSTGRES_SSLMODE', 'require')
        database_url = os.getenv(
            'DATABASE_URL',
            f'postgresql://{user}:{password}@{host}:{port}/{dbname}?sslmode={sslmode}'
        )
    else:
        database_url = os.getenv('SQLITE_DATABASE_URL', 'sqlite:///app.db')
    
    return database_url, use_postgresql

def migrate_sqlite_direct(db_path):
    """Direct SQLite migration using sqlite3 module."""
    print(f"🔧 Running SQLite migration on: {db_path}")
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Get existing columns
        cursor.execute("PRAGMA table_info(task)")
        existing_columns = [row[1] for row in cursor.fetchall()]
        print(f"📋 Existing task columns: {existing_columns}")
        
        # Create status table if it doesn't exist
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='status'")
        if not cursor.fetchone():
            print("  📊 Creating status table...")
            cursor.execute('''
                CREATE TABLE status (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name VARCHAR(50) NOT NULL UNIQUE,
                    description VARCHAR(200),
                    display_order INTEGER NOT NULL DEFAULT 0,
                    color VARCHAR(7),
                    created_at DATETIME,
                    updated_at DATETIME
                )
            ''')
            print("  ✅ Created status table")
            
            # Insert default statuses
            default_statuses = [
                ('pending', 'Task has not been started', 1, '#6B7280'),
                ('in_progress', 'Task is currently being worked on', 2, '#3B82F6'),
                ('completed', 'Task has been completed', 3, '#10B981')
            ]
            
            for name, desc, order, color in default_statuses:
                cursor.execute('''
                    INSERT INTO status (name, description, display_order, color, created_at, updated_at)
                    VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
                ''', (name, desc, order, color))
            print("  ✅ Inserted default statuses")
        
        # Define all required columns for task table
        required_columns = [
            ('priority_score', 'REAL DEFAULT 0.0'),
            ('parent_task_id', 'INTEGER'),
            ('estimated_effort', 'INTEGER DEFAULT 0'),
            ('percent_complete', 'INTEGER DEFAULT 0'),
            ('last_progress_update', 'DATETIME'),
            ('budget', 'REAL'),
            ('is_favorite', 'BOOLEAN DEFAULT 0 NOT NULL'),
            ('status_id', 'INTEGER REFERENCES status(id)')
        ]
        
        # Add missing columns
        for column_name, column_def in required_columns:
            if column_name not in existing_columns:
                try:
                    sql = f"ALTER TABLE task ADD COLUMN {column_name} {column_def}"
                    cursor.execute(sql)
                    print(f"  ✅ Added {column_name} to task table")
                except Exception as e:
                    print(f"  ❌ Error adding {column_name}: {str(e)}")
        
        # Update last_progress_update for existing tasks
        cursor.execute("""
            UPDATE task 
            SET last_progress_update = created_at 
            WHERE last_progress_update IS NULL
        """)
        
        # Migrate existing task statuses to use status_id
        cursor.execute("SELECT id FROM status WHERE name = 'pending' LIMIT 1")
        pending_status_result = cursor.fetchone()
        if pending_status_result:
            pending_status_id = pending_status_result[0]
            
            # Update tasks that don't have status_id set
            cursor.execute("""
                UPDATE task 
                SET status_id = (
                    CASE 
                        WHEN status = 'pending' THEN (SELECT id FROM status WHERE name = 'pending')
                        WHEN status = 'in_progress' THEN (SELECT id FROM status WHERE name = 'in_progress')
                        WHEN status = 'completed' THEN (SELECT id FROM status WHERE name = 'completed')
                        ELSE (SELECT id FROM status WHERE name = 'pending')
                    END
                )
                WHERE status_id IS NULL
            """)
            
            migrated_count = cursor.rowcount
            if migrated_count > 0:
                print(f"  ✅ Migrated {migrated_count} tasks to use status_id")
        else:
            print("  ⚠️  No default statuses found for migration")
        
        # Check message table and add task_id if missing
        cursor.execute("PRAGMA table_info(message)")
        message_columns = [row[1] for row in cursor.fetchall()]
        
        if 'task_id' not in message_columns:
            try:
                cursor.execute("ALTER TABLE message ADD COLUMN task_id INTEGER")
                print("  ✅ Added task_id to message table")
            except Exception as e:
                print(f"  ❌ Error adding task_id to message: {str(e)}")
        
        # Check notification table and add enhanced columns if missing
        cursor.execute("PRAGMA table_info(notification)")
        notification_columns = [row[1] for row in cursor.fetchall()]
        print(f"📋 Existing notification columns: {notification_columns}")
        
        notification_required_columns = [
            ('task_id', 'INTEGER'),
            ('message_id', 'INTEGER'),
            ('notification_type', 'VARCHAR(50) DEFAULT "general"')
        ]
        
        for column_name, column_def in notification_required_columns:
            if column_name not in notification_columns:
                try:
                    cursor.execute(f"ALTER TABLE notification ADD COLUMN {column_name} {column_def}")
                    print(f"  ✅ Added {column_name} to notification table")
                except Exception as e:
                    print(f"  ❌ Error adding {column_name} to notification: {str(e)}")
        
        # Set default notification_type for existing notifications
        cursor.execute("""
            UPDATE notification 
            SET notification_type = 'general' 
            WHERE notification_type IS NULL
        """)
        
        conn.commit()
        conn.close()
        print("🎉 SQLite migration completed successfully!")
        return True
        
    except Exception as e:
        print(f"❌ SQLite migration failed: {str(e)}")
        return False

def migrate_postgresql(database_url):
    """Migrate PostgreSQL database using SQLAlchemy."""
    print(f"🔧 Running PostgreSQL migration")
    
    try:
        engine = create_engine(database_url)
        inspector = inspect(engine)
        
        # Check if task table exists
        if not inspector.has_table('task'):
            print("❌ Task table does not exist. Please run db.create_all() first.")
            return False
        
        # Create status table if it doesn't exist
        if not inspector.has_table('status'):
            print("  📊 Creating status table...")
            with engine.begin() as conn:
                conn.execute(text('''
                    CREATE TABLE status (
                        id SERIAL PRIMARY KEY,
                        name VARCHAR(50) NOT NULL UNIQUE,
                        description VARCHAR(200),
                        display_order INTEGER NOT NULL DEFAULT 0,
                        color VARCHAR(7),
                        created_at TIMESTAMP,
                        updated_at TIMESTAMP
                    )
                '''))
                print("  ✅ Created status table")
                
                # Insert default statuses
                default_statuses = [
                    ('pending', 'Task has not been started', 1, '#6B7280'),
                    ('in_progress', 'Task is currently being worked on', 2, '#3B82F6'),
                    ('completed', 'Task has been completed', 3, '#10B981')
                ]
                
                for name, desc, order, color in default_statuses:
                    conn.execute(text('''
                        INSERT INTO status (name, description, display_order, color, created_at, updated_at)
                        VALUES (:name, :description, :display_order, :color, NOW(), NOW())
                    '''), {'name': name, 'description': desc, 'display_order': order, 'color': color})
                print("  ✅ Inserted default statuses")
        
        # Get existing columns
        existing_columns = [col['name'] for col in inspector.get_columns('task')]
        print(f"📋 Existing task columns: {existing_columns}")
        
        # Define required columns for PostgreSQL
        required_columns = [
            ('priority_score', 'REAL DEFAULT 0.0'),
            ('parent_task_id', 'INTEGER'),
            ('estimated_effort', 'INTEGER DEFAULT 0'),
            ('percent_complete', 'INTEGER DEFAULT 0'),
            ('last_progress_update', 'TIMESTAMP'),
            ('budget', 'REAL'),
            ('is_favorite', 'BOOLEAN DEFAULT FALSE NOT NULL'),
            ('status_id', 'INTEGER REFERENCES status(id)')
        ]
        
        with engine.begin() as conn:
            # Add missing columns
            for column_name, column_def in required_columns:
                if column_name not in existing_columns:
                    try:
                        sql = f'ALTER TABLE task ADD COLUMN {column_name} {column_def}'
                        conn.execute(text(sql))
                        print(f"  ✅ Added {column_name} to task table")
                    except Exception as e:
                        print(f"  ❌ Error adding {column_name}: {str(e)}")
            
            # Update last_progress_update for existing tasks
            conn.execute(text("""
                UPDATE task 
                SET last_progress_update = created_at 
                WHERE last_progress_update IS NULL
            """))
            
            # Migrate existing task statuses to use status_id
            status_check = conn.execute(text("SELECT id FROM status WHERE name = 'pending' LIMIT 1")).fetchone()
            if status_check:
                # Update tasks that don't have status_id set
                conn.execute(text("""
                    UPDATE task 
                    SET status_id = (
                        CASE 
                            WHEN status = 'pending' THEN (SELECT id FROM status WHERE name = 'pending')
                            WHEN status = 'in_progress' THEN (SELECT id FROM status WHERE name = 'in_progress')
                            WHEN status = 'completed' THEN (SELECT id FROM status WHERE name = 'completed')
                            ELSE (SELECT id FROM status WHERE name = 'pending')
                        END
                    )
                    WHERE status_id IS NULL
                """))
                print("  ✅ Migrated existing tasks to use status_id")
            else:
                print("  ⚠️  No default statuses found for migration")
            
            # Check message table and add task_id if missing
            if inspector.has_table('message'):
                message_columns = [col['name'] for col in inspector.get_columns('message')]
                if 'task_id' not in message_columns:
                    try:
                        conn.execute(text('ALTER TABLE message ADD COLUMN task_id INTEGER'))
                        print("  ✅ Added task_id to message table")
                    except Exception as e:
                        print(f"  ❌ Error adding task_id to message: {str(e)}")
            
            # Check notification table and add enhanced columns if missing
            if inspector.has_table('notification'):
                notification_columns = [col['name'] for col in inspector.get_columns('notification')]
                print(f"📋 Existing notification columns: {notification_columns}")
                
                notification_required_columns = [
                    ('task_id', 'INTEGER'),
                    ('message_id', 'INTEGER'),
                    ('notification_type', 'VARCHAR(50) DEFAULT \'general\'')
                ]
                
                for column_name, column_def in notification_required_columns:
                    if column_name not in notification_columns:
                        try:
                            conn.execute(text(f'ALTER TABLE notification ADD COLUMN {column_name} {column_def}'))
                            print(f"  ✅ Added {column_name} to notification table")
                        except Exception as e:
                            print(f"  ❌ Error adding {column_name} to notification: {str(e)}")
                
                # Set default notification_type for existing notifications
                conn.execute(text("""
                    UPDATE notification 
                    SET notification_type = 'general' 
                    WHERE notification_type IS NULL
                """))
        
        print("🎉 PostgreSQL migration completed successfully!")
        return True
        
    except Exception as e:
        print(f"❌ PostgreSQL migration failed: {str(e)}")
        return False

def run_flask_migration():
    """Run migration using Flask app context."""
    print("🔧 Running Flask-based migration...")
    
    try:
        # Add current directory to path
        sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
        
        from app import create_app
        from extensions import db
        
        app = create_app()
        
        with app.app_context():
            # Create all tables (this will add new columns to existing tables)
            db.create_all()
            print("  ✅ Created/updated all database tables")
            
            # Run specific column additions that might not be handled by create_all
            inspector = db.inspect(db.engine)
            
            if inspector.has_table('task'):
                task_columns = [col['name'] for col in inspector.get_columns('task')]
                is_sqlite = 'sqlite' in str(db.engine.url)
                
                # Check if is_favorite column exists
                if 'is_favorite' not in task_columns:
                    with db.engine.begin() as conn:
                        if is_sqlite:
                            conn.execute(text('ALTER TABLE task ADD COLUMN is_favorite BOOLEAN DEFAULT 0 NOT NULL'))
                        else:
                            conn.execute(text('ALTER TABLE task ADD COLUMN is_favorite BOOLEAN DEFAULT FALSE NOT NULL'))
                        print("  ✅ Added is_favorite column to task table")
                
                # Check if status_id column exists
                if 'status_id' not in task_columns:
                    with db.engine.begin() as conn:
                        if is_sqlite:
                            conn.execute(text('ALTER TABLE task ADD COLUMN status_id INTEGER REFERENCES status(id)'))
                        else:
                            conn.execute(text('ALTER TABLE task ADD COLUMN status_id INTEGER REFERENCES status(id)'))
                        print("  ✅ Added status_id column to task table")
                        
                        # Initialize status_id for existing tasks
                        conn.execute(text("""
                            UPDATE task 
                            SET status_id = (
                                CASE 
                                    WHEN status = 'pending' THEN (SELECT id FROM status WHERE name = 'pending')
                                    WHEN status = 'in_progress' THEN (SELECT id FROM status WHERE name = 'in_progress')
                                    WHEN status = 'completed' THEN (SELECT id FROM status WHERE name = 'completed')
                                    ELSE (SELECT id FROM status WHERE name = 'pending')
                                END
                            )
                            WHERE status_id IS NULL
                        """))
                        print("  ✅ Migrated existing tasks to use status_id")
            
            print("🎉 Flask migration completed successfully!")
            return True
            
    except Exception as e:
        print(f"❌ Flask migration failed: {str(e)}")
        return False

def main():
    """Main migration function."""
    print("🚀 Starting SynergySphere Database Migration")
    print("=" * 50)
    
    # Get database configuration
    database_url, use_postgresql = get_database_config()
    
    if not database_url:
        print("❌ No database URL found in configuration")
        return False
    
    print(f"📊 Database type: {'PostgreSQL' if use_postgresql else 'SQLite'}")
    print(f"🔗 Database URL: {database_url.split('@')[0]}@***" if '@' in database_url else database_url)
    
    success = False
    
    try:
        if use_postgresql:
            success = migrate_postgresql(database_url)
        else:
            # For SQLite, try direct connection first
            if database_url.startswith('sqlite:///'):
                db_path = database_url.replace('sqlite:///', '')
                if os.path.exists(db_path):
                    success = migrate_sqlite_direct(db_path)
                else:
                    print(f"⚠️  Database file not found: {db_path}")
                    print("🔄 Trying Flask-based migration...")
                    success = run_flask_migration()
            else:
                success = run_flask_migration()
        
        if not success:
            print("🔄 Primary migration failed, trying Flask-based migration as fallback...")
            success = run_flask_migration()
            
    except Exception as e:
        print(f"❌ Migration failed with error: {str(e)}")
        print("🔄 Trying Flask-based migration as fallback...")
        success = run_flask_migration()
    
    if success:
        print("\n🎉 Database migration completed successfully!")
        print("✨ Your database is now ready with all the latest features:")
        print("   • Task favorites (is_favorite field)")
        print("   • Priority scoring (priority_score field)")
        print("   • Task dependencies (parent_task_id field)")
        print("   • Progress tracking (percent_complete, estimated_effort)")
        print("   • Budget management (budget field)")
        print("   • Enhanced messaging (task_id in message table)")
        print("   • Status system (status table with status_id in tasks)")
        print("   • Three default statuses: Pending, In Progress, Completed")
    else:
        print("\n❌ Migration failed!")
        print("Please check the error messages above and try again.")
        return False
    
    return True

def rollback():
    """Rollback migration (limited functionality)."""
    print("⚠️  Warning: Rollback functionality is limited.")
    print("🔄 For SQLite: Column removal is not supported")
    print("🔄 For PostgreSQL: You can manually drop columns if needed")
    print("💡 Recommendation: Restore from a database backup if needed")

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "rollback":
        rollback()
    else:
        success = main()
        sys.exit(0 if success else 1) 