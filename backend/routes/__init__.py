def register_blueprints(app):
    """Register all blueprints with the Flask app."""
    from .main import main_bp
    from .auth import auth_bp
    from .profile import profile_bp
    from .project import project_bp
    from .task import task_bp
    from .message import message_bp
    from .notification import notification_bp
    from .cache_management import cache_bp
    from .dashboard import dashboard_bp
    from .analytics import analytics_bp
    from .finance import finance_bp
    from .message_advanced import message_advanced_bp
    from .task_advanced import task_advanced_bp
    
    app.register_blueprint(main_bp)
    app.register_blueprint(auth_bp, url_prefix='/auth')
    app.register_blueprint(profile_bp)
    app.register_blueprint(project_bp)
    app.register_blueprint(task_bp)
    app.register_blueprint(message_bp)
    app.register_blueprint(notification_bp)
    app.register_blueprint(cache_bp, url_prefix='/cache')
    app.register_blueprint(dashboard_bp)
    app.register_blueprint(analytics_bp, url_prefix='/analytics')
    app.register_blueprint(finance_bp, url_prefix='/finance')
    app.register_blueprint(message_advanced_bp)
    app.register_blueprint(task_advanced_bp, url_prefix='/task_advanced')