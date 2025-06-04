from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from utils.route_cache import CacheWarmer, clear_all_route_cache, RouteCacheManager
from models import User

cache_bp = Blueprint('cache_management', __name__)

@cache_bp.route('/stats', methods=['GET'])
@jwt_required()
def get_cache_stats():
    """Get cache statistics (admin only)"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        
        # Only allow admin users (you might have a different admin check)
        if not user or not getattr(user, 'is_admin', False):
            return jsonify({'msg': 'Admin access required'}), 403
        
        stats = CacheWarmer.get_cache_stats()
        return jsonify(stats), 200
        
    except Exception as e:
        print(f"Cache stats error: {e}")
        return jsonify({'msg': 'Error fetching cache stats'}), 500

@cache_bp.route('/clear', methods=['POST'])
@jwt_required()
def clear_cache():
    """Clear all route cache (admin only)"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        
        # Only allow admin users
        if not user or not getattr(user, 'is_admin', False):
            return jsonify({'msg': 'Admin access required'}), 403
        
        success = clear_all_route_cache()
        if success:
            return jsonify({'msg': 'Cache cleared successfully'}), 200
        else:
            return jsonify({'msg': 'Failed to clear cache'}), 500
        
    except Exception as e:
        print(f"Clear cache error: {e}")
        return jsonify({'msg': 'Error clearing cache'}), 500

@cache_bp.route('/warm', methods=['POST'])
@jwt_required()
def warm_cache():
    """Warm up cache for common routes (admin only)"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        
        # Only allow admin users
        if not user or not getattr(user, 'is_admin', False):
            return jsonify({'msg': 'Admin access required'}), 403
        
        CacheWarmer.warm_common_routes()
        return jsonify({'msg': 'Cache warming initiated'}), 200
        
    except Exception as e:
        print(f"Cache warming error: {e}")
        return jsonify({'msg': 'Error warming cache'}), 500

@cache_bp.route('/invalidate', methods=['POST'])
@jwt_required()
def invalidate_cache():
    """Invalidate cache for specific patterns (admin only)"""
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        
        # Only allow admin users
        if not user or not getattr(user, 'is_admin', False):
            return jsonify({'msg': 'Admin access required'}), 403
        
        data = request.get_json()
        if not data or 'patterns' not in data:
            return jsonify({'msg': 'Patterns required'}), 400
        
        patterns = data['patterns']
        if not isinstance(patterns, list):
            patterns = [patterns]
        
        RouteCacheManager.invalidate_related_cache(patterns)
        return jsonify({'msg': f'Cache invalidated for patterns: {patterns}'}), 200
        
    except Exception as e:
        print(f"Cache invalidation error: {e}")
        return jsonify({'msg': 'Error invalidating cache'}), 500
