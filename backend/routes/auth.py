from flask import request, jsonify
from routes import auth_bp
from auth import register_user, login_user, forgot_password
from models import User
from flask import current_app
import jwt
from models import db
import bcrypt



@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    # check if the user is already registered
    if User.query.filter_by(email=data.get('email')).first():
        return jsonify({"msg": "User already exists"}), 400
    # register the user to database
    email = data.get('email')
    password = data.get('password')
    name = data.get('name')
    db.session.add(User(email=email, password=password, name=name))
    db.session.commit()
    return jsonify({"msg": "User registered successfully"}), 200


    
@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    # check if the user is registered
    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({"msg": "User not found"}), 400
    # check if the password is correct
    if not bcrypt.check_password_hash(user.password, password):
        return jsonify({"msg": "Incorrect password"}), 400
    
    # generate a token for the user
    token = jwt.encode({'email': data.get('email')}, current_app.config['SECRET_KEY'], algorithm='HS256')
    
    return jsonify({"msg": "User logged in successfully", "token": token}),200 
    

@auth_bp.route('/forgot-password', methods=['POST'])
def forgot_pwd():
    data = request.get_json()
    email = data.get('email')
    old_password = data.get('old_password')
    new_password = data.get('new_password')
    # check if the user is registered
    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({"msg": "User not found"}), 400
    # check if the old password is correct
    if not bcrypt.check_password_hash(user.password, old_password):
        return jsonify({"msg": "Incorrect old password"}), 400
    # update the password
    user.password = new_password
    db.session.commit()
    return jsonify({"msg": "Password updated successfully"}), 200



@auth_bp.route('/logout', methods=['POST'])
def logout():
    data = request.get_json()
    email = data.get('email')
    # check if the user is registered
    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({"msg": "User not found"}), 400
    # log the user out 
    return jsonify({"msg": "User logged out successfully"}), 200
