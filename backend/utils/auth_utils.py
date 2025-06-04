from flask_jwt_extended import create_access_token, create_refresh_token
from models import User
from utils.validation import validate_email, validate_password, sanitize_email, sanitize_string

def create_user_tokens(user_id):
    """Create access and refresh tokens for a user"""
    access_token = create_access_token(identity=str(user_id))
    refresh_token = create_refresh_token(identity=str(user_id))
    return access_token, refresh_token

def create_refreshed_tokens(user_id):
    """Create new access and refresh tokens (for token rotation)"""
    access_token = create_access_token(identity=str(user_id))
    refresh_token = create_refresh_token(identity=str(user_id))
    return access_token, refresh_token

def format_user_response(user):
    """Format user data for API responses"""
    return {
        "id": user.id,
        "name": getattr(user, 'full_name', user.username),
        "full_name": getattr(user, 'full_name', user.username),
        "username": user.username,
        "email": user.email,
        "about": getattr(user, 'about', ''),
        "profile_picture": user.profile_picture,
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "notify_email": getattr(user, 'notify_email', True),
        "notify_in_app": getattr(user, 'notify_in_app', True)
    }

def validate_login_data(data):
    """Validate login request data"""
    if not data:
        return False, "No data provided"
    
    required_fields = ["username", "password"]
    for field in required_fields:
        if field not in data or not data[field]:
            return False, f"{field.capitalize()} is required"
    
    return True, "Valid login data"

def validate_registration_data(data):
    """Validate registration request data"""
    if not data:
        return False, "No data provided"
    
    required_fields = ["username", "email", "password"]
    for field in required_fields:
        if field not in data or not str(data[field]).strip():
            return False, f"{field.capitalize()} is required"
    
    email = sanitize_email(data["email"])
    if not validate_email(email):
        return False, "Invalid email format"
    
    is_valid_password, password_msg = validate_password(data["password"])
    if not is_valid_password:
        return False, password_msg
    
    return True, "Valid registration data"

def check_user_exists(username, email):
    """Check if user already exists by username or email"""
    username_exists = User.query.filter_by(username=username).first()
    email_exists = User.query.filter_by(email=email).first()
    
    if username_exists:
        return True, "Username already exists"
    if email_exists:
        return True, "Email already registered"
    
    return False, None

def authenticate_user(username_or_email, password):
    """Authenticate user by username/email and password"""
    user = User.query.filter_by(username=username_or_email).first()
    if not user:
        user = User.query.filter_by(email=username_or_email).first()
    
    if not user or not user.check_password(password):
        return None, "Invalid credentials"
    
    return user, None

def create_auth_response(user):
    """Create standardized authentication response"""
    access_token, refresh_token = create_user_tokens(user.id)
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "user": format_user_response(user)
    }
