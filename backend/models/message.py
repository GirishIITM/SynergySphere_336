from extensions import db
from utils.datetime_utils import get_utc_now

class Message(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    content = db.Column(db.Text, nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    project_id = db.Column(db.Integer, db.ForeignKey('project.id'), nullable=False)
    task_id = db.Column(db.Integer, db.ForeignKey('task.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=get_utc_now)
    
    # Relationships
    user = db.relationship('User', back_populates='messages')
    project = db.relationship('Project', back_populates='messages')
    task = db.relationship('Task', backref='messages')

    def to_dict(self):
        """Convert message to dictionary for JSON serialization."""
        return {
            'id': self.id,
            'content': self.content,
            'user_id': self.user_id,
            'project_id': self.project_id,
            'task_id': self.task_id,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'user_name': self.user.full_name if self.user else 'Unknown User'
        }
