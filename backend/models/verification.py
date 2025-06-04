from datetime import datetime, timezone, timedelta
import random
from extensions import db
import secrets
import string
from utils.datetime_utils import get_utc_now, is_expired

class OTPVerification(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), nullable=False)
    otp = db.Column(db.String(6), nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False)
    is_used = db.Column(db.Boolean, default=False)
    attempts = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=get_utc_now)
    
    @staticmethod
    def generate_otp():
        return ''.join(random.choices(string.digits, k=6))
    
    @classmethod
    def create_otp(cls, email):
        # Clean up old OTPs for this email
        cls.query.filter_by(email=email).delete()
        
        otp = cls.generate_otp()
        current_time = get_utc_now()
        expires_at = current_time + timedelta(minutes=10)
        
        verification = cls(
            email=email,
            otp=otp,
            expires_at=expires_at,
            created_at=current_time
        )
        db.session.add(verification)
        db.session.commit()
        return otp
    
    def is_expired(self):
        """Check if OTP is expired"""
        return is_expired(self.expires_at)

class PasswordResetToken(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    token = db.Column(db.String(100), nullable=False, unique=True)
    expires_at = db.Column(db.DateTime, nullable=False)
    is_used = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=get_utc_now)
    
    user = db.relationship('User', backref='reset_tokens')
    
    @staticmethod
    def generate_token():
        return secrets.token_urlsafe(50)
    
    @classmethod
    def create_token(cls, user_id):
        # Clean up old tokens for this user
        cls.query.filter_by(user_id=user_id).delete()
        
        token = cls.generate_token()
        current_time = get_utc_now()
        expires_at = current_time + timedelta(hours=1)
        
        reset_token = cls(
            user_id=user_id,
            token=token,
            expires_at=expires_at,
            created_at=current_time
        )
        db.session.add(reset_token)
        db.session.commit()
        return token
    
    def is_expired(self):
        """Check if token is expired"""
        return is_expired(self.expires_at)
