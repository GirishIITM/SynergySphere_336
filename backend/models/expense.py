from extensions import db
from utils.datetime_utils import get_utc_now


class Expense(db.Model):
    """Model for project and task expenses."""
    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey('project.id'), nullable=False)
    task_id = db.Column(db.Integer, db.ForeignKey('task.id'), nullable=True)
    amount = db.Column(db.Float, nullable=False)
    description = db.Column(db.String(200), nullable=True)
    category = db.Column(db.String(50), nullable=True)
    incurred_at = db.Column(db.DateTime, default=get_utc_now)
    created_by = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    
    # Relationships
    project = db.relationship('Project', back_populates='expenses')
    task = db.relationship('Task', back_populates='expenses')
    user = db.relationship('User', backref='expenses')

    def to_dict(self):
        """Convert expense to dictionary for JSON serialization."""
        return {
            'id': self.id,
            'project_id': self.project_id,
            'task_id': self.task_id,
            'amount': self.amount,
            'description': self.description,
            'category': self.category,
            'incurred_at': self.incurred_at.isoformat() if self.incurred_at else None,
            'created_by': self.created_by,
            'task_title': self.task.title if self.task else None,
            'created_by_name': self.user.full_name if self.user else 'Unknown User'
        } 