from extensions import db
from utils.datetime_utils import get_utc_now

class Message(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    content = db.Column(db.Text, nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    project_id = db.Column(db.Integer, db.ForeignKey('project.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=get_utc_now)
    
    # Relationships
    user = db.relationship('User', back_populates='messages')
    project = db.relationship('Project', back_populates='messages')
