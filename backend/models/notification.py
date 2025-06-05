from extensions import db
from utils.datetime_utils import get_utc_now

class Notification(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    message = db.Column(db.String(200))
    is_read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=get_utc_now)
    
    # Enhanced fields for context and categorization
    task_id = db.Column(db.Integer, db.ForeignKey('task.id'), nullable=True)
    message_id = db.Column(db.Integer, db.ForeignKey('message.id'), nullable=True)
    notification_type = db.Column(db.String(50), default='general')  # 'tagged', 'assigned', 'general'
    
    # Relationships
    user = db.relationship('User', back_populates='notifications')
    task = db.relationship('Task', backref='notifications')
    notification_message = db.relationship('Message', backref='notifications')

    def to_dict(self):
        """Convert notification to dictionary for JSON serialization."""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'message': self.message,
            'is_read': self.is_read,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'task_id': self.task_id,
            'message_id': self.message_id,
            'notification_type': self.notification_type,
            'task_title': self.task.title if self.task else None,
            'project_id': self.task.project_id if self.task else None,
            'project_name': self.task.project.name if self.task and self.task.project else None
        }
