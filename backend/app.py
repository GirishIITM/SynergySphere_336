from flask import Flask
from config import Config
from models.user import db, bcrypt, init_db
from routes import auth_bp

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)
    
    # Initialize extensions
    db.init_app(app)
    bcrypt.init_app(app)
    
    # Register blueprints
    app.register_blueprint(auth_bp, url_prefix='/auth')
    
    # Create database tables
    with app.app_context():
        init_db()
    
    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True)
