import re

def validate_email(email):
    """Validate email format"""
    if not email or not isinstance(email, str):
        return False
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email.strip()) is not None

def validate_password(password):
    """Validate password strength (optional - for frontend guidance only)"""
    if not password or not isinstance(password, str):
        return False, "Password is required"
    
    if len(password) < 6:
        return False, "Password must be at least 6 characters long"
    
    strength_checks = {
        'min_length': len(password) >= 8,
        'has_uppercase': bool(re.search(r'[A-Z]', password)),
        'has_lowercase': bool(re.search(r'[a-z]', password)),
        'has_number': bool(re.search(r'\d', password)),
        'has_special': bool(re.search(r'[!@#$%^&*(),.?":{}|<>]', password))
    }
    
    return True, "Password is valid"

def validate_required_fields(data, required_fields):
    """Validate that all required fields are present and non-empty"""
    if not data:
        return False, "No data provided"
    
    for field in required_fields:
        if field not in data or not str(data[field]).strip():
            if field == 'full_name':
                return validate_full_name(data.get(field, ''))
            return False, f"{field.replace('_', ' ').title()} is required"
    
    if 'full_name' in required_fields and 'full_name' in data:
        is_valid, msg = validate_full_name(data['full_name'])
        if not is_valid:
            return False, msg
    
    return True, "All required fields present"

def sanitize_string(value):
    """Sanitize string input by stripping whitespace"""
    if not isinstance(value, str):
        return value
    return value.strip()

def sanitize_email(email):
    """Sanitize email by converting to lowercase and stripping whitespace"""
    if not isinstance(email, str):
        return email
    return email.strip().lower()

def validate_username(username):
    """Validate username format"""
    if not username or not isinstance(username, str):
        return False, "Username is required"
    
    username = username.strip()
    
    if len(username) < 3:
        return False, "Username must be at least 3 characters long"
    
    if len(username) > 30:
        return False, "Username cannot be longer than 30 characters"
    
    if not re.match(r'^[a-zA-Z0-9_]+$', username):
        return False, "Username can only contain letters, numbers, and underscores"
    
    return True, "Username is valid"

def validate_full_name(full_name):
    """Validate full name format"""
    if not full_name or not isinstance(full_name, str):
        return False, "Full name is required"
    
    full_name = full_name.strip()
    
    if len(full_name) < 2:
        return False, "Full name must be at least 2 characters long"
    
    if len(full_name) > 100:
        return False, "Full name cannot be longer than 100 characters"
    
    if not re.match(r"^[a-zA-Z\s\-']+$", full_name):
        return False, "Full name can only contain letters, spaces, hyphens, and apostrophes"
    
    return True, "Full name is valid"
