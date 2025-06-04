from .extensions import db

class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), nullable=False, unique=True)
    email = db.Column(db.String(120), nullable=False, unique=True)
    password_hash = db.Column(db.String(128))
    profile_picture = db.Column(db.String(255))
    google_id = db.Column(db.String(255), unique=True)
    notify_email = db.Column(db.Boolean, default=True)
    notify_in_app = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, server_default=db.func.now())
    updated_at = db.Column(db.DateTime, server_default=db.func.now(), onupdate=db.func.now())

    # Relationships
    projects = db.relationship('Project', backref='owner', lazy=True)
    tasks = db.relationship('Task', backref='owner', lazy=True)
    notifications = db.relationship('Notification', backref='user', lazy=True)

    def __repr__(self):
        return f'<User {self.username}>'

    def set_password(self, password):
        """Set the password for the user"""
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        """Check the password for the user"""
        return check_password_hash(self.password_hash, password)

    @classmethod
    def create_google_user(cls, google_info):
        """Create a new user from Google OAuth info"""
        email = google_info.get('email')
        name = google_info.get('name', '')
        given_name = google_info.get('given_name', '')
        family_name = google_info.get('family_name', '')
        
        # Create username from name or email
        username = name if name else email.split('@')[0]
        
        # Ensure username is unique
        base_username = username
        counter = 1
        while cls.query.filter_by(username=username).first():
            username = f"{base_username}{counter}"
            counter += 1
        
        user = cls(
            username=username,
            email=email,
            google_id=google_info.get('google_id'),
            profile_picture=google_info.get('picture', ''),
            notify_email=True,
            notify_in_app=True
        )
        
        db.session.add(user)
        db.session.commit()
        return user

    @classmethod
    def find_or_create_google_user(cls, google_info):
        """Find existing user or create new one from Google OAuth info"""
        email = google_info.get('email')
        user = cls.query.filter_by(email=email).first()
        
        if user:
            # Update Google info if not already set
            if not user.google_id:
                user.google_id = google_info.get('google_id')
                if google_info.get('picture'):
                    user.profile_picture = google_info.get('picture')
                db.session.commit()
            return user
        else:
            return cls.create_google_user(google_info)