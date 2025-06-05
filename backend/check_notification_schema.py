#!/usr/bin/env python3
"""
Check and fix notification table schema
"""

from app import app
from extensions import db
from sqlalchemy import text
import psycopg2

def check_and_fix_notification_schema():
    """Check notification table schema and add missing columns"""
    
    with app.app_context():
        print("🔍 Checking notification table schema...")
        
        # Check current columns
        inspector = db.inspect(db.engine)
        if inspector.has_table('notification'):
            notification_columns = [col['name'] for col in inspector.get_columns('notification')]
            print(f"📋 Current notification columns: {notification_columns}")
            
            # Required columns
            required_columns = [
                ('task_id', 'INTEGER'),
                ('message_id', 'INTEGER'),
                ('notification_type', "VARCHAR(50) DEFAULT 'general'")
            ]
            
            # Check and add missing columns
            with db.engine.begin() as conn:
                for column_name, column_def in required_columns:
                    if column_name not in notification_columns:
                        try:
                            sql = f'ALTER TABLE notification ADD COLUMN {column_name} {column_def}'
                            print(f"🔧 Adding column: {sql}")
                            conn.execute(text(sql))
                            print(f"  ✅ Added {column_name} to notification table")
                        except Exception as e:
                            print(f"  ❌ Error adding {column_name}: {str(e)}")
                    else:
                        print(f"  ✅ Column {column_name} already exists")
                
                # Set default notification_type for existing notifications
                try:
                    conn.execute(text("""
                        UPDATE notification 
                        SET notification_type = 'general' 
                        WHERE notification_type IS NULL
                    """))
                    print("  ✅ Set default notification_type for existing records")
                except Exception as e:
                    print(f"  ❌ Error setting default notification_type: {str(e)}")
            
            # Verify the changes
            print("\n🔍 Verifying changes...")
            updated_columns = [col['name'] for col in inspector.get_columns('notification')]
            print(f"📋 Updated notification columns: {updated_columns}")
            
        else:
            print("❌ Notification table does not exist")

if __name__ == "__main__":
    check_and_fix_notification_schema() 