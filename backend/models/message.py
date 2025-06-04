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
            'user': {
                'id': self.user.id,
                'username': self.user.username,
                'full_name': getattr(self.user, 'full_name', self.user.username),
                'profile_picture': getattr(self.user, 'profile_picture', None)
            } if self.user else {
                'id': self.user_id,
                'username': 'Unknown User',
                'full_name': 'Unknown User',
                'profile_picture': None
            },
            'formatted_time': self._format_time(),
            'is_task_comment': self.task_id is not None
        }
    
    def _format_time(self):
        """Format created_at time for display."""
        if not self.created_at:
            return None
        
        from datetime import datetime, timedelta
        from utils.datetime_utils import ensure_utc
        
        now = get_utc_now()
        created = ensure_utc(self.created_at)
        diff = now - created
        
        if diff.days > 0:
            return f"{diff.days} day{'s' if diff.days > 1 else ''} ago"
        elif diff.seconds > 3600:
            hours = diff.seconds // 3600
            return f"{hours} hour{'s' if hours > 1 else ''} ago"
        elif diff.seconds > 60:
            minutes = diff.seconds // 60
            return f"{minutes} minute{'s' if minutes > 1 else ''} ago"
        else:
            return "Just now"
