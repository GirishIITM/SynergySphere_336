from flask import Blueprint, jsonify, request, render_template_string, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt, create_access_token

from models import User
from extensions import db
from utils.validation import validate_required_fields, sanitize_email, sanitize_string
from utils.auth_utils import (
    validate_login_data, authenticate_user, create_auth_response
)
from utils.redis_otp_service import RedisOTPService
from utils.redis_token_service import RedisTokenService
from utils.google_oauth_service import GoogleOAuthService
from utils.password_service import PasswordService
from utils.cloudinary_upload import delete_cloudinary_image
from utils.route_cache import cache_route, invalidate_cache_on_change

auth_bp = Blueprint("auth", __name__)

@auth_bp.route("/register", methods=["POST"])
@invalidate_cache_on_change(['users'])
def register():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"msg": "No data provided"}), 400
        
        required_fields = ["full_name", "username", "email", "password"]
        for field in required_fields:
            if field not in data or not str(data[field]).strip():
                return jsonify({"msg": f"{field.replace('_', ' ').title()} is required"}), 400
        
        from utils.validation import validate_full_name
        is_valid, msg = validate_full_name(data["full_name"])
        if not is_valid:
            return jsonify({"msg": msg}), 400
        
        if len(data["password"]) < 6:
            return jsonify({"msg": "Password must be at least 6 characters long"}), 400
        
        full_name = sanitize_string(data["full_name"])
        username = sanitize_string(data["username"])
        email = sanitize_email(data["email"])
        
        existing_user = User.query.filter(
            (User.email == email) | (User.username == username)
        ).first()
        
        if existing_user:
            if existing_user.email == email:
                return jsonify({"msg": "Email already exists"}), 400
            else:
                return jsonify({"msg": "Username already exists"}), 400
        
        success, message = RedisOTPService.send_registration_otp(full_name, email)
        status_code = 200 if success else 500
        
        return jsonify({"msg": message, "email": email}), status_code
        
    except Exception as e:
        print(f"Registration error: {e}")
        return jsonify({"msg": "An error occurred during registration"}), 500

@auth_bp.route("/verify-otp", methods=["POST"])
@invalidate_cache_on_change(['users'])
def verify_otp():
    try:
        data = request.get_json()
        is_valid, msg = validate_required_fields(data, ["email", "otp", "full_name", "username", "password"])
        if not is_valid:
            return jsonify({"msg": msg}), 400
        
        success, message = RedisOTPService.verify_registration_otp(
            data["email"], data["otp"], data["full_name"], data["username"], data["password"]
        )
        status_code = 201 if success else 400
        
        return jsonify({"msg": message}), status_code
        
    except Exception as e:
        print(f"OTP verification error: {e}")
        return jsonify({"msg": "An error occurred during verification"}), 500

@auth_bp.route("/resend-otp", methods=["POST"])
def resend_otp():
    try:
        data = request.get_json()
        if not data or "email" not in data:
            return jsonify({"msg": "Email is required"}), 400
        
        username = data.get("username", "User")
        success, message = RedisOTPService.resend_registration_otp(data["email"], username)
        status_code = 200 if success else 400
        
        return jsonify({"msg": message}), status_code
        
    except Exception as e:
        print(f"Resend OTP error: {e}")
        return jsonify({"msg": "An error occurred while resending OTP"}), 500

@auth_bp.route("/login", methods=["POST"])
def login():
    try:
        data = request.get_json()
        is_valid, msg = validate_login_data(data)
        if not is_valid:
            return jsonify({"msg": msg}), 400
        
        username = sanitize_string(data["username"])
        email = data.get("email", username)
        password = data["password"]
        
        user, error_msg = authenticate_user(username, password)
        if not user:
            return jsonify({"msg": error_msg}), 401
        
        return jsonify(create_auth_response(user)), 200
        
    except Exception as e:
        print(f"Login error: {e}")
        return jsonify({"msg": "An error occurred during login"}), 500

@auth_bp.route("/refresh", methods=["POST"])
@jwt_required(refresh=True)
def refresh():
    try:
        identity = get_jwt_identity()
        
        from utils.auth_utils import create_refreshed_tokens
        access_token, refresh_token = create_refreshed_tokens(identity)
        
        return jsonify({
            "access_token": access_token,
            "refresh_token": refresh_token
        }), 200
    except Exception as e:
        print(f"Token refresh error: {e}")
        return jsonify({"msg": "An error occurred while refreshing token"}), 500

@auth_bp.route("/logout", methods=["DELETE"])
@jwt_required(verify_type=False)
def logout():
    try:
        jwt_data = get_jwt()
        jti = jwt_data["jti"]
        ttype = jwt_data["type"]
        
        current_app.logger.info(f"Attempting to logout token with JTI: {jti}, Type: {ttype}")
        
        success = RedisTokenService.blacklist_token(jti, ttype)
        
        current_app.logger.info(f"Logout completed for token {jti}")
        return jsonify({"msg": f"{ttype.capitalize()} token revoked successfully"}), 200
        
    except Exception as e:
        current_app.logger.error(f"Logout error: {e}")
        return jsonify({"msg": "Logout completed successfully"}), 200

@auth_bp.route("/forgot-password", methods=["POST"])
def forgot_password():
    try:
        data = request.get_json()
        if not data or "email" not in data:
            return jsonify({"msg": "Email is required"}), 400
        
        success, message = PasswordService.send_reset_email(data["email"])
        return jsonify({"message": message}), 200
        
    except Exception as e:
        print(f"Forgot password error: {e}")
        return jsonify({"msg": "An error occurred while processing your request"}), 500

@auth_bp.route("/verify-reset-token", methods=["POST"])
def verify_reset_token():
    """Verify if a password reset token is valid"""
    try:
        data = request.get_json()
        if not data or "token" not in data:
            return jsonify({"msg": "Token is required"}), 400
        
        success, message = PasswordService.verify_reset_token(data["token"])
        status_code = 200 if success else 400
        
        return jsonify({"msg": message, "valid": success}), status_code
        
    except Exception as e:
        print(f"Verify reset token error: {e}")
        return jsonify({"msg": "An error occurred while verifying token"}), 500

@auth_bp.route("/reset-password", methods=["POST"])
def reset_password():
    try:
        data = request.get_json()
        is_valid, msg = validate_required_fields(data, ["token", "new_password"])
        if not is_valid:
            return jsonify({"msg": msg}), 400
        
        success, message = PasswordService.reset_password_with_token(
            data["token"], data["new_password"]
        )
        status_code = 200 if success else 400
        
        return jsonify({"message": message}), status_code
        
    except Exception as e:
        print(f"Reset password error: {e}")
        return jsonify({"msg": "An error occurred while resetting password"}), 500

@auth_bp.route("/google-register", methods=["POST"])
@invalidate_cache_on_change(['users'])
def google_register():
    try:
        data = request.get_json()
        if not data or "token" not in data:
            return jsonify({"msg": "Google token is required"}), 400
        
        result, error_msg = GoogleOAuthService.authenticate_with_google(
            data["token"], is_registration=True
        )
        
        if not result:
            status_code = 409 if "already exists" in error_msg else 401
            return jsonify({"msg": error_msg}), status_code
        
        return jsonify(result), 201
        
    except Exception as e:
        print(f"Google register error: {e}")
        return jsonify({"msg": "An error occurred during Google registration"}), 500

@auth_bp.route("/google-login", methods=["POST"])
def google_login():
    try:
        data = request.get_json()
        if not data or "token" not in data:
            return jsonify({"msg": "Google token is required"}), 400
        
        result, error_msg = GoogleOAuthService.authenticate_with_google(
            data["token"], is_registration=False
        )
        
        if not result:
            status_code = 404 if "not found" in error_msg else 401
            return jsonify({"msg": error_msg}), status_code
        
        return jsonify(result), 200
        
    except Exception as e:
        print(f"Google login error: {e}")
        return jsonify({"msg": "An error occurred during Google login"}), 500

@auth_bp.route("/google/client-id", methods=["GET"])
@cache_route(ttl=3600, user_specific=False)  # Cache for 1 hour, not user-specific
def get_google_client_id():
    try:
        result, error_msg = GoogleOAuthService.get_client_id()
        
        if not result:
            return jsonify({"error": error_msg}), 500
        
        return jsonify(result), 200
        
    except Exception as e:
        print(f"Get Google client ID error: {e}")
        return jsonify({"error": "An error occurred while fetching Google client ID"}), 500

@auth_bp.route("/google/exchange-code", methods=["POST"])
def google_exchange_code():
    try:
        data = request.get_json()
        if not data or "code" not in data:
            return jsonify({"error": "Authorization code is required"}), 400
        
        result, error_msg = GoogleOAuthService.exchange_authorization_code(
            data["code"], data.get("state")
        )
        
        if not result:
            return jsonify({"error": error_msg}), 400
        
        return jsonify(result), 200
        
    except Exception as e:
        print(f"Google code exchange error: {e}")
        return jsonify({"error": "An error occurred during code exchange"}), 500

@auth_bp.route("/google/callback", methods=["GET"])
def google_callback():
    """Handle Google OAuth callback with HTML response"""
    try:
        callback_html = """
        <!DOCTYPE html>
        <html>
        <head>
            <title>Authentication</title>
            <style>
                body { font-family: Arial, sans-serif; display: flex; justify-content: center; 
                       align-items: center; height: 100vh; margin: 0; background-color: #f5f5f5; }
                .container { text-align: center; padding: 20px; background: white; 
                           border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                .spinner { width: 40px; height: 40px; border: 4px solid #f3f3f3; 
                         border-top: 4px solid #4285F4; border-radius: 50%; 
                         animation: spin 1s linear infinite; margin: 0 auto 20px; }
                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="spinner"></div>
                <p>Processing authentication...</p>
            </div>
            <script>
                (function() {
                    const urlParams = new URLSearchParams(window.location.search);
                    const code = urlParams.get('code');
                    const error = urlParams.get('error');
                    const state = urlParams.get('state');
                    
                    if (error) {
                        window.postMessage({
                            type: 'GOOGLE_AUTH_ERROR',
                            error: error === 'access_denied' ? 'Authentication cancelled' : 'Authentication failed'
                        }, window.location.origin);
                        window.close();
                        return;
                    }
                    
                    if (!code) {
                        window.postMessage({
                            type: 'GOOGLE_AUTH_ERROR',
                            error: 'No authorization code received'
                        }, window.location.origin);
                        window.close();
                        return;
                    }
                    
                    fetch('/auth/google/exchange-code', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ code, state }),
                    })
                    .then(response => response.json())
                    .then(result => {
                        if (result.credential) {
                            window.postMessage({
                                type: 'GOOGLE_AUTH_SUCCESS',
                                credential: result.credential
                            }, window.location.origin);
                        } else {
                            window.postMessage({
                                type: 'GOOGLE_AUTH_ERROR',
                                error: result.error || 'Failed to authenticate with Google'
                            }, window.location.origin);
                        }
                        window.close();
                    })
                    .catch(error => {
                        window.postMessage({
                            type: 'GOOGLE_AUTH_ERROR',
                            error: 'Failed to process authentication'
                        }, window.location.origin);
                        window.close();
                    });
                })();
            </script>
        </body>
        </html>
        """
        return render_template_string(callback_html)
        
    except Exception as e:
        print(f"Google callback error: {e}")
        return jsonify({"msg": "OAuth callback error"}), 500

@auth_bp.route("/settings", methods=["GET"])
@cache_route(ttl=300, user_specific=True)  # Cache for 5 minutes
def get_settings():
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get_or_404(user_id)
        
        return jsonify({
            "user": {
                "id": user.id,
                "full_name": getattr(user, 'full_name', user.username),
                "name": getattr(user, 'full_name', user.username),
                "username": user.username,
                "email": user.email,
                "about": getattr(user, 'about', ''),
                "notify_email": getattr(user, 'notify_email', True),
                "notify_in_app": getattr(user, 'notify_in_app', True),
                "profile_picture": user.profile_picture,
                "created_at": user.created_at.isoformat() if user.created_at else None
            }
        }), 200
        
    except Exception as e:
        print(f"Get settings error: {e}")
        return jsonify({"msg": "An error occurred while fetching settings"}), 500

@auth_bp.route("/settings", methods=["PUT"])
@invalidate_cache_on_change(['users', 'profile'])
def update_settings():
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get_or_404(user_id)
        
        # Handle both JSON and FormData
        if request.content_type and 'multipart/form-data' in request.content_type:
            # Handle file upload
            if 'profile_image' not in request.files:
                return jsonify({"msg": "No profile image file provided"}), 400
            
            file = request.files['profile_image']
            if file.filename == '':
                return jsonify({"msg": "No file selected"}), 400
            
            # Import cloudinary upload function
            from utils.cloudinary_upload import upload_profile_image, delete_cloudinary_image
            
            # Delete old profile picture if it exists
            if user.profile_picture and 'cloudinary.com' in user.profile_picture:
                delete_cloudinary_image(user.profile_picture)
            
            # Upload new image
            upload_result = upload_profile_image(file, user_id)
            if not upload_result:
                return jsonify({"msg": "Failed to upload image"}), 500
            
            user.profile_picture = upload_result['secure_url']
        
        else:
            # Handle JSON data
            data = request.get_json()
            if not data:
                return jsonify({"msg": "No data provided"}), 400
            
            if "full_name" in data:
                full_name = sanitize_string(data["full_name"])
                if len(full_name.strip()) >= 1:
                    user.full_name = full_name
            
            if "username" in data:
                username = sanitize_string(data["username"])
                if len(username.strip()) >= 1:
                    existing_user = User.query.filter(User.username == username, User.id != user_id).first()
                    if not existing_user:
                        user.username = username
            
            if "about" in data:
                about = sanitize_string(data["about"]) if data["about"] else ""
                user.about = about
            
            if "notify_email" in data:
                user.notify_email = bool(data["notify_email"])
            if "notify_in_app" in data:
                user.notify_in_app = bool(data["notify_in_app"])
            
            if "profile_picture" in data:
                if user.profile_picture and 'cloudinary.com' in user.profile_picture:
                    delete_cloudinary_image(user.profile_picture)
                user.profile_picture = data["profile_picture"]
        
        db.session.commit()
        return jsonify({
            "msg": "Settings updated successfully",
            "user": {
                "id": user.id,
                "full_name": getattr(user, 'full_name', user.username),
                "name": getattr(user, 'full_name', user.username),
                "username": user.username,
                "email": user.email,
                "about": getattr(user, 'about', ''),
                "notify_email": getattr(user, 'notify_email', True),
                "notify_in_app": getattr(user, 'notify_in_app', True),
                "profile_picture": user.profile_picture,
                "created_at": user.created_at.isoformat() if user.created_at else None
            }
        }), 200
        
    except Exception as e:
        print(f"Update settings error: {e}")
        db.session.rollback()
        return jsonify({"msg": "An error occurred while updating settings"}), 500
