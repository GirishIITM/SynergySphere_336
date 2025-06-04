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
            
            # Update existing schema
            from utils.postgresql_migrator import update_existing_schema
            update_existing_schema()
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
        cursor.execute("PRAGMA table_info(user)")
        user_columns = [column[1] for column in cursor.fetchall()]
        
        if 'full_name' not in user_columns:
            cursor.execute("ALTER TABLE user ADD COLUMN full_name VARCHAR(100)")
            # Set default values for existing users
            cursor.execute("UPDATE user SET full_name = username WHERE full_name IS NULL")
        
        if 'about' not in user_columns:
            cursor.execute("ALTER TABLE user ADD COLUMN about TEXT")
            
        if 'google_id' not in user_columns:
            cursor.execute("ALTER TABLE user ADD COLUMN google_id VARCHAR(100)")
        
        conn.commit()
        conn.close()
        
    except Exception as e:
        print(f"SQLite schema update error: {e}")
