from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_bcrypt import Bcrypt
from flask_mail import Mail
import valkey
import ssl

# Initialize extensions
db = SQLAlchemy()
jwt = JWTManager()
bcrypt = Bcrypt()
mail = Mail()
redis_client = None

def init_redis(app):
    """Initialize Redis client with app configuration."""
    global redis_client
    try:
        redis_url = app.config.get('REDIS_URL')
        if redis_url:
            # Check if it's a secure connection (rediss://) or regular (redis://)
            if redis_url.startswith('rediss://'):
                # Configure SSL context for secure connections
                ssl_context = ssl.create_default_context()
                ssl_context.check_hostname = False
                ssl_context.verify_mode = ssl.CERT_NONE
                
                redis_client = valkey.from_url(
                    redis_url, 
                    decode_responses=True,
                    socket_timeout=10,
                    socket_connect_timeout=10,
                    retry_on_timeout=True,
                    health_check_interval=30,
                    ssl_cert_reqs=None,
                    ssl_ca_certs=None,
                    ssl_check_hostname=False
                )
            else:
                # Regular connection for Valkey/Redis without SSL
                redis_client = valkey.from_url(
                    redis_url, 
                    decode_responses=True,
                    socket_timeout=10,
                    socket_connect_timeout=10,
                    retry_on_timeout=True,
                    health_check_interval=30
                )
            
            # Test connection
            redis_client.ping()
            app.logger.info("Redis/Valkey connection established successfully")
        else:
            app.logger.warning("Redis URL not configured")
            redis_client = None
    except Exception as e:
        app.logger.error(f"Failed to connect to Redis/Valkey: {e}")
        app.logger.warning("Application will continue without Redis caching")
        redis_client = None
