from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from services.analytics_service import AnalyticsService

analytics_bp = Blueprint('analytics', __name__)

@analytics_bp.route('/projects/<int:project_id>/stats', methods=['GET'])
@jwt_required()
def get_project_stats(project_id):
    """Get comprehensive project statistics."""
    user_id = int(get_jwt_identity())
    
    try:
        stats = AnalyticsService.get_project_stats(user_id, project_id)
        return jsonify(stats), 200
    except PermissionError as e:
        return jsonify({'msg': str(e)}), 403
    except Exception as e:
        return jsonify({'msg': 'Error fetching project statistics'}), 500

@analytics_bp.route('/users/<int:user_id>/dashboard', methods=['GET'])
@jwt_required()
def get_user_dashboard(user_id):
    """Get user dashboard data with cross-project analytics."""
    current_user_id = int(get_jwt_identity())
    
    # Users can only access their own dashboard
    if current_user_id != user_id:
        return jsonify({'msg': 'Not authorized'}), 403
    
    try:
        dashboard_data = AnalyticsService.get_user_dashboard(user_id)
        return jsonify(dashboard_data), 200
    except Exception as e:
        return jsonify({'msg': 'Error fetching user dashboard'}), 500

@analytics_bp.route('/users/<int:user_id>/productivity', methods=['GET'])
@jwt_required()
def get_user_productivity(user_id):
    """Get productivity metrics for a user."""
    current_user_id = int(get_jwt_identity())
    
    # Users can only access their own productivity metrics
    if current_user_id != user_id:
        return jsonify({'msg': 'Not authorized'}), 403
    
    # Optional project filter
    project_id = request.args.get('project_id', type=int)
    
    try:
        productivity = AnalyticsService.get_productivity_metrics(user_id, project_id)
        return jsonify(productivity), 200
    except Exception as e:
        return jsonify({'msg': 'Error fetching productivity metrics'}), 500

@analytics_bp.route('/projects/<int:project_id>/health', methods=['GET'])
@jwt_required()
def get_project_health(project_id):
    """Get project health metrics."""
    user_id = int(get_jwt_identity())
    
    try:
        health = AnalyticsService.get_project_health(project_id, user_id)
        return jsonify(health), 200
    except PermissionError as e:
        return jsonify({'msg': str(e)}), 403
    except Exception as e:
        return jsonify({'msg': 'Error fetching project health'}), 500

@analytics_bp.route('/projects/<int:project_id>/resources', methods=['GET'])
@jwt_required()
def get_resource_utilization(project_id):
    """Get resource utilization metrics for a project."""
    user_id = int(get_jwt_identity())
    
    try:
        resources = AnalyticsService.get_resource_utilization(project_id, user_id)
        return jsonify(resources), 200
    except PermissionError as e:
        return jsonify({'msg': str(e)}), 403
    except Exception as e:
        return jsonify({'msg': 'Error fetching resource utilization'}), 500 