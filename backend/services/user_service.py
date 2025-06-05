from models import User
from extensions import db

class UserService:
    @staticmethod
    def search_users(search_query='', limit=20, offset=0):
        """Search users for member auto-completion"""
        try:
            print(f"UserService.search_users called with query: '{search_query}'")  # Debug log
            
            query = db.session.query(
                User.id,
                User.username, 
                User.email,
                User.full_name,
                User.profile_picture
            )
            
            if search_query and search_query.strip():
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
                print(f"Total users found: {total_count}")  # Debug log
            
            users = query.offset(offset).limit(limit).all()
            print(f"Users retrieved: {len(users)}")  # Debug log
            
            users_data = []
            for user in users:
                user_dict = {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'full_name': user.full_name or user.username,
                    'profile_picture': user.profile_picture
                }
                users_data.append(user_dict)
                print(f"Added user: {user_dict}")  # Debug log
            
            result = {
                'users': users_data,
                'has_more': len(users_data) == limit,
                'total_count': total_count
            }
            
            print(f"Final result: {result}")  # Debug log
            return result
            
        except Exception as e:
            print(f"Error in UserService.search_users: {e}")
            import traceback
            traceback.print_exc()
            return {
                'users': [],
                'has_more': False,
                'total_count': 0
            }
