import re
from models import User

def extract_mentions(content):
    """
    Extract @mentions from message content.
    
    Args:
        content (str): Message content to search for mentions
        
    Returns:
        list: List of mentioned usernames
    """
    # First, remove all email addresses to avoid false matches
    email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
    content_no_emails = re.sub(email_pattern, '[EMAIL]', content)
    
    mentions = []
    processed_positions = set()  # Track positions already processed
    
    # Pattern 1: @"Full Name" (quoted full names) - highest priority
    quoted_pattern = r'@"([^"]+)"'
    for match in re.finditer(quoted_pattern, content_no_emails):
        mentions.append(match.group(1).strip())
        # Mark this range as processed
        for pos in range(match.start(), match.end()):
            processed_positions.add(pos)
    
    # Pattern 2: @First Last (two consecutive capitalized words) - second priority
    full_name_pattern = r'@([A-Z][a-zA-Z]*\s+[A-Z][a-zA-Z]*)(?=\W|$)'
    for match in re.finditer(full_name_pattern, content_no_emails):
        # Only add if not already processed by quoted pattern
        if not any(pos in processed_positions for pos in range(match.start(), match.end())):
            mentions.append(match.group(1).strip())
            # Mark this range as processed
            for pos in range(match.start(), match.end()):
                processed_positions.add(pos)
    
    # Pattern 3: @username (alphanumeric + underscore) - lowest priority
    username_pattern = r'@([a-zA-Z0-9_]+)(?=\W|$)'
    for match in re.finditer(username_pattern, content_no_emails):
        # Only add if not already processed by previous patterns
        if not any(pos in processed_positions for pos in range(match.start(), match.end())):
            mentions.append(match.group(1).strip())
    
    # Remove duplicates while preserving order
    seen = set()
    unique_mentions = []
    for mention in mentions:
        if mention and mention not in seen:
            seen.add(mention)
            unique_mentions.append(mention)
    
    return unique_mentions

def get_mentioned_users(content, project_members):
    """
    Get User objects for all mentioned users in a message.
    
    Args:
        content (str): Message content to search for mentions
        project_members (list): List of project member User objects
        
    Returns:
        list: List of mentioned User objects
    """
    mentioned_usernames = extract_mentions(content)
    mentioned_users = []
    
    for mention in mentioned_usernames:
        # Try to find user by username or full name
        for member in project_members:
            if (member.username.lower() == mention.lower() or 
                (member.full_name and member.full_name.lower() == mention.lower())):
                if member not in mentioned_users:
                    mentioned_users.append(member)
                break
    
    return mentioned_users

# Alias for backward compatibility
find_mentioned_users = get_mentioned_users

def create_mention_notifications(message_obj, mentioned_users, sender_user):
    """
    Create notifications for mentioned users.
    
    Args:
        message_obj: Message object that contains the mentions
        mentioned_users (list): List of mentioned User objects
        sender_user: User object who sent the message
        
    Returns:
        list: List of created Notification objects
    """
    from models import Notification
    from extensions import db, socketio
    
    notifications = []
    
    for user in mentioned_users:
        if user.id != sender_user.id:  # Don't notify the sender
            # Create context-aware notification message
            if message_obj.task_id:
                notification_text = f"{sender_user.full_name or sender_user.username} mentioned you in task '{message_obj.task.title}'"
            else:
                notification_text = f"{sender_user.full_name or sender_user.username} mentioned you in project '{message_obj.project.name}'"
            
            notification = Notification(
                user_id=user.id,
                message=notification_text,
                task_id=message_obj.task_id,
                project_id=message_obj.project_id,
                message_id=message_obj.id,
                notification_type='tagged'
            )
            db.session.add(notification)
            notifications.append(notification)
            
            # Emit real-time notification to the tagged user
            try:
                socketio.emit('user_tagged', {
                    'notification_id': notification.id,
                    'message': notification_text,
                    'sender': {
                        'id': sender_user.id,
                        'username': sender_user.username,
                        'full_name': sender_user.full_name
                    },
                    'context': {
                        'task_id': message_obj.task_id,
                        'task_title': message_obj.task.title if message_obj.task_id else None,
                        'project_id': message_obj.project_id,
                        'project_name': message_obj.project.name,
                        'message_id': message_obj.id,
                        'message_content': message_obj.content[:100] + '...' if len(message_obj.content) > 100 else message_obj.content
                    },
                    'timestamp': notification.created_at.isoformat() if notification.created_at else None
                }, room=f'user_{user.id}')
                
                print(f"Emitted user_tagged event to user {user.id}")
            except Exception as e:
                print(f"Error emitting Socket.IO event: {e}")
    
    return notifications