from flask import Flask
from flask_cors import CORS
from models import db, bcrypt
import os


def create_app(test_config=None):
    """Create and configure the Flask application."""
    
    # Create Flask app instance
    app = Flask(__name__, instance_relative_config=True)
    
    # Enable CORS for all routes and origins
    CORS(app, resources={r"/*": {"origins": "*"}})
    
    # Get the absolute path to the backend directory
    backend_dir = os.path.abspath(os.path.dirname(__file__))
    db_path = os.path.join(backend_dir, 'synergysphere.db')
    
    if test_config is None:
        # Load the default configuration
        app.config.from_mapping(
            # Set secret key for session management and JWT
            SECRET_KEY='dev',  # Override this with a real secret key in production
            # Configure SQLite database file with absolute path
            SQLALCHEMY_DATABASE_URI=f'sqlite:///{db_path}',
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

    # from backend.routes.tasks_events import tasks_events_bp

    # app.register_blueprint(tasks_events_bp)
    
    return app

# Create the Flask application instance
app = create_app()

if __name__ == '__main__':
    app.run(debug=True)
