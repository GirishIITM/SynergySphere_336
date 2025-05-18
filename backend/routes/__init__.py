from flask import Blueprint


auth_bp = Blueprint('auth', __name__)

# Import routes to register them with the blueprint
from routes.auth import *  # This registers all the routes with auth_bp
