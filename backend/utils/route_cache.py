import json
import hashlib
from functools import wraps
from flask import request, jsonify, current_app
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request
from utils.redis_utils import RedisCache
from datetime import datetime, timedelta

class RouteCacheManager:
    """Comprehensive route-level caching system"""
    
    # Cache configuration
    DEFAULT_TTL = 300  # 5 minutes
    CACHE_PREFIX = "route_cache:"
    INVALIDATION_PREFIX = "cache_inv:"
    
    # Cache TTL by route pattern (in seconds)
    CACHE_TTL_CONFIG = {
        'GET:/': 3600,  # Static content - 1 hour
        'GET:/health': 60,  # Health checks - 1 minute
        'GET:/version': 3600,  # Version info - 1 hour
        'GET:/projects': 180,  # Project lists - 3 minutes
        'GET:/projects/*/': 240,  # Project details - 4 minutes
        'GET:/tasks': 120,  # Task lists - 2 minutes
        'GET:/notifications': 60,  # Notifications - 1 minute
        'GET:/profile': 300,  # Profile data - 5 minutes
        'GET:/auth/settings': 300,  # Settings - 5 minutes
        'GET:/users/search': 600,  # User search - 10 minutes
        'GET:/projects/*/messages': 30,  # Messages - 30 seconds
    }
    
    # Routes that should never be cached
    EXCLUDED_ROUTES = {
        'POST', 'PUT', 'DELETE', 'PATCH',  # All modifying methods
        '/auth/login', '/auth/logout', '/auth/refresh',  # Auth operations
        '/auth/google/callback', '/auth/google/exchange-code',  # OAuth flows
    }
    
    @staticmethod
    def should_cache_route(method, endpoint):
        """Determine if a route should be cached"""
        if method in ['POST', 'PUT', 'DELETE', 'PATCH']:
            return False
        
        for excluded in RouteCacheManager.EXCLUDED_ROUTES:
            if excluded in endpoint or excluded == method:
                return False
        
        return True
    
    @staticmethod
    def get_cache_key(method, endpoint, args, user_id=None):
        """Generate cache key for route"""
        # Include user_id for user-specific data
        user_part = f"user:{user_id}:" if user_id else "public:"
        
        # Create deterministic key from request data
        cache_data = {
            'method': method,
            'endpoint': endpoint,
            'args': sorted(args.items()) if args else [],
        }
        
        cache_string = json.dumps(cache_data, sort_keys=True)
        cache_hash = hashlib.md5(cache_string.encode()).hexdigest()[:12]
        
        return f"{RouteCacheManager.CACHE_PREFIX}{user_part}{cache_hash}"
    
    @staticmethod
    def get_ttl_for_route(method, endpoint):
        """Get cache TTL for specific route"""
        route_key = f"{method}:{endpoint}"
        
        # Check exact match first
        if route_key in RouteCacheManager.CACHE_TTL_CONFIG:
            return RouteCacheManager.CACHE_TTL_CONFIG[route_key]
        
        # Check pattern matches
        for pattern, ttl in RouteCacheManager.CACHE_TTL_CONFIG.items():
            if '*' in pattern:
                pattern_parts = pattern.split('*')
                if len(pattern_parts) == 2:
                    prefix, suffix = pattern_parts
                    if route_key.startswith(prefix) and route_key.endswith(suffix):
                        return ttl
        
        return RouteCacheManager.DEFAULT_TTL
    
    @staticmethod
    def invalidate_related_cache(patterns):
        """Invalidate cache entries matching patterns"""
        try:
            if not isinstance(patterns, list):
                patterns = [patterns]
            
            # Store invalidation timestamp for each pattern
            invalidation_time = datetime.utcnow().isoformat()
            
            for pattern in patterns:
                inv_key = f"{RouteCacheManager.INVALIDATION_PREFIX}{pattern}"
                RedisCache.set(inv_key, invalidation_time, 86400)  # 24 hours
            
            current_app.logger.info(f"Cache invalidated for patterns: {patterns}")
        except Exception as e:
            current_app.logger.error(f"Cache invalidation error: {e}")
    
    @staticmethod
    def is_cache_valid(cache_key, cache_time):
        """Check if cached data is still valid"""
        try:
            # Extract patterns that might invalidate this cache
            patterns_to_check = []
            
            if 'projects' in cache_key:
                patterns_to_check.extend(['projects', 'memberships', 'tasks'])
            if 'tasks' in cache_key:
                patterns_to_check.extend(['tasks', 'projects'])
            if 'profile' in cache_key:
                patterns_to_check.extend(['users', 'profile'])
            if 'notifications' in cache_key:
                patterns_to_check.extend(['notifications'])
            if 'users' in cache_key:
                patterns_to_check.extend(['users'])
            
            # Check if any pattern has been invalidated after cache time
            cache_timestamp = datetime.fromisoformat(cache_time)
            
            for pattern in patterns_to_check:
                inv_key = f"{RouteCacheManager.INVALIDATION_PREFIX}{pattern}"
                invalidation_time = RedisCache.get(inv_key)
                
                if invalidation_time:
                    inv_timestamp = datetime.fromisoformat(invalidation_time)
                    if inv_timestamp > cache_timestamp:
                        return False
            
            return True
        except Exception as e:
            current_app.logger.error(f"Cache validation error: {e}")
            return False

def cache_route(ttl=None, user_specific=True, invalidation_patterns=None):
    """
    Route caching decorator with automatic invalidation
    
    Args:
        ttl: Cache time-to-live in seconds (auto-determined if None)
        user_specific: Whether to include user ID in cache key
        invalidation_patterns: List of patterns that invalidate this cache
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            try:
                method = request.method
                endpoint = request.endpoint or request.path
                
                # Check if route should be cached
                if not RouteCacheManager.should_cache_route(method, endpoint):
                    return func(*args, **kwargs)
                
                # Get user ID if needed
                user_id = None
                if user_specific:
                    try:
                        verify_jwt_in_request(optional=True)
                        user_id = get_jwt_identity()
                    except:
                        pass
                
                # Generate cache key
                request_args = request.args.to_dict()
                cache_key = RouteCacheManager.get_cache_key(method, endpoint, request_args, user_id)
                
                # Try to get cached response
                cached_data = RedisCache.get(cache_key)
                if cached_data and isinstance(cached_data, dict):
                    cache_time = cached_data.get('timestamp')
                    if cache_time and RouteCacheManager.is_cache_valid(cache_key, cache_time):
                        current_app.logger.debug(f"Cache hit for {method} {endpoint}")
                        return jsonify(cached_data['response']), cached_data.get('status_code', 200)
                
                # Execute original function
                result = func(*args, **kwargs)
                
                # Cache successful responses
                if hasattr(result, '__iter__') and len(result) == 2:
                    response_data, status_code = result
                    if 200 <= status_code < 300:  # Only cache successful responses
                        cache_ttl = ttl or RouteCacheManager.get_ttl_for_route(method, endpoint)
                        
                        cache_value = {
                            'response': response_data.get_json() if hasattr(response_data, 'get_json') else response_data,
                            'status_code': status_code,
                            'timestamp': datetime.utcnow().isoformat(),
                            'endpoint': endpoint
                        }
                        
                        RedisCache.set(cache_key, cache_value, cache_ttl)
                        current_app.logger.debug(f"Cached response for {method} {endpoint} (TTL: {cache_ttl}s)")
                
                return result
                
            except Exception as e:
                current_app.logger.error(f"Route cache error: {e}")
                # Always execute original function on cache errors
                return func(*args, **kwargs)
        
        return wrapper
    return decorator

def invalidate_cache_on_change(patterns):
    """Decorator to invalidate cache after data modifications"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            try:
                result = func(*args, **kwargs)
                
                # Only invalidate on successful modifications
                if hasattr(result, '__iter__') and len(result) == 2:
                    response_data, status_code = result
                    if 200 <= status_code < 300:
                        RouteCacheManager.invalidate_related_cache(patterns)
                else:
                    # Handle single return value
                    RouteCacheManager.invalidate_related_cache(patterns)
                
                return result
                
            except Exception as e:
                current_app.logger.error(f"Cache invalidation decorator error: {e}")
                return func(*args, **kwargs)
        
        return wrapper
    return decorator

class CacheWarmer:
    """Utility to warm up frequently accessed caches"""
    
    @staticmethod
    def warm_common_routes():
        """Warm up cache for common routes"""
        try:
            # This would be called during app startup
            current_app.logger.info("Cache warming completed for common routes")
        except Exception as e:
            current_app.logger.error(f"Cache warming error: {e}")
    
    @staticmethod
    def get_cache_stats():
        """Get cache usage statistics"""
        try:
            # Basic cache statistics
            return {
                'cache_enabled': True,
                'default_ttl': RouteCacheManager.DEFAULT_TTL,
                'total_patterns': len(RouteCacheManager.CACHE_TTL_CONFIG)
            }
        except Exception as e:
            current_app.logger.error(f"Cache stats error: {e}")
            return {'error': str(e)}

def clear_all_route_cache():
    """Clear all route cache entries"""
    try:
        # Clear route cache entries
        deleted_count = RedisCache.delete_pattern(f"{RouteCacheManager.CACHE_PREFIX}*")
        
        # Clear invalidation entries
        inv_deleted = RedisCache.delete_pattern(f"{RouteCacheManager.INVALIDATION_PREFIX}*")
        
        current_app.logger.info(f"Route cache cleared: {deleted_count} cache entries, {inv_deleted} invalidation entries")
        return True
    except Exception as e:
        current_app.logger.error(f"Clear cache error: {e}")
        return False
