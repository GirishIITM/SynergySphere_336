"""
Script to fix missing database tables by ensuring all models are created.
This specifically addresses the missing token_blocklist table error.
"""

from app import create_app
from extensions import db
from models import *  # Import all models to ensure they're registered

def fix_database():
    """Fix database by creating missing tables."""
    app = create_app()
    with app.app_context():
        # Check current tables
        inspector = db.inspect(db.engine)
        existing_tables = inspector.get_table_names()
        
        print("Current tables in database:")
        for table in existing_tables:
            print(f"  - {table}")
        
        # Check if token_blocklist table exists
        if 'token_blocklist' not in existing_tables:
            print("\ntoken_blocklist table is missing!")
            print("Creating all missing tables...")
            
            # Create all tables
            db.create_all()
            
            # Verify token_blocklist was created
            inspector = db.inspect(db.engine)
            updated_tables = inspector.get_table_names()
            
            if 'token_blocklist' in updated_tables:
                print("✅ token_blocklist table created successfully!")
                
                # Show the structure of the new table
                columns = inspector.get_columns('token_blocklist')
                print("\ntoken_blocklist table structure:")
                for col in columns:
                    print(f"  - {col['name']}: {col['type']}")
            else:
                print("❌ Failed to create token_blocklist table")
        else:
            print("✅ token_blocklist table already exists!")
        
        print("\nFinal tables in database:")
        inspector = db.inspect(db.engine)
        final_tables = inspector.get_table_names()
        for table in final_tables:
            print(f"  - {table}")

if __name__ == '__main__':
    fix_database() 