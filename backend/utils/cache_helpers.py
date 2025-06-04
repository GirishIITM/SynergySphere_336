from utils.redis_utils import RedisCache
from models import User
from extensions import db
import hashlib
import json

class UserSearchCache:
    """Memory-efficient caching for user search functionality"""
    CACHE_PREFIX = "user_search:"
    CACHE_EXPIRATION = 300  # 5 minutes (longer for stability)
    ALL_USERS_KEY = "all_users_minimal"
    MAX_CACHE_SIZE = 5000  # Limit to 5k users to prevent memory issues

    @staticmethod
    def get_cache_key(search_query, limit, offset):
        """Generate consistent cache key for frequent searches only"""
        if len(search_query) < 2:  # Don't cache very short queries
            return None
        key_data = f"search:{search_query.lower()}:limit:{limit}:offset:{offset}"
        return f"{UserSearchCache.CACHE_PREFIX}{hashlib.md5(key_data.encode()).hexdigest()[:16]}"  # Shorter hash
    
    @staticmethod
    def cache_all_users():
        """Cache users with size limit and compression"""
        try:
            users = db.session.query(
                User.id,
                User.username,
                User.email, 
                User.full_name
            ).order_by(User.username.asc()).limit(UserSearchCache.MAX_CACHE_SIZE).all()
            
            users_data = []
            for user in users:
                users_data.append({
                    'i': user.id,  # Shorter keys
                    'u': user.username,
                    'e': user.email,
                    'f': user.full_name or user.username,
                    's': f"{user.username} {user.email} {user.full_name or ''}".lower()  # search text
                })
            
            cache_key = f"{UserSearchCache.CACHE_PREFIX}{UserSearchCache.ALL_USERS_KEY}"
            RedisCache.set(cache_key, users_data, UserSearchCache.CACHE_EXPIRATION)
            print(f"Cached {len(users_data)} users ({len(str(users_data))} bytes)")
            return users_data
            
        except Exception as e:
            print(f"Error caching all users: {e}")
            return None
    
    @staticmethod
    def search_cached_users(search_query, limit=10):
        """Search within cached user data with max 10 results"""
        cache_key = f"{UserSearchCache.CACHE_PREFIX}{UserSearchCache.ALL_USERS_KEY}"
        all_users = RedisCache.get(cache_key)
        
        if all_users is None:
            all_users = UserSearchCache.cache_all_users()
            if all_users is None:
                return None
        
        max_results = min(limit, 10)
        
        if search_query and len(search_query) >= 2:
            search_lower = search_query.lower()
            filtered_users = [
                user for user in all_users 
                if search_lower in user['s']
            ][:max_results]  # Take only first 10 matches
        else:
            filtered_users = all_users[:max_results]  # First 10 users
        
        result_users = []
        for user in filtered_users:
            result_users.append({
                'id': user['i'],
                'username': user['u'],
                'email': user['e'],
                'full_name': user['f']
            })
        
        return {
            'users': result_users,
            'count': len(result_users)
        }
    
    @staticmethod
    def invalidate_user_cache():
        """Invalidate user search cache when user data changes"""
        try:
            RedisCache.delete(f"{UserSearchCache.CACHE_PREFIX}{UserSearchCache.ALL_USERS_KEY}")
            
            # Also invalidate route-level cache for user-related endpoints
            from utils.route_cache import RouteCacheManager
            RouteCacheManager.invalidate_related_cache(['users', 'profile'])
            
            print("User search cache invalidated")
        except Exception as e:
            print(f"Error invalidating user cache: {e}")
    
    @staticmethod
    def get_cache_stats():
        """Get cache usage statistics"""
        try:
            cache_key = f"{UserSearchCache.CACHE_PREFIX}{UserSearchCache.ALL_USERS_KEY}"
            cached_data = RedisCache.get(cache_key)
            if cached_data:
                return {
                    'cached_users': len(cached_data),
                    'cache_size_estimate': len(str(cached_data)),
                    'cache_exists': True
                }
            return {'cache_exists': False}
        except Exception as e:
            return {'error': str(e)}

class ProjectMemberCache:
    """Cache for project member data"""
    
    @staticmethod
    def get_project_members_key(project_id):
        return f"project_members:{project_id}"
    
    @staticmethod
    def cache_project_members(project_id, members_data):
        """Cache project members"""
        cache_key = ProjectMemberCache.get_project_members_key(project_id)
        RedisCache.set(cache_key, members_data, 600)  # 10 minutes
    
    @staticmethod
    def get_cached_project_members(project_id):
        """Get cached project members"""
        cache_key = ProjectMemberCache.get_project_members_key(project_id)
        return RedisCache.get(cache_key)
    
    @staticmethod
    def invalidate_project_members(project_id):
        """Invalidate project members cache"""
        cache_key = ProjectMemberCache.get_project_members_key(project_id)
        RedisCache.delete(cache_key)

def warm_up_user_cache():
    """Warm up the user cache on application start"""
    try:
        result = UserSearchCache.cache_all_users()
        if result:
            stats = UserSearchCache.get_cache_stats()
            print(f"User search cache warmed up: {stats}")
            
            # Also warm up route cache
            from utils.route_cache import CacheWarmer
            CacheWarmer.warm_common_routes()
        else:
            print("Failed to warm up user cache")
    except Exception as e:
        print(f"Failed to warm up user cache: {e}")
