import random
import string
from datetime import datetime 
from utils.redis_utils import RedisCache
from utils.email import send_email
from utils.email_templates import get_otp_email_template, get_welcome_email_template
from utils.validation import sanitize_email, sanitize_string, validate_full_name
from models import User
from extensions import db

class RedisOTPService:
    """Redis-based OTP service for email verification and password reset"""
    
    OTP_PREFIX = "otp:"
    OTP_ATTEMPTS_PREFIX = "otp_attempts:"
    OTP_EXPIRATION = 600  # 10 minutes
    MAX_ATTEMPTS = 3
    
    @staticmethod
    def generate_otp():
        """Generate a 6-digit OTP"""
        return ''.join(random.choices(string.digits, k=6))
    
    @staticmethod
    def _get_otp_key(email, purpose="registration"):
        """Generate Redis key for OTP"""
        return f"{RedisOTPService.OTP_PREFIX}{purpose}:{email}"
    
    @staticmethod
    def _get_attempts_key(email, purpose="registration"):
        """Generate Redis key for OTP attempts"""
        return f"{RedisOTPService.OTP_ATTEMPTS_PREFIX}{purpose}:{email}"
    
    @staticmethod
    def send_registration_otp(full_name, email):
        """Send OTP for registration"""
        try:
            # Validate full_name
            is_valid, msg = validate_full_name(full_name)
            if not is_valid:
                return False, msg
            
            email = sanitize_email(email)
            otp = RedisOTPService.generate_otp()
            
            # Store OTP in Redis
            otp_key = RedisOTPService._get_otp_key(email, "registration")
            attempts_key = RedisOTPService._get_attempts_key(email, "registration")
            
            otp_data = {
                "otp": otp,
                "email": email,
                "full_name": full_name,
                "created_at": datetime.utcnow().isoformat(),
                "purpose": "registration"
            }
            
            # Set OTP with expiration
            RedisCache.set(otp_key, otp_data, RedisOTPService.OTP_EXPIRATION)
            # Reset attempts counter
            RedisCache.set(attempts_key, 0, RedisOTPService.OTP_EXPIRATION)
            
            # Send email
            subject = "Verify Your Email - OTP"
            html_body = get_otp_email_template(full_name, otp)
            text_body = f"Your OTP for email verification is: {otp}. Valid for 10 minutes."
            
            email_sent = send_email(subject, [email], text_body, html_body)
            if not email_sent:
                # Clean up Redis if email fails
                RedisCache.delete(otp_key)
                RedisCache.delete(attempts_key)
                return False, "Failed to send verification email. Please try again."
            
            print(f"OTP sent to {email}: {otp}")  # Remove in production
            return True, "OTP sent to your email. Please verify to complete registration."
            
        except Exception as e:
            print(f"Send OTP error: {e}")
            return False, "An error occurred while sending OTP"
    
    @staticmethod
    def verify_registration_otp(email, otp, full_name, username, password):
        """Verify OTP and complete user registration"""
        try:
            email = sanitize_email(email)
            otp = sanitize_string(otp)
            username = sanitize_string(username)
            
            otp_key = RedisOTPService._get_otp_key(email, "registration")
            attempts_key = RedisOTPService._get_attempts_key(email, "registration")
            
            # Get OTP data from Redis
            otp_data = RedisCache.get(otp_key)
            if not otp_data:
                return False, "No valid OTP found for this email or OTP has expired"
            
            # Check attempts
            attempts = RedisCache.get(attempts_key, 0)
            if attempts >= RedisOTPService.MAX_ATTEMPTS:
                # Clean up Redis
                RedisCache.delete(otp_key)
                RedisCache.delete(attempts_key)
                return False, "Too many failed attempts. Please request a new OTP."
            
            # Verify OTP
            if otp_data["otp"] != otp:
                # Increment attempts
                RedisCache.set(attempts_key, attempts + 1, RedisOTPService.OTP_EXPIRATION)
                remaining_attempts = RedisOTPService.MAX_ATTEMPTS - (attempts + 1)
                return False, f"Invalid OTP. {remaining_attempts} attempts remaining."
            
            # Double-check that user doesn't exist
            if User.query.filter_by(username=username).first():
                return False, "Username already exists"
            if User.query.filter_by(email=email).first():
                return False, "Email already registered"
            
            # Create user
            user = User(username=username, email=email, full_name=full_name)
            user.set_password(password)
            
            db.session.add(user)
            db.session.commit()
            
            # Clean up Redis
            RedisCache.delete(otp_key)
            RedisCache.delete(attempts_key)
            
            # Send welcome email
            RedisOTPService._send_welcome_email(user)
            
            return True, "Registration completed successfully"
            
        except Exception as e:
            print(f"OTP verification error: {e}")
            db.session.rollback()
            return False, "An error occurred during verification"
    
    @staticmethod
    def resend_registration_otp(email, username="User"):
        """Resend OTP for registration"""
        try:
            email = sanitize_email(email)
            
            if User.query.filter_by(email=email).first():
                return False, "Email already registered"
            
            return RedisOTPService.send_registration_otp(username, email)
            
        except Exception as e:
            print(f"Resend OTP error: {e}")
            return False, "An error occurred while resending OTP"
    
    @staticmethod
    def _send_welcome_email(user):
        """Send welcome email to new user"""
        try:
            subject = "Welcome to Our Platform!"
            html_body = get_welcome_email_template(user.username)
            text_body = f"Welcome {user.username}! Your account has been successfully created."
            send_email(subject, [user.email], text_body, html_body)
        except Exception as e:
            print(f"Welcome email error: {e}")
            # Don't fail registration if welcome email fails
