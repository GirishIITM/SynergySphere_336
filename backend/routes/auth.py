from flask import request, jsonify, current_app
from routes import auth_bp
from models.user import db, User
import jwt
from datetime import datetime, timedelta

@auth_bp.route('/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        if not data or 'email' not in data or 'password' not in data:
            return jsonify({"msg": "Missing email or password"}), 400
            
        if User.query.filter_by(email=data['email']).first():
            return jsonify({"msg": "User already exists"}), 400
            
        user = User(email=data['email'])
        user.set_password(data['password'])
        db.session.add(user)
        db.session.commit()
        return jsonify({"msg": "User registered successfully"}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": f"Registration failed: {str(e)}"}), 500

@auth_bp.route('/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        if not data or 'email' not in data or 'password' not in data:
            return jsonify({"msg": "Missing email or password"}), 400
            
        user = User.query.filter_by(email=data['email']).first()
        if not user or not user.check_password(data['password']):
            return jsonify({"msg": "Invalid credentials"}), 401
            
        payload = {
            'user_id': user.id,
            'exp': datetime.utcnow() + timedelta(hours=1)
        }
        token = jwt.encode(payload, current_app.config['SECRET_KEY'], algorithm='HS256')
        return jsonify({"token": token})
    except Exception as e:
        return jsonify({"msg": f"Login failed: {str(e)}"}), 500
