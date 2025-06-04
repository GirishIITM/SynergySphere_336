import sqlite3
import os
from sqlalchemy import create_engine, text, inspect
from sqlalchemy.exc import SQLAlchemyError
import logging

def migrate_schema_before_data():
    """Ensure PostgreSQL schema exists without altering tables"""
    postgresql_url = os.getenv('DATABASE_URL')
    
    if not postgresql_url or 'postgresql' not in postgresql_url:
        return True
    
    try:
        from extensions import db
        # Use SQLAlchemy to create tables - no ALTER statements
        db.create_all()
        print("PostgreSQL schema ensured via SQLAlchemy")
        return True
        
    except Exception as e:
        print(f"Schema creation failed: {e}")
        return False

def migrate_sqlite_to_postgresql():
    """Migrate data from SQLite to PostgreSQL - non-blocking, no schema changes"""
    # First ensure schema exists
    migrate_schema_before_data()
    
    sqlite_path = 'instance/app.db'
    postgresql_url = os.getenv('DATABASE_URL')
    
    if not os.path.exists(sqlite_path):
        print("No SQLite database found. Starting fresh with PostgreSQL.")
        return True
    
    if not postgresql_url or 'postgresql' not in postgresql_url:
        print("PostgreSQL connection string not found. Skipping migration.")
        return True  # Don't block app startup
    
    try:
        # Connect to SQLite
        sqlite_conn = sqlite3.connect(sqlite_path)
        sqlite_conn.row_factory = sqlite3.Row
        
        # Connect to PostgreSQL
        postgresql_engine = create_engine(postgresql_url)
        
        print("Starting data migration from SQLite to PostgreSQL...")
        
        # Get all table names from SQLite
        cursor = sqlite_conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
        tables = [row[0] for row in cursor.fetchall()]
        
        with postgresql_engine.connect() as postgresql_conn:
            # Check which tables exist in PostgreSQL
            inspector = inspect(postgresql_engine)
            postgresql_tables = inspector.get_table_names()
            
            for table in tables:
                if table not in postgresql_tables:
                    print(f"  Skipping table {table} - not found in PostgreSQL schema")
                    continue
                    
                print(f"Migrating table: {table}")
                
                # Check if table already has data
                existing_count = postgresql_conn.execute(text(f"SELECT COUNT(*) FROM {table}")).scalar()
                if existing_count > 0:
                    print(f"  Table {table} already has {existing_count} rows - skipping")
                    continue
                
                # Get data from SQLite
                cursor.execute(f"SELECT * FROM {table}")
                rows = cursor.fetchall()
                
                if not rows:
                    print(f"  No data in table {table}")
                    continue
                
                # Get column names from PostgreSQL to ensure compatibility
                postgresql_columns = [col['name'] for col in inspector.get_columns(table)]
                sqlite_columns = [description[0] for description in cursor.description]
                
                # Only use columns that exist in both databases
                common_columns = [col for col in sqlite_columns if col in postgresql_columns]
                
                if not common_columns:
                    print(f"  No compatible columns found for table {table}")
                    continue
                
                columns_str = ', '.join(common_columns)
                placeholders = ', '.join([f'${i+1}' for i in range(len(common_columns))])
                
                # Insert data into PostgreSQL using ON CONFLICT DO NOTHING for upsert
                insert_sql = f"INSERT INTO {table} ({columns_str}) VALUES ({placeholders}) ON CONFLICT DO NOTHING"
                
                # Convert rows to tuples with only common columns
                migrated_count = 0
                for row in rows:
                    try:
                        row_data = tuple(row[col] for col in common_columns)
                        postgresql_conn.execute(text(insert_sql), row_data)
                        migrated_count += 1
                    except SQLAlchemyError as e:
                        # Silently skip problematic rows
                        continue
                
                postgresql_conn.commit()
                print(f"  Migrated {migrated_count} rows to {table}")
        
        sqlite_conn.close()
        print("Migration completed!")
        
        # Optionally backup the SQLite file
        backup_path = f"{sqlite_path}.backup"
        if not os.path.exists(backup_path):
            try:
                os.rename(sqlite_path, backup_path)
                print(f"SQLite database backed up to {backup_path}")
            except:
                print("Could not backup SQLite file - continuing anyway")
        
        return True
        
    except Exception as e:
        print(f"Migration failed but continuing: {e}")
        return True  # Don't block app startup

def check_postgresql_connection():
    """Check if PostgreSQL connection is working"""
    postgresql_url = os.getenv('DATABASE_URL')
    
    if not postgresql_url or 'postgresql' not in postgresql_url:
        return False
    
    try:
        engine = create_engine(postgresql_url)
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        print("PostgreSQL connection successful!")
        return True
    except Exception as e:
        print(f"PostgreSQL connection failed: {e}")
        return False

def ensure_postgresql_tables_exist(app):
    """Ensure PostgreSQL tables exist without blocking app startup"""
    try:
        from extensions import db
        db.create_all()
        print("Database tables ensured")
        return True
    except Exception as e:
        print(f"Warning: Could not create tables: {e}")
        return False

def update_existing_schema():
    """Add missing columns to existing tables"""
    postgresql_url = os.getenv('DATABASE_URL')
    
    if not postgresql_url:
        return True
    
    try:
        engine = create_engine(postgresql_url)
        inspector = inspect(engine)
        
        with engine.connect() as conn:
            # Check if project table exists and has updated_at column
            if 'project' in inspector.get_table_names():
                columns = [col['name'] for col in inspector.get_columns('project')]
                
                if 'updated_at' not in columns:
                    print("Adding updated_at column to project table...")
                    conn.execute(text("""
                        ALTER TABLE project 
                        ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE 
                        DEFAULT CURRENT_TIMESTAMP
                    """))
                    conn.commit()
                    print("Added updated_at column to project table")
                
                # Set updated_at = created_at for existing records where updated_at is NULL
                conn.execute(text("""
                    UPDATE project 
                    SET updated_at = created_at 
                    WHERE updated_at IS NULL
                """))
                conn.commit()
            
            # Check user table for missing columns
            if 'user' in inspector.get_table_names():
                columns = [col['name'] for col in inspector.get_columns('user')]
                
                missing_columns = []
                if 'full_name' not in columns:
                    missing_columns.append("ADD COLUMN full_name VARCHAR(100)")
                if 'about' not in columns:
                    missing_columns.append("ADD COLUMN about TEXT")
                if 'google_id' not in columns:
                    missing_columns.append("ADD COLUMN google_id VARCHAR(100) UNIQUE")
                
                if missing_columns:
                    print(f"Adding missing columns to user table: {missing_columns}")
                    for column_def in missing_columns:
                        conn.execute(text(f"ALTER TABLE \"user\" {column_def}"))
                    conn.commit()
                    print("Added missing columns to user table")
        
        return True
        
    except Exception as e:
        print(f"Schema update error (non-blocking): {e}")
        return True
