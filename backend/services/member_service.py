from models import Project, User, Notification
from extensions import db
from utils.email import send_email

class MemberService:
    @staticmethod
    def add_member_to_project(project_id, user_id, member_email, is_editor=False):
        """Add a member to a project with specified permissions"""
        from models.project import Membership
        
        project = Project.query.get_or_404(project_id)
        
        # Check permissions
        user_membership = Membership.query.filter_by(
            user_id=user_id, 
            project_id=project_id
        ).first()
        
        if not user_membership or (project.owner_id != user_id and not user_membership.is_editor):
            raise PermissionError('Only project owner or editors can add members')
        
        # Find the new member
        new_member = User.query.filter_by(email=member_email).first()
        if not new_member:
            raise ValueError('User not found')
        
        # Check if already a member
        existing_membership = Membership.query.filter_by(
            user_id=new_member.id, 
            project_id=project_id
        ).first()
        
        if existing_membership:
            raise ValueError('User already a member')
        
        # Add membership
        membership = Membership(
            user_id=new_member.id,
            project_id=project_id,
            is_editor=is_editor
        )
        db.session.add(membership)
        db.session.commit()
        
        # Send notification
        MemberService._send_member_added_notification(new_member, project, is_editor)
        
        return {
            'id': new_member.id,
            'username': new_member.username,
            'email': new_member.email,
            'full_name': getattr(new_member, 'full_name', new_member.username),
            'isEditor': is_editor
        }
    
    @staticmethod
    def _send_member_added_notification(member, project, is_editor):
        """Send notification when member is added to project"""
        edit_status = "with edit access" if is_editor else "with view access"
        message = f"You have been added to project '{project.name}' {edit_status}"
        notification = Notification(user_id=member.id, message=message)
        db.session.add(notification)
        
        if getattr(member, 'notify_email', True):
            send_email("Added to Project", [member.email], "", message)
        
        db.session.commit()
