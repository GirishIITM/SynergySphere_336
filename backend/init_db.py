from app import create_app
from models.user import db, User, Project, Task, Message, bcrypt
from datetime import datetime, timedelta

def init_db():
    """Initialize the database with tables and sample data."""
    app = create_app()
    
    with app.app_context():
        # Create all database tables
        db.create_all()
        print("Created database tables.")

        if User.query.first() is None:
            print("Adding sample data...")
            
            # Create sample users
            admin = User(
                email='admin@sadmin.com',
                password_hash=bcrypt.generate_password_hash('admin123').decode('utf-8'),
                name='Admin User'
            )
            db.session.add(admin)
            db.session.commit()
            
if __name__ == '__main__':
    init_db() 