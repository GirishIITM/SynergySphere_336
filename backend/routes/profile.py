from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity

from models import User
from extensions import db
from utils.validation import sanitize_string
from utils.cloudinary_upload import upload_profile_image, delete_cloudinary_image, validate_image_file

profile_bp = Blueprint("profile", __name__)

@profile_bp.route("/profile", methods=["GET"])
@jwt_required()
def get_profile():
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get_or_404(user_id)
        
        return jsonify({
            "id": user.id,
            "full_name": user.full_name,
            "name": user.full_name,
            "username": user.username,
            "email": user.email,
            "about": user.about,
            "profile_picture": user.profile_picture,
            "created_at": user.created_at.isoformat() if user.created_at else None,
            "notify_email": user.notify_email,
            "notify_in_app": user.notify_in_app,
        }), 200
        
    except Exception as e:
        print(f"Get profile error: {e}")
        return jsonify({"msg": "An error occurred while fetching profile"}), 500

@profile_bp.route('/profile/', methods=['PUT'])
@jwt_required()
def update_profile():
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get_or_404(user_id)
        data = request.get_json()
        
        if not data:
            return jsonify({"msg": "No data provided"}), 400
        
        if "full_name" in data:
            full_name = sanitize_string(data["full_name"])
            if len(full_name.strip()) < 1:
                return jsonify({"msg": "Full name cannot be empty"}), 400
            user.full_name = full_name
        
        if "username" in data:
            username = sanitize_string(data["username"])
            if len(username.strip()) < 1:
                return jsonify({"msg": "Username cannot be empty"}), 400
            
            existing_user = User.query.filter(User.username == username, User.id != user_id).first()
            if existing_user:
                return jsonify({"msg": "Username already exists"}), 400
            
            user.username = username
        
        if "about" in data:
            about = sanitize_string(data["about"]) if data["about"] else ""
            user.about = about
        
        if "notify_email" in data:
            user.notify_email = bool(data["notify_email"])
        if "notify_in_app" in data:
            user.notify_in_app = bool(data["notify_in_app"])
        
        # Invalidate user search cache
        from utils.cache_helpers import UserSearchCache
        UserSearchCache.invalidate_user_cache()
        
        db.session.commit()
        
        return jsonify({
            "msg": "Profile updated successfully",
            "user": {
                "id": user.id,
                "full_name": getattr(user, 'full_name', user.username),
                "name": getattr(user, 'full_name', user.username),
                "username": user.username,
                "email": user.email,
                "about": user.about,
                "profile_picture": user.profile_picture,
                "notify_email": user.notify_email,
                "notify_in_app": user.notify_in_app,
                "created_at": user.created_at.isoformat() if user.created_at else None
            }
        }), 200
        
    except Exception as e:
        print(f"Update profile error: {e}")
        db.session.rollback()
        return jsonify({"msg": "An error occurred while updating profile"}), 500

@profile_bp.route("/profile/upload-image", methods=["POST"])
@jwt_required()
def upload_profile_image_endpoint():
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get_or_404(user_id)
        
        if 'profile_image' not in request.files:
            return jsonify({"error": "No image file provided"}), 400
        
        image_file = request.files['profile_image']
        if image_file.filename == '':
            return jsonify({"error": "No image file selected"}), 400
        
        is_valid, error_message = validate_image_file(image_file)
        if not is_valid:
            return jsonify({"error": error_message}), 400
        
        if user.profile_picture and 'cloudinary.com' in user.profile_picture:
            delete_cloudinary_image(user.profile_picture)
        
        upload_result = upload_profile_image(image_file, user_id)
        if not upload_result:
            return jsonify({"error": "Failed to upload image"}), 500
        
        user.profile_picture = upload_result['secure_url']
        db.session.commit()
        
        return jsonify({
            "msg": "Profile image uploaded successfully",
            "profile_picture": user.profile_picture
        }), 200
        
    except Exception as e:
        print(f"Profile image upload error: {e}")
        db.session.rollback()
        return jsonify({"error": "An error occurred while uploading image"}), 500
