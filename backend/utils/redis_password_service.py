import secrets
from datetime import datetime, timedelta
from models import User
from extensions import db
from utils.email import send_email
from utils.email_templates import get_password_reset_email_template
from utils.validation import validate_email, validate_password, sanitize_email, sanitize_string
from utils.redis_utils import RedisCache
from config import get_config

class RedisPasswordService:
    """Redis-based password reset service"""
    
    RESET_TOKEN_PREFIX = "password_reset:"
    TOKEN_EXPIRATION = 3600  # 1 hour
    
    @staticmethod
    def generate_token():
        """Generate a secure password reset token"""
        return secrets.token_urlsafe(50)
    
    @staticmethod
    def _get_token_key(token):
        """Generate Redis key for password reset token"""
        return f"{RedisPasswordService.RESET_TOKEN_PREFIX}{token}"
    
    @staticmethod
    def send_reset_email(email):
        """Send password reset email"""
        try:
            email = sanitize_email(email)
            
            if not validate_email(email):
                return False, "Invalid email format"
            
            user = User.query.filter_by(email=email).first()
            if not user:
                return True, "If the email exists, a password reset link has been sent"
            
            reset_token = RedisPasswordService.generate_token()
            token_key = RedisPasswordService._get_token_key(reset_token)
            
            token_data = {
                "user_id": user.id,
                "email": email,
                "created_at": datetime.utcnow().isoformat(),
                "used": False
            }
            
            # Store token with expiration
            success = RedisCache.set(token_key, token_data, RedisPasswordService.TOKEN_EXPIRATION)
            if not success:
                return False, "Failed to generate reset token. Please try again."
            
            # Send email with reset link using configured frontend URL
            config = get_config()
            reset_link = f"{config.FRONTEND_URL}/reset-password?token={reset_token}"
            subject = "Password Reset Request"
            html_body = get_password_reset_email_template(user.username, reset_link)
            text_body = f"Click this link to reset your password: {reset_link}"
            
            email_sent = send_email(subject, [email], text_body, html_body)
            if not email_sent:
                # Clean up Redis if email fails
                RedisCache.delete(token_key)
                return False, "Failed to send reset email. Please try again."
            
            return True, "If the email exists, a password reset link has been sent"
            
        except Exception as e:
            print(f"Send reset email error: {e}")
            return False, "An error occurred while processing your request"
    
    @staticmethod
    def reset_password_with_token(token, new_password):
        """Reset password using reset token"""
        try:
            token = sanitize_string(token)
            
            is_valid, msg = validate_password(new_password)
            if not is_valid:
                return False, msg
            
            token_key = RedisPasswordService._get_token_key(token)
            token_data = RedisCache.get(token_key)
            
            if not token_data:
                return False, "Invalid or expired reset token"
            
            if token_data.get("used", False):
                return False, "Reset token has already been used"
            
            user = User.query.get(token_data["user_id"])
            if not user:
                return False, "User not found"
            
            user.set_password(new_password)
            
            token_data["used"] = True
            token_data["used_at"] = datetime.utcnow().isoformat()
            RedisCache.set(token_key, token_data, 300)  # Keep for 5 minutes as used
            
            db.session.commit()
            
            return True, "Password reset successfully"
            
        except Exception as e:
            print(f"Reset password error: {e}")
            db.session.rollback()
            return False, "An error occurred while resetting password"
    
    @staticmethod
    def verify_reset_token(token):
        """Verify if a reset token is valid and not expired"""
        try:
            token = sanitize_string(token)
            token_key = RedisPasswordService._get_token_key(token)
            token_data = RedisCache.get(token_key)
            
            if not token_data:
                return False, "Invalid or expired reset token"
            
            if token_data.get("used", False):
                return False, "Reset token has already been used"
            
            return True, "Token is valid"
            
        except Exception as e:
            print(f"Verify reset token error: {e}")
            return False, "An error occurred while verifying token"
