from models import db, bcrypt   
from datetime import datetime


# Association table for the many-to-many relationship between User and Project
project_members = db.Table(
    'project_members',
    db.Column('project_id', db.Integer, db.ForeignKey('project.id'), primary_key=True),
    db.Column('user_id', db.Integer, db.ForeignKey('user.id'), primary_key=True)
)

class User(db.Model):
    """
    User model representing platform users.
    
    Attributes:
        id: Unique identifier for the user
        email: User's email address (unique)
        password_hash: Hashed password for security
        name: User's full name
        created_projects: Projects created by this user
        projects: Projects user is a member of
        assigned_tasks: Tasks assigned to this user
        messages: Messages sent by this user
    """
    __tablename__ = 'user'

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    name = db.Column(db.String(255), nullable=False)

    # Relationships
    created_projects = db.relationship('Project', backref='creator', lazy=True, foreign_keys='Project.created_by')
    projects = db.relationship('Project', secondary=project_members, backref=db.backref('members', lazy=True))
    assigned_tasks = db.relationship('Task', backref='assignee', lazy=True)
    messages = db.relationship('Message', backref='sender', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'email': self.email,
            'name': self.name
        }

class Project(db.Model):
    """
    Project model representing collaboration projects.
    
    Attributes:
        id: Unique identifier for the project
        name: Project name
        created_by: ID of the user who created the project
        tasks: Tasks associated with this project
        messages: Messages in the project
    """
    __tablename__ = 'project'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    created_by = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

    # Relationships
    tasks = db.relationship('Task', backref='project', lazy=True)
    messages = db.relationship('Message', backref='project', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'created_by': self.created_by,
            'tasks': [task.to_dict() for task in self.tasks],
            'member_count': len(self.members)
        }

class Task(db.Model):
    """
    Task model representing project tasks.
    
    Attributes:
        id: Unique identifier for the task
        project_id: ID of the project this task belongs to
        title: Task title
        description: Detailed task description
        assignee_id: ID of the user assigned to this task
        due_date: Task due date
        status: Current status of the task
    """
    __tablename__ = 'task'

    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey('project.id'), nullable=False)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text)
    assignee_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    due_date = db.Column(db.Date)
    status = db.Column(db.String(50), nullable=False)

    def to_dict(self):
        return {
            'id': self.id,
            'project_id': self.project_id,
            'title': self.title,
            'description': self.description,
            'assignee_id': self.assignee_id,
            'due_date': self.due_date.isoformat() if self.due_date else None,
            'status': self.status
        }

class Message(db.Model):
    """
    Message model representing project communications.
    
    Attributes:
        id: Unique identifier for the message
        project_id: ID of the project this message belongs to
        user_id: ID of the user who sent the message
        content: Message content
        timestamp: Time when the message was sent
    """
    __tablename__ = 'message'

    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey('project.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    content = db.Column(db.Text, nullable=False)
    timestamp = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'project_id': self.project_id,
            'user_id': self.user_id,
            'content': self.content,
            'timestamp': self.timestamp.isoformat()
        } 