from models import User
from extensions import db
from utils.google_auth import verify_google_token, get_google_client_id as get_google_client_id_util
from utils.email import send_email
from utils.email_templates import get_welcome_email_template
from utils.auth_utils import create_auth_response

class GoogleOAuthService:
    @staticmethod
    def authenticate_with_google(token, is_registration=False):
        """Authenticate user with Google OAuth token"""
        try:
            google_info = verify_google_token(token)
            if not google_info:
                return None, "Invalid Google token"
            
            if not google_info.get('email_verified', False):
                return None, "Google email not verified"
            
            email = google_info.get('email')
            if not email:
                return None, "Email not found in Google token"

            if is_registration:
                return GoogleOAuthService._handle_google_registration(google_info)
            else:
                return GoogleOAuthService._handle_google_login(google_info)
                
        except Exception as e:
            print(f"Google OAuth error: {e}")
            return None, "An error occurred during Google authentication"

    @staticmethod
    def _handle_google_registration(google_info):
        """Handle Google OAuth registration"""
        email = google_info['email']
        
        existing_user = User.query.filter_by(email=email).first()
        if existing_user:
            return None, "An account with this email already exists. Please log in instead."
            
        user = User.find_or_create_google_user(google_info)
        
        GoogleOAuthService._send_welcome_email(user)
        
        return create_auth_response(user), None

    @staticmethod
    def _handle_google_login(google_info):
        """Handle Google OAuth login"""
        email = google_info['email']
        
        user = User.query.filter_by(email=email).first()
        if not user:
            return None, "No account found with this email. Please register first."
            
        if not user.google_id:
            user.google_id = google_info.get('google_id')
            if google_info.get('picture'):
                user.profile_picture = google_info.get('picture')
            db.session.commit()
        
        return create_auth_response(user), None

    @staticmethod
    def get_client_id():
        """Get Google OAuth client ID"""
        try:
            client_id = get_google_client_id_util()
            if not client_id:
                return None, "Google OAuth client ID not configured"
            return {"client_id": client_id}, None
        except Exception as e:
            print(f"Get Google client ID error: {e}")
            return None, "An error occurred while fetching Google client ID"

    @staticmethod
    def exchange_authorization_code(code, state=None):
        """Exchange Google authorization code for ID token"""
        try:
            import requests
            from flask import current_app, request
            
            token_url = "https://oauth2.googleapis.com/token"
            client_id = get_google_client_id_util()
            client_secret = current_app.config.get('GOOGLE_CLIENT_SECRET')
            redirect_uri = f"{request.host_url}auth/google/callback"
            
            if not client_secret:
                return None, "Google OAuth not properly configured"
            
            token_data = {
                'code': code,
                'client_id': client_id,
                'client_secret': client_secret,
                'redirect_uri': redirect_uri,
                'grant_type': 'authorization_code'
            }
            
            response = requests.post(token_url, data=token_data)
            token_response = response.json()
            
            if 'id_token' not in token_response:
                return None, "Failed to get ID token from Google"
            
            return {"credential": token_response['id_token']}, None
            
        except Exception as e:
            print(f"Google code exchange error: {e}")
            return None, "An error occurred during code exchange"

    @staticmethod
    def _send_welcome_email(user):
        """Send welcome email to new Google user"""
        try:
            subject = "Welcome to Our Platform!"
            html_body = get_welcome_email_template(user.username)
            text_body = f"Welcome {user.username}! Your account has been successfully created."
            send_email(subject, [user.email], text_body, html_body)
        except Exception as e:
            print(f"Welcome email error: {e}")
