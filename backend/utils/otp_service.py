from models import User, OTPVerification, PasswordResetToken
from extensions import db
from utils.email import send_email
from utils.email_templates import get_otp_email_template, get_welcome_email_template
from utils.validation import sanitize_email, sanitize_string, validate_full_name

class OTPService:
    @staticmethod
    def send_registration_otp(full_name, email):
        try:
            email = sanitize_email(email)
            full_name = sanitize_string(full_name)
            
            is_valid, msg = validate_full_name(full_name)
            if not is_valid:
                return False, msg
            
            otp = OTPVerification.create_otp(email)
            html_body = get_otp_email_template(full_name, otp)
            
            email_sent = send_email(
                "Email Verification - Your OTP Code",
                [email],
                f"Your verification code is: {otp}",
                html_body
            )
            
            if email_sent:
                return True, "OTP sent successfully. Please check your email."
            else:
                return False, "Failed to send OTP email. Please try again."
                
        except Exception as e:
            print(f"Send OTP error: {e}")
            return False, "An error occurred while sending OTP"

    @staticmethod
    def verify_registration_otp(email, otp, full_name, username, password):
        try:
            email = sanitize_email(email)
            verification = OTPVerification.query.filter_by(email=email, is_used=False).first()
            
            if not verification:
                return False, "OTP not found or expired. Please request a new one."
            
            if verification.is_expired():
                return False, "OTP has expired. Please request a new one."
            
            if verification.attempts >= 3:
                return False, "Too many attempts. Please request a new OTP."
            
            if verification.otp != otp:
                verification.attempts += 1
                db.session.commit()
                remaining = 3 - verification.attempts
                return False, f"Invalid OTP. {remaining} attempts remaining."
            
            existing_user = User.query.filter(
                (User.email == email) | (User.username == username)
            ).first()
            
            if existing_user:
                return False, "User already exists"
            
            user = User(
                full_name=sanitize_string(full_name),
                username=sanitize_string(username),
                email=email
            )
            user.set_password(password)
            
            verification.is_used = True
            
            db.session.add(user)
            db.session.commit()
            
            OTPService._send_welcome_email(user)
            
            return True, "Registration completed successfully"
            
        except Exception as e:
            print(f"OTP verification error: {e}")
            db.session.rollback()
            return False, "An error occurred during verification"

    @staticmethod
    def resend_registration_otp(email, username="User"):
        return OTPService.send_registration_otp(username, email)

    @staticmethod
    def _send_welcome_email(user):
        try:
            html_body = get_welcome_email_template(user.full_name)
            send_email(
                "Welcome to SynergySphere!",
                [user.email],
                f"Welcome {user.full_name}! Your account has been created successfully.",
                html_body
            )
        except Exception as e:
            print(f"Welcome email error: {e}")
