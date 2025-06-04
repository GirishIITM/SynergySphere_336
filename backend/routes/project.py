from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from utils.route_cache import cache_route, invalidate_cache_on_change
from services.project_service import ProjectService
from services.member_service import MemberService
from services.user_service import UserService

project_bp = Blueprint('project', __name__)

@project_bp.route('/projects', methods=['POST'])
@jwt_required()
@invalidate_cache_on_change(['projects', 'memberships'])
def create_project():
    """Create a new project with optional members and image"""
    user_id = int(get_jwt_identity())
    
    try:
        # Parse form data or JSON
        if request.content_type and 'multipart/form-data' in request.content_type:
            data = request.form.to_dict()
            member_emails = data.get('member_emails', '').split(',') if data.get('member_emails') else []
            member_emails = [email.strip() for email in member_emails if email.strip()]
            member_permissions = {}
            for key, value in data.items():
                if key.startswith('member_permission_'):
                    email = key.replace('member_permission_', '')
                    member_permissions[email] = value.lower() == 'true'
            image_file = request.files.get('project_image')
        else:
            data = request.get_json()
            member_emails = data.get('member_emails', []) if data else []
            member_permissions = data.get('member_permissions', {}) if data else {}
            image_file = None
        
        if not data or 'name' not in data:
            return jsonify({'msg': 'Project name required'}), 400
        
        # Create project using service
        project, added_members, invalid_emails = ProjectService.create_project(
            user_id, data, member_emails, member_permissions, image_file
        )
        
        response = {
            'msg': 'Project created', 
            'project_id': project.id,
            'project_image': project.project_image,
            'added_members': added_members
        }
        
        if invalid_emails:
            response['invalid_emails'] = invalid_emails
            response['warning'] = f"Some emails were not found: {', '.join(invalid_emails)}"
        
        return jsonify(response), 201
        
    except ValueError as e:
        return jsonify({'msg': str(e)}), 400
    except Exception as e:
        print(f"Create project error: {e}")
        return jsonify({'msg': 'An error occurred while creating project'}), 500

@project_bp.route('/projects', methods=['GET'])
@jwt_required()
@cache_route(ttl=180, user_specific=True)  # Cache for 3 minutes
def list_projects():
    """Get detailed projects list with filtering options"""
    user_id = int(get_jwt_identity())
    
    # Parse query parameters
    search = request.args.get('search', '').strip()
    owner_filter = request.args.get('owner')
    member_filter = request.args.get('member')
    status = request.args.get('status')
    limit = min(int(request.args.get('limit', 50)), 100)
    offset = int(request.args.get('offset', 0))
    
    try:
        # Get projects using service
        projects, total_count = ProjectService.get_project_list(
            user_id, search, owner_filter, member_filter, status, limit, offset
        )
        
        # Format project data
        projects_data = []
        for project in projects:
            projects_data.append(ProjectService.format_project_data(project, user_id))
        
        return jsonify({
            'projects': projects_data,
            'pagination': {
                'total': total_count,
                'limit': limit,
                'offset': offset,
                'has_more': offset + limit < total_count
            }
        }), 200
        
    except Exception as e:
        print(f"List projects error: {e}")
        return jsonify({'msg': 'An error occurred while fetching projects'}), 500

@project_bp.route('/projects/<int:project_id>', methods=['GET'])
@jwt_required()
@cache_route(ttl=240, user_specific=True)  # Cache for 4 minutes
def get_project(project_id):
    """Get detailed project information"""
    user_id = int(get_jwt_identity())
    
    try:
        project_data = ProjectService.get_project_details(project_id, user_id)
        return jsonify(project_data), 200
        
    except PermissionError as e:
        return jsonify({'msg': str(e)}), 403
    except Exception as e:
        print(f"Get project error: {e}")
        return jsonify({'msg': 'An error occurred while fetching project details'}), 500

@project_bp.route('/projects/<int:project_id>/members', methods=['POST'])
@jwt_required()
@invalidate_cache_on_change(['projects', 'memberships'])
def add_member(project_id):
    """Add member with edit permissions"""
    user_id = int(get_jwt_identity())
    data = request.get_json()
    
    try:
        if not data or 'email' not in data:
            return jsonify({'msg': 'Email required'}), 400
        
        is_editor = data.get('isEditor', False)
        member_data = MemberService.add_member_to_project(
            project_id, user_id, data['email'], is_editor
        )
        
        return jsonify({
            'msg': 'Member added successfully',
            'member': member_data
        }), 200
        
    except PermissionError as e:
        return jsonify({'msg': str(e)}), 403
    except ValueError as e:
        return jsonify({'msg': str(e)}), 400
    except Exception as e:
        print(f"Add member error: {e}")
        return jsonify({'msg': 'An error occurred while adding member'}), 500

@project_bp.route('/users/search', methods=['GET'])
@jwt_required()
@cache_route(ttl=600, user_specific=False)  # Cache for 10 minutes, not user-specific
def search_users():
    """Get users for member auto-completion with optimized queries"""
    try:
        search_query = request.args.get('q', '')
        limit = min(int(request.args.get('limit', 20)), 50)
        offset = int(request.args.get('offset', 0))
        
        result = UserService.search_users(search_query, limit, offset)
        return jsonify(result), 200
        
    except Exception as e:
        print(f"Search users error: {e}")
        return jsonify({'msg': 'An error occurred while searching users'}), 500

@project_bp.route('/projects/<int:project_id>', methods=['DELETE'])
@jwt_required()
@invalidate_cache_on_change(['projects', 'memberships', 'tasks'])
def delete_project(project_id):
    """Delete a project (owner only)"""
    print(f"Delete project request for ID: {project_id}")
    user_id = int(get_jwt_identity())
    
    try:
        ProjectService.delete_project(project_id, user_id)
        return jsonify({'msg': 'Project deleted successfully'}), 200
        
    except PermissionError as e:
        return jsonify({'msg': str(e)}), 403
    except Exception as e:
        print(f"Delete project error: {e}")
        return jsonify({'msg': 'An error occurred while deleting project'}), 500

@project_bp.route('/projects/<int:project_id>', methods=['PUT'])
@jwt_required()
@invalidate_cache_on_change(['projects', 'memberships'])
def update_project(project_id):
    """Update project details (owner or editor only)"""
    user_id = int(get_jwt_identity())
    
    try:
        project_data = ProjectService.update_project(project_id, user_id, request.get_json())
        return jsonify({
            'msg': 'Project updated successfully',
            'project': project_data
        }), 200
        
    except PermissionError as e:
        return jsonify({'msg': str(e)}), 403
    except ValueError as e:
        return jsonify({'msg': str(e)}), 400
    except Exception as e:
        print(f"Update project error: {e}")
        return jsonify({'msg': 'An error occurred while updating project'}), 500