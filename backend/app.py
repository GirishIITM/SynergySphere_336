from flask import Flask
from models.user import db, bcrypt
import os

def create_app(test_config=None):
    """Create and configure the Flask application."""
    
    # Create Flask app instance
    app = Flask(__name__, instance_relative_config=True)
    
    # Ensure the instance folder exists
    try:
        os.makedirs(app.instance_path)
    except OSError:
        pass
    
    if test_config is None:
        # Load the default configuration
        app.config.from_mapping(
            # Set secret key for session management and JWT
            SECRET_KEY='dev',  # Override this with a real secret key in production
            # Configure SQLite database file part inside backend folder
            SQLALCHEMY_DATABASE_URI='sqlite:///synergysphere.db',
            SQLALCHEMY_TRACK_MODIFICATIONS=False,
        )
    else:
        # Load test configuration if passed
        app.config.update(test_config)
    
    # Initialize Flask-SQLAlchemy
    db.init_app(app)
    
    # Initialize Flask-Bcrypt
    bcrypt.init_app(app)
    
    # Register blueprints
    from routes import auth_bp
    app.register_blueprint(auth_bp, url_prefix='/auth')
    
    return app

# Create the Flask application instance
app = create_app()

if __name__ == '__main__':
    app.run(debug=True)
