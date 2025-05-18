from app import create_app
from models.user import db, User, Project, Task, Message, bcrypt
from datetime import datetime, timedelta

def init_db():
    app = create_app()
    with app.app_context():
        db.create_all()
        print("Database tables created successfully.")

        # add admin user
        admin = User(
            email='admin@synergysphere.com',
            password_hash=bcrypt.generate_password_hash('admin123').decode('utf-8'),
            name='Admin User'
        )
        db.session.add(admin)
        db.session.commit()
        print("Admin user added successfully.")

if __name__ == '__main__':
    init_db()



