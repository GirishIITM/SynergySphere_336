from flask import Flask, current_app
from flask_cors import CORS
from dotenv import load_dotenv
import cloudinary
import os
import atexit

from config import get_config
from extensions import db, jwt, bcrypt, mail, init_redis
from models import User, TokenBlocklist
from routes import register_blueprints
from utils.gmail import initialize_gmail_credentials
from utils.postgresql_migrator import migrate_sqlite_to_postgresql, check_postgresql_connection

load_dotenv()

def create_app(config_class=None):
    """Application factory pattern."""
    app = Flask(__name__)
    
    # Config loading
    if config_class is None:
        config_instance = get_config()
    else:
        config_instance = config_class() if isinstance(config_class, type) else config_class
    
    app.config.from_object(config_instance)
    
    # CORS setup
    CORS(
        app,
        origins="*",
        methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
        allow_headers=["Content-Type", "Authorization", "Access-Control-Allow-Credentials", "X-Requested-With"],
        supports_credentials=False
    )
    
    # Extensions
    db.init_app(app)
    jwt.init_app(app)
    bcrypt.init_app(app)
    init_redis(app)
    
    # Cloudinary
    cloudinary.config(
        cloud_name=os.getenv('CLOUDINARY_CLOUD_NAME'),
        api_key=os.getenv('CLOUDINARY_API_KEY'),
        api_secret=os.getenv('CLOUDINARY_API_SECRET')
    )
    
    # Blueprints
    register_blueprints(app)
    
    # JWT token blocklist callback
    @jwt.token_in_blocklist_loader
    def check_if_token_revoked(jwt_header, jwt_payload):
        jti = jwt_payload['jti']
        token = TokenBlocklist.query.filter_by(jti=jti).first()
        return token is not None
    
    # Everything below runs inside app context!
    with app.app_context():
        use_postgresql = getattr(config_instance, 'USE_POSTGRESQL', False)
        skip_migration = getattr(config_instance, 'SKIP_MIGRATION', True)
        
        try:
            database_url = app.config.get('SQLALCHEMY_DATABASE_URI')
            if use_postgresql and 'postgresql' in database_url:
                print("Using PostgreSQL database...")
                db.create_all()
                print("PostgreSQL tables created/verified")
                
                # Update existing schema
                from utils.postgresql_migrator import update_existing_schema
                update_existing_schema()
                
                if check_postgresql_connection() and not skip_migration:
                    print("PostgreSQL connection verified")
                    migrate_sqlite_to_postgresql()
                else:
                    print("PostgreSQL connection issues - falling back to SQLite")
                    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///app.db'
                    db.create_all()
            else:
                print("Using SQLite database...")
                db.create_all()
                
                # Update SQLite schema
                from utils.db_migrate import update_sqlite_schema
                update_sqlite_schema()
            
            # Gmail credentials
            try:
                print("Initializing Gmail credentials...")
                initialize_gmail_credentials()
                print("Gmail credentials initialized successfully!")
            except Exception as e:
                print(f"Gmail initialization warning: {e}")
        except Exception as e:
            print(f"Database setup warning: {e}")
            print("App will continue with limited functionality")
        
        # Cache warm-up (SAFE inside app context)
        try:
            from utils.cache_helpers import warm_up_user_cache
            warm_up_user_cache()
            print("Cache warm-up completed successfully")
        except Exception as e:
            print(f"Cache warm-up error: {e}")
    
    # Cache invalidation listeners
    @db.event.listens_for(User, 'after_insert')
    @db.event.listens_for(User, 'after_update')
    @db.event.listens_for(User, 'after_delete')
    def invalidate_user_cache(mapper, connection, target):
        """Invalidate user search cache on user changes"""
        try:
            from utils.cache_helpers import UserSearchCache
            UserSearchCache.invalidate_user_cache()
        except Exception as e:
            current_app.logger.error(f"Cache invalidation error: {e}")
    
    return app

# Create the app instance
app = create_app()

atexit.register(lambda: None)  # Cleanup placeholder

if __name__ == '__main__':
    app.run(port=5000, host='0.0.0.0', debug=True)
