from extensions import db
from utils.datetime_utils import get_utc_now


class Status(db.Model):
    """Model for task statuses."""
    __tablename__ = 'status'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False, unique=True)
    description = db.Column(db.String(200), nullable=True)
    display_order = db.Column(db.Integer, nullable=False, default=0)
    color = db.Column(db.String(7), nullable=True)  # Hex color code
    created_at = db.Column(db.DateTime, default=get_utc_now)
    updated_at = db.Column(db.DateTime, default=get_utc_now, onupdate=get_utc_now)
    
    # Relationships
    tasks = db.relationship('Task', back_populates='status_rel')

    def to_dict(self):
        """Convert status to dictionary for JSON serialization."""
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'display_order': self.display_order,
            'color': self.color,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

    @staticmethod
    def initialize_default_statuses():
        """Initialize the default status records if they don't exist."""
        default_statuses = [
            {
                'name': 'pending',
                'description': 'Task has not been started',
                'display_order': 1,
                'color': '#6B7280'  # Gray
            },
            {
                'name': 'in_progress', 
                'description': 'Task is currently being worked on',
                'display_order': 2,
                'color': '#3B82F6'  # Blue
            },
            {
                'name': 'completed',
                'description': 'Task has been completed',
                'display_order': 3,
                'color': '#10B981'  # Green
            }
        ]
        
        for status_data in default_statuses:
            existing_status = Status.query.filter_by(name=status_data['name']).first()
            if not existing_status:
                status = Status(**status_data)
                db.session.add(status)
        
        db.session.commit()

    def __repr__(self):
        return f'<Status {self.name}>' 