from datetime import datetime, timedelta
from utils.redis_utils import RedisCache
from flask_jwt_extended import decode_token
from flask import current_app

class RedisTokenService:
    """Redis-based token blacklisting service"""
    
    BLACKLIST_PREFIX = "blacklisted_token:"
    DEFAULT_EXPIRATION = 86400  # 24 hours
    
    @staticmethod
    def _get_blacklist_key(jti):
        """Generate Redis key for blacklisted token"""
        return f"{RedisTokenService.BLACKLIST_PREFIX}{jti}"
    
    @staticmethod
    def blacklist_token(jti, token_type="access", expiration=None):
        """Add a token to the blacklist"""
        try:
            if expiration is None:
                expiration = RedisTokenService.DEFAULT_EXPIRATION
            
            blacklist_key = RedisTokenService._get_blacklist_key(jti)
            token_data = {
                "jti": jti,
                "type": token_type,
                "blacklisted_at": datetime.utcnow().isoformat()
            }
            
            success = RedisCache.set(blacklist_key, token_data, expiration)
            
            if not success:
                current_app.logger.error(f"Failed to blacklist token {jti} in Redis")
                return True
                
            current_app.logger.info(f"Successfully blacklisted token {jti}")
            return success
            
        except Exception as e:
            current_app.logger.error(f"Error blacklisting token {jti}: {e}")
            return True
    
    @staticmethod
    def is_token_blacklisted(jti):
        """Check if a token is blacklisted"""
        try:
            blacklist_key = RedisTokenService._get_blacklist_key(jti)
            token_data = RedisCache.get(blacklist_key)
            result = token_data is not None
            
            if result:
                current_app.logger.info(f"Token {jti} is blacklisted")
            
            return result
            
        except Exception as e:
            current_app.logger.error(f"Error checking token blacklist for {jti}: {e}")
            # If Redis fails, assume token is not blacklisted to avoid blocking valid users
            return False
    
    @staticmethod
    def get_blacklisted_token_info(jti):
        """Get information about a blacklisted token"""
        try:
            blacklist_key = RedisTokenService._get_blacklist_key(jti)
            return RedisCache.get(blacklist_key)
            
        except Exception as e:
            current_app.logger.error(f"Error getting blacklisted token info for {jti}: {e}")
            return None
    
    @staticmethod
    def blacklist_user_tokens(user_id, token_type=None):
        """Blacklist all tokens for a specific user (for logout all devices)"""
        try:
            user_blacklist_key = f"user_blacklist:{user_id}"
            blacklist_data = {
                "user_id": user_id,
                "blacklisted_at": datetime.utcnow().isoformat(),
                "type": token_type or "all"
            }
            
            success = RedisCache.set(user_blacklist_key, blacklist_data, 604800)  # 7 days
            
            if not success:
                current_app.logger.error(f"Failed to blacklist tokens for user {user_id} in Redis")
                return True  # Allow logout to succeed even if Redis fails
                
            current_app.logger.info(f"Successfully blacklisted tokens for user {user_id}")
            return success
            
        except Exception as e:
            current_app.logger.error(f"Error blacklisting tokens for user {user_id}: {e}")
            return True  # Allow logout to succeed even if Redis fails
    
    @staticmethod
    def is_user_blacklisted(user_id):
        """Check if all tokens for a user are blacklisted"""
        try:
            user_blacklist_key = f"user_blacklist:{user_id}"
            blacklist_data = RedisCache.get(user_blacklist_key)
            result = blacklist_data is not None
            
            if result:
                current_app.logger.info(f"All tokens for user {user_id} are blacklisted")
            else:
                current_app.logger.info(f"User {user_id} is not blacklisted")
            
            return result
            
        except Exception as e:
            current_app.logger.error(f"Error checking user blacklist for {user_id}: {e}")
            # If Redis fails, assume user is not blacklisted to avoid blocking valid users
            return False
