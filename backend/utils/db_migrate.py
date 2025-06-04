import sqlite3
import os
from extensions import db

def migrate_database():
    """Handle database setup without schema modifications"""
    # Check if we're using PostgreSQL
    database_url = os.getenv('DATABASE_URL', '')
    if 'postgresql' in database_url:
        print("PostgreSQL detected - using SQLAlchemy schema creation")
        try:
            from models import User
            db.create_all()
            print("PostgreSQL schema created successfully")
            return
        except Exception as e:
            print(f"PostgreSQL setup error: {e}")
            return
    
    # For SQLite, just ensure tables exist
    try:
        db.create_all()
        print("SQLite schema created successfully")
    except Exception as e:
        print(f"SQLite setup error: {e}")

def migrate_postgresql():
    """Handle PostgreSQL setup using SQLAlchemy only"""
    database_url = os.getenv('DATABASE_URL', '')
    if 'postgresql' not in database_url:
        return
    
    try:
        # Use SQLAlchemy to create all tables
        db.create_all()
        print("PostgreSQL schema creation completed via SQLAlchemy")
    except Exception as e:
        print(f"PostgreSQL schema creation error: {e}")

def check_and_migrate():
    """Check database and ensure schema exists"""
    try:
        # Import models to register them
        from models import User
        
        # Check if using PostgreSQL
        database_url = os.getenv('DATABASE_URL', '')
        if 'postgresql' in database_url:
            print("Setting up PostgreSQL schema...")
            db.create_all()
            
            # Update existing schema directly
            update_postgresql_schema()
            return False
        
        # For SQLite, ensure schema exists and update if needed
        print("Setting up SQLite schema...")
        db.create_all()
        
        # For SQLite, we need to handle missing columns differently
        update_sqlite_schema()
        return False
        
    except Exception as e:
        print(f"Schema setup failed: {e}")
        try:
            db.create_all()
        except Exception as create_error:
            print(f"Failed to create schema: {create_error}")
        return True

def update_postgresql_schema():
    """Update PostgreSQL schema for missing columns"""
    try:
        from sqlalchemy import text
        
        # Add missing columns to user table if they don't exist
        try:
            db.engine.execute(text("""
                ALTER TABLE "user" 
                ADD COLUMN IF NOT EXISTS full_name VARCHAR(100)
            """))
            print("Added full_name column to user table")
        except Exception:
            pass  # Column might already exist
        
        try:
            db.engine.execute(text("""
                ALTER TABLE "user" 
                ADD COLUMN IF NOT EXISTS about TEXT
            """))
            print("Added about column to user table")
        except Exception:
            pass
        
        try:
            db.engine.execute(text("""
                ALTER TABLE "user" 
                ADD COLUMN IF NOT EXISTS google_id VARCHAR(100)
            """))
            print("Added google_id column to user table")
        except Exception:
            pass
        
        try:
            db.engine.execute(text("""
                ALTER TABLE "user" 
                ADD COLUMN IF NOT EXISTS deadline_notification_hours INTEGER DEFAULT 1
            """))
            print("Added deadline_notification_hours column to user table")
        except Exception:
            pass
        
        # Add updated_at column to project table if it doesn't exist
        try:
            db.engine.execute(text("""
                ALTER TABLE project 
                ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            """))
            
            # Set updated_at = created_at for existing records
            db.engine.execute(text("""
                UPDATE project 
                SET updated_at = created_at 
                WHERE updated_at IS NULL
            """))
            print("Added updated_at column to project table")
        except Exception:
            pass
            
        db.session.commit()
        print("PostgreSQL schema updates completed")
        
    except Exception as e:
        print(f"PostgreSQL schema update error: {e}")
        db.session.rollback()

def update_sqlite_schema():
    """Update SQLite schema for missing columns"""
    try:
        import sqlite3
        sqlite_path = 'instance/app.db'
        
        if not os.path.exists(sqlite_path):
            return
        
        conn = sqlite3.connect(sqlite_path)
        cursor = conn.cursor()
        
        # Check project table for updated_at column
        cursor.execute("PRAGMA table_info(project)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'updated_at' not in columns:
            print("Adding updated_at column to SQLite project table...")
            cursor.execute("""
                ALTER TABLE project 
                ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            """)
            
            # Set updated_at = created_at for existing records
            cursor.execute("""
                UPDATE project 
                SET updated_at = created_at 
                WHERE updated_at IS NULL
            """)
            conn.commit()
            print("Added updated_at column to project table")
        
        # Check user table for missing columns
            cursor.execute("ALTER TABLE user ADD COLUMN about TEXT")
            _columns = [column[1] for column in cursor.fetchall()]
        if 'google_id' not in user_columns:
            cursor.execute("ALTER TABLE user ADD COLUMN google_id VARCHAR(100)")
            cursor.execute("ALTER TABLE user ADD COLUMN full_name VARCHAR(100)")
        if 'deadline_notification_hours' not in user_columns:ault values for existing users
            cursor.execute("ALTER TABLE user ADD COLUMN deadline_notification_hours INTEGER DEFAULT 1")xecute("UPDATE user SET full_name = username WHERE full_name IS NULL")
        
        conn.commit()user_columns:
        conn.close()COLUMN about TEXT")
                    



        print(f"SQLite schema update error: {e}")    except Exception as e:        if 'google_id' not in user_columns:
            cursor.execute("ALTER TABLE user ADD COLUMN google_id VARCHAR(100)")
        
        conn.commit()
        conn.close()
        
    except Exception as e:
        print(f"SQLite schema update error: {e}")
