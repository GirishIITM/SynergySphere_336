from extensions import db

class TokenBlocklist(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    jti = db.Column(db.String(36), nullable=False, index=True)
    type = db.Column(db.String(16), nullable=False)  # 'access' or 'refresh'
    created_at = db.Column(db.DateTime, nullable=False)
