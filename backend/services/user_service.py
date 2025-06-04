from models import User
from extensions import db

class UserService:
    @staticmethod
    def search_users(search_query='', limit=20, offset=0):
        """Search users for member auto-completion"""
        query = db.session.query(
            User.id,
            User.username, 
            User.email,
            User.full_name,
            User.profile_picture
        )
        
        if search_query:
            search_pattern = f"%{search_query.strip().lower()}%"
            query = query.filter(
                db.or_(
                    User.username.ilike(search_pattern),
                    User.email.ilike(search_pattern),
                    User.full_name.ilike(search_pattern)
                )
            )
        
        query = query.order_by(User.username.asc())
        
        total_count = None
        if offset == 0:  # Only calculate on first page
            total_count = query.count()
        
        users = query.offset(offset).limit(limit).all()
        
        users_data = []
        for user in users:
            users_data.append({
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'full_name': user.full_name or user.username,
                'profile_picture': user.profile_picture
            })
        
        return {
            'users': users_data,
            'has_more': len(users_data) == limit,
            'total_count': total_count
        }
