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
    project_id = db.Column(db.Integer, db.ForeignKey('project.id'), nullable=True)
    message_id = db.Column(db.Integer, db.ForeignKey('message.id'), nullable=True)
    notification_type = db.Column(db.String(50), default='general')  # 'tagged', 'assigned', 'general'
    
    # Relationships
    user = db.relationship('User', back_populates='notifications')
    task = db.relationship('Task', backref='notifications')
    project = db.relationship('Project', backref='notifications')
    notification_message = db.relationship('Message', backref='notifications')

    def to_dict(self):
        """Convert notification to dictionary for JSON serialization."""
        try:
            # Safely get task-related information
            task_title = None
            project_id = self.project_id
            project_name = None
            
            if self.task:
                task_title = self.task.title
                # If project_id not directly set, get from task
                if not project_id:
                    project_id = self.task.project_id
                # Safely access the project relationship
                if hasattr(self.task, 'project') and self.task.project:
                    project_name = self.task.project.name
            
            # If we have project_id but no project_name yet, try to get it directly
            if project_id and not project_name and self.project:
                project_name = self.project.name
            
            return {
                'id': self.id,
                'user_id': self.user_id,
                'message': self.message,
                'is_read': self.is_read,
                'created_at': self.created_at.isoformat() if self.created_at else None,
                'task_id': self.task_id,
                'project_id': project_id,
                'message_id': self.message_id,
                'notification_type': self.notification_type,
                'task_title': task_title,
                'project_name': project_name
            }
        except Exception as e:
            # Fallback to basic notification data if relationship access fails
            return {
                'id': self.id,
                'user_id': self.user_id,
                'message': self.message,
                'is_read': self.is_read,
                'created_at': self.created_at.isoformat() if self.created_at else None,
                'task_id': self.task_id,
                'project_id': self.project_id,
                'message_id': self.message_id,
                'notification_type': self.notification_type,
                'task_title': None,
                'project_name': None,
                'error': f'Relationship access error: {str(e)}'
            }
