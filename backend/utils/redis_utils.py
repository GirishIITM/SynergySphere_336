import json
import pickle
from datetime import datetime, timedelta
from typing import Any, Optional, Union
from extensions import redis_client
from flask import current_app

class RedisCache:
    """Redis caching utility class."""
    
    @staticmethod
    def set(key: str, value: Any, expiration: Optional[int] = None) -> bool:
        """
        Set a value in Redis with optional expiration.
        
        Args:
            key: Redis key
            value: Value to store (will be JSON serialized)
            expiration: Expiration time in seconds
            
        Returns:
            bool: True if successful, False otherwise
        """
        if not redis_client:
            current_app.logger.warning("Redis client not available")
            return False
            
        try:
            if isinstance(value, (dict, list)):
                value = json.dumps(value)
            elif not isinstance(value, str):
                value = str(value)
                
            if expiration:
                result = redis_client.setex(key, expiration, value)
            else:
                result = redis_client.set(key, value)
            
            current_app.logger.debug(f"Redis set successful for key {key}")
            return True
        except Exception as e:
            current_app.logger.error(f"Redis set error for key {key}: {e}")
            return False
    
    @staticmethod
    def get(key: str, default=None) -> Any:
        """
        Get a value from Redis.
        
        Args:
            key: Redis key
            default: Default value if key doesn't exist
            
        Returns:
            The stored value or default
        """
        if not redis_client:
            return default
            
        try:
            value = redis_client.get(key)
            if value is None:
                return default
                
            try:
                return json.loads(value)
            except (json.JSONDecodeError, TypeError):
                return value
        except Exception as e:
            current_app.logger.error(f"Redis get error for key {key}: {e}")
            return default
    
    @staticmethod
    def delete(key: str) -> bool:
        """Delete a key from Redis."""
        if not redis_client:
            return False
            
        try:
            redis_client.delete(key)
            return True
        except Exception as e:
            current_app.logger.error(f"Redis delete error for key {key}: {e}")
            return False
    
    @staticmethod
    def exists(key: str) -> bool:
        """Check if a key exists in Redis."""
        if not redis_client:
            return False
            
        try:
            return bool(redis_client.exists(key))
        except Exception as e:
            current_app.logger.error(f"Redis exists error for key {key}: {e}")
            return False
    
    @staticmethod
    def expire(key: str, seconds: int) -> bool:
        """Set expiration time for a key."""
        if not redis_client:
            return False
            
        try:
            redis_client.expire(key, seconds)
            return True
        except Exception as e:
            current_app.logger.error(f"Redis expire error for key {key}: {e}")
            return False

    @staticmethod
    def delete_pattern(pattern: str) -> int:
        """Delete keys matching a pattern."""
        if not redis_client:
            return 0
            
        try:
            keys = redis_client.keys(pattern)
            if keys:
                return redis_client.delete(*keys)
            return 0
        except Exception as e:
            current_app.logger.error(f"Redis delete pattern error for pattern {pattern}: {e}")
            return 0

class SessionCache:
    """Redis-based session management."""
    
    SESSION_PREFIX = "session:"
    DEFAULT_EXPIRATION = 3600  # 1 hour
    
    @staticmethod
    def create_session(user_id: int, session_data: dict, expiration: int = DEFAULT_EXPIRATION) -> str:
        """Create a new session in Redis."""
        import uuid
        session_id = str(uuid.uuid4())
        session_key = f"{SessionCache.SESSION_PREFIX}{session_id}"
        
        session_data.update({
            'user_id': user_id,
            'created_at': datetime.utcnow().isoformat(),
            'last_accessed': datetime.utcnow().isoformat()
        })
        
        if RedisCache.set(session_key, session_data, expiration):
            return session_id
        return None
    
    @staticmethod
    def get_session(session_id: str) -> Optional[dict]:
        """Retrieve session data from Redis."""
        session_key = f"{SessionCache.SESSION_PREFIX}{session_id}"
        session_data = RedisCache.get(session_key)
        
        if session_data:
            session_data['last_accessed'] = datetime.utcnow().isoformat()
            RedisCache.set(session_key, session_data, SessionCache.DEFAULT_EXPIRATION)
            
        return session_data
    
    @staticmethod
    def delete_session(session_id: str) -> bool:
        """Delete a session from Redis."""
        session_key = f"{SessionCache.SESSION_PREFIX}{session_id}"
        return RedisCache.delete(session_key)

class RateLimiter:
    """Redis-based rate limiting."""
    
    RATE_LIMIT_PREFIX = "rate_limit:"
    
    @staticmethod
    def is_rate_limited(identifier: str, limit: int, window: int) -> tuple[bool, int]:
        """
        Check if an identifier is rate limited.
        
        Args:
            identifier: Unique identifier (IP, user_id, etc.)
            limit: Maximum number of requests
            window: Time window in seconds
            
        Returns:
            tuple: (is_limited, remaining_requests)
        """
        if not redis_client:
            return False, limit
            
        key = f"{RateLimiter.RATE_LIMIT_PREFIX}{identifier}"
        
        try:
            current_requests = redis_client.get(key)
            if current_requests is None:
                redis_client.setex(key, window, 1)
                return False, limit - 1
            
            current_requests = int(current_requests)
            if current_requests >= limit:
                return True, 0
            
            redis_client.incr(key)
            return False, limit - current_requests - 1
            
        except Exception as e:
            current_app.logger.error(f"Rate limiting error for {identifier}: {e}")
            return False, limit

class CacheDecorator:
    """Decorator for caching function results."""
    
    @staticmethod
    def cache(expiration: int = 300, key_prefix: str = "cache:"):
        """
        Decorator to cache function results.
        
        Args:
            expiration: Cache expiration in seconds
            key_prefix: Prefix for cache keys
        """
        def decorator(func):
            def wrapper(*args, **kwargs):
                cache_key = f"{key_prefix}{func.__name__}:{hash(str(args) + str(sorted(kwargs.items())))}"
                
                cached_result = RedisCache.get(cache_key)
                if cached_result is not None:
                    return cached_result
                
                result = func(*args, **kwargs)
                RedisCache.set(cache_key, result, expiration)
                return result
            
            return wrapper
        return decorator

class PubSubManager:
    """Redis pub/sub for real-time features."""
    
    @staticmethod
    def publish_notification(channel: str, message: dict) -> bool:
        """Publish a notification to a Redis channel."""
        if not redis_client:
            return False
            
        try:
            message_data = {
                'timestamp': datetime.utcnow().isoformat(),
                'data': message
            }
            redis_client.publish(channel, json.dumps(message_data))
            return True
        except Exception as e:
            current_app.logger.error(f"Pub/sub publish error: {e}")
            return False
    
    @staticmethod
    def publish_user_notification(user_id: int, notification_type: str, data: dict) -> bool:
        """Publish a notification to a specific user."""
        channel = f"user:{user_id}:notifications"
        message = {
            'type': notification_type,
            'data': data
        }
        return PubSubManager.publish_notification(channel, message)
    
    @staticmethod
    def publish_project_update(project_id: int, update_type: str, data: dict) -> bool:
        """Publish an update to a project channel."""
        channel = f"project:{project_id}:updates"
        message = {
            'type': update_type,
            'data': data
        }
        return PubSubManager.publish_notification(channel, message)
