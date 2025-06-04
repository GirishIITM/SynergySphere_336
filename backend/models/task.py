from extensions import db
import enum
from sqlalchemy import Enum as SqlEnum
from utils.datetime_utils import get_utc_now, ensure_utc


class TaskStatus(enum.Enum):
    pending = "pending"
    in_progress = "in_progress"
    completed = "completed"


class Task(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(120), nullable=False)
    description = db.Column(db.Text)
    due_date = db.Column(db.DateTime)
    status = db.Column(SqlEnum(TaskStatus), default=TaskStatus.pending, nullable=False)
    project_id = db.Column(db.Integer, db.ForeignKey("project.id"), nullable=False)
    owner_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    created_at = db.Column(db.DateTime, default=get_utc_now)
    
    # New fields for advanced features
    priority_score = db.Column(db.Float, default=0.0)
    parent_task_id = db.Column(db.Integer, db.ForeignKey("task.id"), nullable=True)
    estimated_effort = db.Column(db.Integer, default=0)  # In hours
    percent_complete = db.Column(db.Integer, default=0)  # 0-100
    last_progress_update = db.Column(db.DateTime, default=get_utc_now)
    budget = db.Column(db.Float, nullable=True)  # Task budget in project currency
    
    # Relationships
    project = db.relationship("Project", back_populates="tasks")
    assignee = db.relationship("User", back_populates="tasks")
    attachments = db.relationship("TaskAttachment", back_populates="task")
    expenses = db.relationship("Expense", back_populates="task")
    
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
    def dependency_count(self):
        """Count the number of subtasks for this task."""
        return len(self.subtasks)

    def to_dict(self):
        """Convert task to dictionary for JSON serialization."""
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'due_date': self.due_date.isoformat() if self.due_date else None,
            'status': self.status.value,
            'project_id': self.project_id,
            'owner_id': self.owner_id,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'priority_score': self.priority_score,
            'parent_task_id': self.parent_task_id,
            'estimated_effort': self.estimated_effort,
            'percent_complete': self.percent_complete,
            'last_progress_update': self.last_progress_update.isoformat() if self.last_progress_update else None,
            'budget': self.budget,
            'dependency_count': self.dependency_count,
            'is_overdue': self.is_overdue()
        }


class TaskAttachment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    task_id = db.Column(db.Integer, db.ForeignKey("task.id"), nullable=False)
    file_url = db.Column(db.String(200), nullable=False)
    uploaded_at = db.Column(db.DateTime, default=get_utc_now)

    # Relationships
    task = db.relationship("Task", back_populates="attachments")
