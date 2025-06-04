from extensions import db
from utils.datetime_utils import get_utc_now


class Budget(db.Model):
    """Model for project budgets."""
    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey('project.id'), nullable=False)
    allocated_amount = db.Column(db.Float, nullable=False)
    spent_amount = db.Column(db.Float, default=0.0)
    currency = db.Column(db.String(3), default='USD')
    created_at = db.Column(db.DateTime, default=get_utc_now)
    updated_at = db.Column(db.DateTime, default=get_utc_now, onupdate=get_utc_now)
    
    # Relationships
    project = db.relationship('Project', back_populates='budgets')

    @property
    def remaining_amount(self):
        """Calculate remaining budget amount."""
        return self.allocated_amount - self.spent_amount

    @property
    def utilization_percentage(self):
        """Calculate budget utilization percentage."""
        if self.allocated_amount == 0:
            return 0.0
        return min((self.spent_amount / self.allocated_amount) * 100, 100.0)

    def to_dict(self):
        """Convert budget to dictionary for JSON serialization."""
        return {
            'id': self.id,
            'project_id': self.project_id,
            'allocated_amount': self.allocated_amount,
            'spent_amount': self.spent_amount,
            'remaining_amount': self.remaining_amount,
            'currency': self.currency,
            'utilization_percentage': self.utilization_percentage,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        } 