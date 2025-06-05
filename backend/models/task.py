from extensions import db
import enum
from sqlalchemy import Enum as SqlEnum
from utils.datetime_utils import get_utc_now, ensure_utc


class TaskStatus(enum.Enum):
    """Legacy enum - kept for backward compatibility during migration."""
    pending = "pending"
    in_progress = "in_progress"
    completed = "completed"


class Task(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(120), nullable=False)
    description = db.Column(db.Text)
    due_date = db.Column(db.DateTime)
    # Legacy status field - kept for backward compatibility during migration
    status = db.Column(SqlEnum(TaskStatus), default=TaskStatus.pending, nullable=True)
    # New status_id field - will become the primary status field
    status_id = db.Column(db.Integer, db.ForeignKey("status.id"), nullable=True)
    project_id = db.Column(db.Integer, db.ForeignKey("project.id"), nullable=False)
    owner_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    created_at = db.Column(db.DateTime, default=get_utc_now)
    
    # New fields for advanced features
    priority_score = db.Column(db.Float, default=0.0)
    parent_task_id = db.Column(db.Integer, db.ForeignKey("task.id"), nullable=True)
    estimated_effort = db.Column(db.Integer, default=0)  # In hours
    percent_complete = db.Column(db.Integer, default=0)  # 0-100
    last_progress_update = db.Column(db.DateTime, default=get_utc_now)
    is_favorite = db.Column(db.Boolean, default=False, nullable=False)  # User favorite status
    
    # Relationships
    project = db.relationship("Project", back_populates="tasks")
    assignee = db.relationship("User", back_populates="tasks")
    attachments = db.relationship("TaskAttachment", back_populates="task")
    expenses = db.relationship("Expense", back_populates="task")
    status_rel = db.relationship("Status", back_populates="tasks")
    
    # Self-referencing relationship for task dependencies
    parent_task = db.relationship("Task", remote_side=[id], backref="subtasks")

    def is_overdue(self):
        """Check if task is overdue"""
        if not self.due_date:
            return False
        current_time = get_utc_now()
        due_date = ensure_utc(self.due_date)
        return current_time > due_date

    @property
    def current_status(self):
        """Get the current status - prioritize status_id over legacy status field."""
        if self.status_id and self.status_rel:
            return self.status_rel.name
        elif self.status:
            # Fallback to legacy status field
            return self.status.value if hasattr(self.status, 'value') else str(self.status)
        else:
            return 'pending'  # Default status

    def get_status_dict(self):
        """Get status information as dictionary."""
        if self.status_id and self.status_rel:
            return self.status_rel.to_dict()
        else:
            # Return legacy status as dictionary format
            status_name = self.current_status
            return {
                'id': None,
                'name': status_name,
                'description': f'Task is {status_name}',
                'display_order': {'pending': 1, 'in_progress': 2, 'completed': 3}.get(status_name, 1),
                'color': {'pending': '#6B7280', 'in_progress': '#3B82F6', 'completed': '#10B981'}.get(status_name, '#6B7280'),
                'created_at': None,
                'updated_at': None
            }

    @property
    def dependency_count(self):
        """Count the number of subtasks for this task."""
        return len(self.subtasks)

    @property
    def total_expenses(self):
        """Calculate total expenses for this task."""
        return sum(expense.amount for expense in self.expenses)

    def to_dict(self):
        """Convert task to dictionary for JSON serialization."""
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'due_date': self.due_date.isoformat() if self.due_date else None,
            'status': self.current_status,  # Use the current_status property
            'status_id': self.status_id,
            'status_info': self.get_status_dict(),  # Include full status object
            'project_id': self.project_id,
            'owner_id': self.owner_id,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'priority_score': self.priority_score,
            'parent_task_id': self.parent_task_id,
            'estimated_effort': self.estimated_effort,
            'percent_complete': self.percent_complete,
            'last_progress_update': self.last_progress_update.isoformat() if self.last_progress_update else None,
            'total_expenses': self.total_expenses,
            'dependency_count': self.dependency_count,
            'is_overdue': self.is_overdue(),
            'is_favorite': self.is_favorite
        }


class TaskAttachment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    task_id = db.Column(db.Integer, db.ForeignKey("task.id"), nullable=False)
    file_url = db.Column(db.String(200), nullable=False)
    uploaded_at = db.Column(db.DateTime, default=get_utc_now)

    # Relationships
    task = db.relationship("Task", back_populates="attachments")
