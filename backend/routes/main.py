from flask import Blueprint, jsonify
from version import get_version_info
import os
from utils.route_cache import cache_route

main_bp = Blueprint('main', __name__)

@main_bp.route('/', methods=['GET'])
@cache_route(ttl=3600, user_specific=False)  # Cache for 1 hour
def index():
    """Default route that returns app version and basic info."""
    try:
        version_info = get_version_info()
        
        response_data = {
            "message": "SynergySphere API",
            "status": "running",
            "version": version_info.get('version'),
            "build_date": version_info.get('build_date'),
            "environment": version_info.get('environment'),
            "api_endpoints": {
                "auth": "/auth",
                "profile": "/profile",
                "projects": "/projects",
                "tasks": "/tasks",
                "notifications": "/notifications",
                "redis": "/redis"
            }
        }
        
        # Include additional build info if available
        if version_info.get('git_commit'):
            response_data['git_commit'] = version_info.get('git_commit')
        
        if version_info.get('docker_tag'):
            response_data['docker_tag'] = version_info.get('docker_tag')
        
        return jsonify(response_data), 200
        
    except Exception as e:
        return jsonify({
            "message": "SynergySphere API",
            "status": "running",
            "version": "unknown",
            "error": "Could not fetch version info"
        }), 200

@main_bp.route('/health', methods=['GET'])
@cache_route(ttl=60, user_specific=False)  # Cache for 1 minute
def health_check():
    """Health check endpoint."""
    try:
        version_info = get_version_info()
        return jsonify({
            "status": "healthy",
            "version": version_info.get('version'),
            "timestamp": version_info.get('build_date')
        }), 200
    except Exception as e:
        return jsonify({
            "status": "unhealthy",
            "error": str(e)
        }), 500

@main_bp.route('/version', methods=['GET'])
@cache_route(ttl=3600, user_specific=False)  # Cache for 1 hour
def version():
    """Detailed version information endpoint."""
    try:
        version_info = get_version_info()
        return jsonify(version_info), 200
    except Exception as e:
        return jsonify({
            "error": "Could not fetch version information",
            "details": str(e)
        }), 500
