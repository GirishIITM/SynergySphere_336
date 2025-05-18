from flask import Blueprint


auth_bp = Blueprint('auth', __name__)
tasks_events_bp = Blueprint('tasks_events', __name__)


# Import routes to register them with the blueprint
from routes.auth import *  # This registers all the routes with auth_bp
from routes.task_events import *  # This registers all the routes with tasks_events_bp
