from flask import Flask, current_app, request, jsonify
from flask_cors import CORS
from flask_apscheduler import APScheduler
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
from celery_app import make_celery

load_dotenv()

# Global scheduler instance
scheduler = APScheduler()

def create_app(config_class=None):
    """Application factory pattern."""
    app = Flask(__name__)
    
    # Config loading
    if config_class is None:
        config_instance = get_config()
    else:
        config_instance = config_class() if isinstance(config_class, type) else config_class
    
    app.config.from_object(config_instance)
    
    # Scheduler configuration
    app.config['SCHEDULER_API_ENABLED'] = True
    
    # CORS setup - Allow both production and development URLs
    allowed_origins = [
        app.config['FRONTEND_URL'],
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ]
    
    CORS(
        app,
        resources={r"/*": {"origins": allowed_origins}},
        methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
        allow_headers=["Content-Type", "Authorization", "Access-Control-Allow-Credentials", "X-Requested-With", "Cache-Control", "Pragma", "Expires"],
        supports_credentials=True,
        max_age=600
    )
    
    # Extensions
    db.init_app(app)
    jwt.init_app(app)
    bcrypt.init_app(app)
    init_redis(app)
    
    # Initialize scheduler
    scheduler.init_app(app)
    
    # Initialize Celery
    celery = make_celery(app)
    
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
    
    # Error handlers to ensure CORS headers are included in error responses
    def add_cors_headers(response):
        # For development, allow localhost:3000
        origin = request.headers.get('Origin')
        if origin in allowed_origins:
            response.headers.add('Access-Control-Allow-Origin', origin)
        else:
            response.headers.add('Access-Control-Allow-Origin', 'http://localhost:3000')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization,Cache-Control,Pragma,Expires')
        response.headers.add('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        return response
    
    @app.errorhandler(500)
    def handle_500_error(e):
        response = jsonify({'error': 'Internal server error', 'details': str(e)})
        return add_cors_headers(response), 500
    
    @app.errorhandler(404)
    def handle_404_error(e):
        response = jsonify({'error': 'Resource not found'})
        return add_cors_headers(response), 404
    
    @app.errorhandler(401)
    def handle_401_error(e):
        response = jsonify({'error': 'Unauthorized'})
        return add_cors_headers(response), 401
    
    # Scheduled jobs
    def scheduled_deadline_monitoring():
        """Scheduled job to monitor task deadlines and send notifications."""
        with app.app_context():
            try:
                from services.deadline_service import DeadlineService
                from models import User
                
                users = User.query.all()
                total_notifications = 0
                
                for user in users:
                    try:
                        result = DeadlineService.scan_and_notify(user.id)
                        total_notifications += result.get('notifications_created', 0)
                    except Exception as e:
                        print(f"Error monitoring deadlines for user {user.id}: {str(e)}")
                
                print(f"Deadline monitoring completed. Created {total_notifications} notifications.")
                
            except Exception as e:
                print(f"Error in scheduled deadline monitoring: {str(e)}")
    
    # Add scheduled jobs
    @scheduler.task('interval', id='deadline_monitoring', hours=1, misfire_grace_time=900)
    def deadline_monitoring_job():
        scheduled_deadline_monitoring()
    
    # Everything below runs inside app context!
    with app.app_context():
        use_postgresql = getattr(config_instance, 'USE_POSTGRESQL', False)
        skip_migration = getattr(config_instance, 'SKIP_MIGRATION', True)
        
        try:
            database_url = app.config.get('SQLALCHEMY_DATABASE_URI')
            if use_postgresql and 'postgresql' in database_url:
                print("Using PostgreSQL database...")
                
                # Check PostgreSQL connection first
                connection_ok = check_postgresql_connection()
                
                if connection_ok:
                    print("PostgreSQL connection verified - continuing with PostgreSQL")
                    db.create_all()
                    print("PostgreSQL tables created/verified")
                    
                    # Update existing schema
                    from utils.postgresql_migrator import update_existing_schema
                    update_existing_schema()
                    
                    # Only run migration if skip_migration is False
                    if not skip_migration:
                        print("Running SQLite to PostgreSQL migration...")
                        migrate_sqlite_to_postgresql()
                    else:
                        print("Migration skipped (SKIP_MIGRATION=True)")
                else:
                    print("PostgreSQL connection failed - falling back to SQLite")
                    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///app.db'
                    db.create_all()
            else:
                print("Using SQLite database...")
                db.create_all()
                
                # Update SQLite schema (if migration utility exists)
                try:
                    from utils.db_migrate import update_sqlite_schema
                    update_sqlite_schema()
                except ImportError:
                    print("No SQLite migration utility found, using db.create_all()")
            
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
        
        # Start scheduler
        if not scheduler.running:
            scheduler.start()
            print("Scheduler started for deadline monitoring")
    
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

# Create the celery instance - this will be imported by celery_worker.py
celery = make_celery(app)

atexit.register(lambda: scheduler.shutdown() if scheduler.running else None)

if __name__ == '__main__':
    app.run(port=5000, host='0.0.0.0', debug=True)
