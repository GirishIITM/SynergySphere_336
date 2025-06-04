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
    # Relationships
    project = db.relationship("Project", back_populates="tasks")
    assignee = db.relationship("User", back_populates="tasks")
    attachments = db.relationship("TaskAttachment", back_populates="task")

    def is_overdue(self):
        """Check if task is overdue"""
        if not self.due_date:
            return False
        current_time = get_utc_now()
        due_date = ensure_utc(self.due_date)
        return current_time > due_date


class TaskAttachment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    task_id = db.Column(db.Integer, db.ForeignKey("task.id"), nullable=False)
    file_url = db.Column(db.String(200), nullable=False)
    uploaded_at = db.Column(db.DateTime, default=get_utc_now)

    # Relationships
    task = db.relationship("Task", back_populates="attachments")
