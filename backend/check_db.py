"""
Simple script to check database schema
"""

from app import create_app
from extensions import db

def check_database():
    app = create_app()
    with app.app_context():
        inspector = db.inspect(db.engine)
        
        print("Task table columns:")
        task_columns = [col['name'] for col in inspector.get_columns('task')]
        for col in task_columns:
            print(f"  - {col}")
        
        print("\nMessage table columns:")
        message_columns = [col['name'] for col in inspector.get_columns('message')]
        for col in message_columns:
            print(f"  - {col}")
        
        # Check if all required columns exist
        required_columns = ['priority_score', 'parent_task_id', 'estimated_effort', 'percent_complete', 'last_progress_update']
        missing_columns = [col for col in required_columns if col not in task_columns]
        
        if missing_columns:
            print(f"\nMissing columns in task table: {missing_columns}")
        else:
            print("\nAll required columns exist in task table!")

if __name__ == "__main__":
    check_database() 