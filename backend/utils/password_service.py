from models import User, PasswordResetToken
from extensions import db
from utils.email import send_email
from utils.email_templates import get_password_reset_email_template
from utils.validation import validate_email, validate_password, sanitize_email, sanitize_string
from config import get_config

class PasswordService:
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
            
            reset_token = PasswordResetToken.create_token(user.id)
            
            config = get_config()
            reset_link = f"{config.FRONTEND_URL}/reset-password?token={reset_token}"
            
            subject = "Password Reset Request"
            html_body = get_password_reset_email_template(user.username, reset_link)
            text_body = f"Click this link to reset your password: {reset_link}"
            
            email_sent = send_email(subject, [email], text_body, html_body)
            if not email_sent:
                return False, "Failed to send reset email. Please try again."
            
            return True, "If the email exists, a password reset link has been sent"
            
        except Exception as e:
            print(f"Send reset email error: {e}")
            return False, "An error occurred while processing your request"

    @staticmethod
    def verify_reset_token(token):
        """Verify if a reset token is valid and not expired"""
        try:
            token = sanitize_string(token)
            
            reset_token = PasswordResetToken.query.filter_by(
                token=token,
                is_used=False
            ).first()
            
            if not reset_token:
                return False, "Invalid or expired reset token"
            
            if reset_token.is_expired():
                return False, "Reset token has expired. Please request a new one."
            
            return True, "Token is valid"
            
        except Exception as e:
            print(f"Verify reset token error: {e}")
            return False, "An error occurred while verifying token"

    @staticmethod
    def reset_password_with_token(token, new_password):
        """Reset password using reset token"""
        try:
            token = sanitize_string(token)
            
            is_valid, msg = validate_password(new_password)
            if not is_valid:
                return False, msg
            
            reset_token = PasswordResetToken.query.filter_by(
                token=token,
                is_used=False
            ).first()
            
            if not reset_token:
                return False, "Invalid or expired reset token"
            
            if reset_token.is_expired():
                return False, "Reset token has expired. Please request a new one."
            
            user = User.query.get(reset_token.user_id)
            if not user:
                return False, "User not found"
            
            user.set_password(new_password)
            reset_token.is_used = True
            
            db.session.commit()
            
            return True, "Password reset successfully"
            
        except Exception as e:
            print(f"Reset password error: {e}")
            db.session.rollback()
            return False, "An error occurred while resetting password"
