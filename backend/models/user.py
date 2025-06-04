from extensions import db, bcrypt
from utils.datetime_utils import get_utc_now

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    full_name = db.Column(db.String(100), nullable=False)  # Add full name field
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=True)  # Make nullable for Google OAuth users
    google_id = db.Column(db.String(100), unique=True, nullable=True)  # Add = Google ID
    profile_picture = db.Column(db.String(255), nullable=True)  # Add profile picture URL
    about = db.Column(db.Text, nullable=True)  # Add about field
    notify_email = db.Column(db.Boolean, default=True)
    notify_in_app = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=get_utc_now)

    
    projects = db.relationship('Project', secondary='membership', back_populates='members')
    
    tasks = db.relationship('Task', back_populates='assignee')
    
    messages = db.relationship('Message', back_populates='user')
    
    notifications = db.relationship('Notification', back_populates='user')
    
    def __init__(self, **kwargs):
        super(User, self).__init__(**kwargs)
        self._invalidate_search_cache()
    
    def _invalidate_search_cache(self):
        """Invalidate user search cache when user data changes"""
        try:
            from utils.cache_helpers import UserSearchCache
            UserSearchCache.invalidate_user_cache()
        except ImportError:
            pass
        except Exception as e:
            print(f"Cache invalidation error: {e}")
    
    def save(self):
        """Custom save method with cache invalidation"""
        db.session.add(self)
        db.session.commit()
        self._invalidate_search_cache()
    
    def update(self, **kwargs):
        """Update user with cache invalidation"""
        for key, value in kwargs.items():
            if hasattr(self, key):
                setattr(self, key, value)
        db.session.commit()
        self._invalidate_search_cache()
    
    def set_password(self, password):
        self.password_hash = bcrypt.generate_password_hash(password).decode('utf-8')
    
    def check_password(self, password):
        if not self.password_hash:
            return False
        return bcrypt.check_password_hash(self.password_hash, password)
    
    @staticmethod
    def create_google_user(google_info):
        """Create a new user from Google OAuth info"""
        full_name = google_info.get('name', google_info.get('given_name', 'User'))
        
        username = google_info.get('given_name', google_info['email'].split('@')[0])
        base_username = username
        counter = 1
        while User.query.filter_by(username=username).first():
            username = f"{base_username}{counter}"
            counter += 1
        
        user = User(
            full_name=full_name,
            username=username,
            email=google_info['email'],
            google_id=google_info['google_id'],
            profile_picture=google_info.get('picture')
        )
        db.session.add(user)
        db.session.commit()
        user._invalidate_search_cache()
        return user

    @staticmethod
    def find_or_create_google_user(google_info):
        """Find existing user by Google ID or email, or create new user"""
        user = User.query.filter_by(google_id=google_info['google_id']).first()
        if user:
            return user
        
        user = User.query.filter_by(email=google_info['email']).first()
        if user:
            user.google_id = google_info['google_id']
            if google_info.get('picture'):
                user.profile_picture = google_info['picture']
            db.session.commit()
            return user
        
        return User.create_google_user(google_info)
