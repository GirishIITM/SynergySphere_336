from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
import time
from utils.redis_utils import RedisCache
from utils.route_cache import RouteCacheManager, clear_all_route_cache, CacheWarmer
from utils.cache_helpers import UserSearchCache
from extensions import redis_client
from flask import current_app

redis_bp = Blueprint('redis', __name__)

@redis_bp.route('/redis/status', methods=['GET'])
@jwt_required()
def redis_status():
    """Check Redis connection and basic stats"""
    try:
        if not redis_client:
            return jsonify({
                'status': 'disconnected',
                'error': 'Redis client not initialized'
            }), 500
        
        start_time = time.time()
        redis_client.ping()
        ping_time = (time.time() - start_time) * 1000  # Convert to milliseconds
        
        info = redis_client.info()
        
        return jsonify({
            'status': 'connected',
            'ping_time_ms': round(ping_time, 2),
            'redis_version': info.get('redis_version', 'unknown'),
            'memory_used': info.get('used_memory_human', 'unknown'),
            'connected_clients': info.get('connected_clients', 0),
            'total_commands_processed': info.get('total_commands_processed', 0)
        }), 200
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'error': str(e)
        }), 500

@redis_bp.route('/redis/cache/clear', methods=['POST'])
@jwt_required()
def clear_cache():
    """Clear all route cache for testing"""
    try:
        success = clear_all_route_cache()
        
        # Also clear user search cache
        UserSearchCache.invalidate_user_cache()
        
        if success:
            return jsonify({
                'message': 'All cache cleared successfully',
                'cleared_at': time.time()
            }), 200
        else:
            return jsonify({
                'message': 'Cache clear completed with some errors'
            }), 500
            
    except Exception as e:
        return jsonify({
            'error': f'Failed to clear cache: {str(e)}'
        }), 500

@redis_bp.route('/redis/cache/stats', methods=['GET'])
@jwt_required()
def cache_stats():
    """Get detailed cache statistics"""
    try:
        route_stats = CacheWarmer.get_cache_stats()
        user_stats = UserSearchCache.get_cache_stats()
        
        # Count cache entries
        cache_keys = redis_client.keys(f"{RouteCacheManager.CACHE_PREFIX}*") if redis_client else []
        invalidation_keys = redis_client.keys(f"{RouteCacheManager.INVALIDATION_PREFIX}*") if redis_client else []
        
        return jsonify({
            'route_cache': route_stats,
            'user_cache': user_stats,
            'cache_entries': len(cache_keys),
            'invalidation_entries': len(invalidation_keys),
            'sample_cache_keys': cache_keys[:10] if cache_keys else []
        }), 200
        
    except Exception as e:
        return jsonify({
            'error': f'Failed to get cache stats: {str(e)}'
        }), 500

@redis_bp.route('/redis/test/performance', methods=['GET'])
@jwt_required()
def test_performance():
    """Test cache vs no-cache performance"""
    try:
        results = {}
        
        # Test 1: Redis SET/GET performance
        start_time = time.time()
        test_key = "performance_test"
        test_data = {"test": "data", "timestamp": time.time()}
        
        RedisCache.set(test_key, test_data, 60)
        retrieved_data = RedisCache.get(test_key)
        redis_time = (time.time() - start_time) * 1000
        
        results['redis_operations'] = {
            'time_ms': round(redis_time, 3),
            'data_match': retrieved_data == test_data
        }
        
        # Test 2: Database query performance simulation
        from models import User
        start_time = time.time()
        user_count = User.query.count()
        db_time = (time.time() - start_time) * 1000
        
        results['database_query'] = {
            'time_ms': round(db_time, 3),
            'user_count': user_count
        }
        
        # Clean up
        RedisCache.delete(test_key)
        
        return jsonify({
            'performance_test': results,
            'recommendation': 'Cache is beneficial if redis_operations.time_ms << database_query.time_ms'
        }), 200
        
    except Exception as e:
        return jsonify({
            'error': f'Performance test failed: {str(e)}'
        }), 500
