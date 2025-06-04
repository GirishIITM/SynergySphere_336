from models import Project, User, Notification, Task
from extensions import db
from utils.email import send_email
from utils.cloudinary_upload import upload_project_image, validate_image_file
from datetime import datetime, timezone
from sqlalchemy import case

class ProjectService:
    @staticmethod
    def create_project(user_id, data, member_emails=None, member_permissions=None, image_file=None):
        """Create a new project with members and optional image"""
        member_emails = member_emails or []
        member_permissions = member_permissions or {}
        
        deadline = None
        if 'deadline' in data and data['deadline']:
            try:
                deadline = datetime.fromisoformat(data['deadline'].replace('Z', '+00:00'))
            except ValueError:
                raise ValueError('Invalid deadline format. Use ISO format')
        
        project = Project(
            name=data['name'], 
            description=data.get('description'),
            deadline=deadline,
            owner_id=user_id
        )
        
        db.session.add(project)
        db.session.flush()  # Get project ID
        
        from models.project import Membership
        owner_membership = Membership(
            user_id=user_id,
            project_id=project.id,
            is_editor=True  # Owner always has edit access
        )
        db.session.add(owner_membership)
        
        invalid_emails = []
        added_members = []
        
        if member_emails:
            invalid_emails, added_members = ProjectService._add_project_members(
                project, user_id, member_emails, member_permissions
            )
        
        if image_file and image_file.filename != '':
            is_valid, error_message = validate_image_file(image_file)
            if not is_valid:
                raise ValueError(f'Invalid image: {error_message}')
            
            upload_result = upload_project_image(image_file, project.id)
            if upload_result:
                project.project_image = upload_result['secure_url']
        
        db.session.commit()
        
        ProjectService._send_member_notifications(project, added_members)
        
        return project, added_members, invalid_emails
    
    @staticmethod
    def _add_project_members(project, owner_id, member_emails, member_permissions):
        """Add members to project during creation"""
        from models.project import Membership
        
        invalid_emails = []
        added_members = []
        
        owner = User.query.get(owner_id)
        
        for email in member_emails:
            if email == owner.email: 
                continue
                
            member = User.query.filter_by(email=email).first()
            if member:
                existing_membership = Membership.query.filter_by(
                    user_id=member.id, 
                    project_id=project.id
                ).first()
                
                if not existing_membership:
                    has_edit_access = member_permissions.get(email, False)
                    
                    membership = Membership(
                        user_id=member.id,
                        project_id=project.id,
                        is_editor=has_edit_access
                    )
                    db.session.add(membership)
                    
                    added_members.append({
                        'id': member.id,
                        'email': member.email,
                        'username': member.username,
                        'full_name': getattr(member, 'full_name', member.username),
                        'isEditor': has_edit_access
                    })
            else:
                invalid_emails.append(email)
        
        return invalid_emails, added_members
    
    @staticmethod
    def _send_member_notifications(project, added_members):
        """Send notifications to newly added members"""
        for member_info in added_members:
            member = User.query.get(member_info['id'])
            edit_status = "with edit access" if member_info['isEditor'] else "with view access"
            message = f"You have been added to project '{project.name}' {edit_status}"
            notification = Notification(user_id=member.id, message=message)
            db.session.add(notification)
            if getattr(member, 'notify_email', True):
                send_email("Added to Project", [member.email], "", message)
        
        db.session.commit()
    
    @staticmethod
    def get_project_list(user_id, search=None, owner_filter=None, member_filter=None, 
                        status=None, limit=50, offset=0):
        """Get filtered and paginated project list"""
        from models.project import Membership
        
        query = db.session.query(Project).join(Membership).filter(
            Membership.user_id == user_id
        )
        
        if search:
            search_pattern = f"%{search}%"
            query = query.filter(
                db.or_(
                    Project.name.ilike(search_pattern),
                    Project.description.ilike(search_pattern)
                )
            )
        
        if owner_filter == 'me':
            query = query.filter(Project.owner_id == user_id)
        elif member_filter == 'me':
            pass
        
        if status:
            current_time = datetime.now(timezone.utc)
            if status == 'overdue':
                query = query.filter(
                    Project.deadline.isnot(None),
                    db.func.coalesce(
                        db.func.timezone('UTC', Project.deadline),
                        Project.deadline
                    ) < current_time
                )
            elif status == 'active':
                query = query.filter(
                    db.or_(
                        Project.deadline.is_(None),
                        db.func.coalesce(
                            db.func.timezone('UTC', Project.deadline),
                            Project.deadline
                        ) >= current_time
                    )
                )
        
        total_count = query.count()
        projects = query.order_by(Project.created_at.desc()).offset(offset).limit(limit).all()
        
        return projects, total_count
    
    @staticmethod
    def format_project_data(project, user_id):
        """Format project data for API response"""
        from models.project import Membership
        
        user_membership = Membership.query.filter_by(
            user_id=user_id, 
            project_id=project.id
        ).first()
        
        members = []
        for membership in Membership.query.filter_by(project_id=project.id).all():
            member = User.query.get(membership.user_id)
            if member:
                members.append({
                    'id': member.id,
                    'username': member.username,
                    'email': member.email,
                    'full_name': getattr(member, 'full_name', member.username),
                    'profile_picture': member.profile_picture,
                    'isEditor': membership.is_editor,
                    'is_owner': member.id == project.owner_id
                })
        
        task_stats = db.session.query(
            db.func.count().label('total'),
            db.func.sum(case((Task.status == 'completed', 1), else_=0)).label('completed')
        ).filter(Task.project_id == project.id).first()
        
        total_tasks = task_stats.total or 0
        completed_tasks = task_stats.completed or 0
        
        project_status = 'active'
        if project.deadline:
            deadline_aware = project.deadline
            if deadline_aware.tzinfo is None:
                deadline_aware = deadline_aware.replace(tzinfo=timezone.utc)
            
            if deadline_aware < datetime.now(timezone.utc):
                project_status = 'overdue'
            elif total_tasks > 0 and completed_tasks == total_tasks:
                project_status = 'completed'
        
        return {
            'id': project.id,
            'name': project.name,
            'description': project.description,
            'project_image': project.project_image,
            'deadline': project.deadline.isoformat() if project.deadline else None,
            'created_at': project.created_at.isoformat(),
            'is_owner': project.owner_id == user_id,
            'user_can_edit': user_membership.is_editor if user_membership else False,
            'status': project_status,
            'members': members,
            'member_count': len(members),
            'task_stats': {
                'total': total_tasks,
                'completed': completed_tasks,
                'pending': total_tasks - completed_tasks
            },
            'owner': {
                'id': project.owner.id,
                'username': project.owner.username,
                'full_name': getattr(project.owner, 'full_name', project.owner.username),
                'profile_picture': project.owner.profile_picture
            }
        }
    
    @staticmethod
    def get_project_details(project_id, user_id):
        """Get detailed project information"""
        from models.project import Membership
        
        project = Project.query.get_or_404(project_id)
        
        user_membership = Membership.query.filter_by(
            user_id=user_id, 
            project_id=project_id
        ).first()
        
        if not user_membership:
            raise PermissionError('Not a member of this project')
        
        members = []
        for membership in Membership.query.filter_by(project_id=project_id).all():
            member = User.query.get(membership.user_id)
            if member:
                members.append({
                    'id': member.id,
                    'username': member.username,
                    'email': member.email,
                    'full_name': getattr(member, 'full_name', member.username),
                    'profile_picture': member.profile_picture,
                    'isEditor': membership.is_editor,
                    'is_owner': member.id == project.owner_id,
                    'joined_at': membership.id
                })
        
        return {
            'id': project.id,
            'name': project.name,
            'description': project.description,
            'project_image': project.project_image,
            'deadline': project.deadline.isoformat() if project.deadline else None,
            'created_at': project.created_at.isoformat(),
            'is_owner': project.owner_id == user_id,
            'user_can_edit': user_membership.is_editor,
            'members': members,
            'member_count': len(members),
            'owner': {
                'id': project.owner.id,
                'username': project.owner.username,
                'full_name': getattr(project.owner, 'full_name', project.owner.username),
                'profile_picture': project.owner.profile_picture
            }
        }
    
    @staticmethod
    def delete_project(project_id, user_id):
        """Delete a project (owner only)"""
        from models.project import Membership
        
        project = Project.query.get_or_404(project_id)
        if project.owner_id != user_id:
            raise PermissionError('Only owner can delete project')
        
        # Delete related data in proper order to avoid constraint violations
        # First delete tasks
        Task.query.filter_by(project_id=project_id).delete()
        
        # Delete memberships
        Membership.query.filter_by(project_id=project_id).delete()
        
        # Delete notifications related to this project (if any)
        project_notifications = Notification.query.filter(
            Notification.message.like(f"%project '{project.name}'%")
        ).all()
        for notification in project_notifications:
            db.session.delete(notification)
        
        # Finally delete the project
        db.session.delete(project)
        db.session.commit()
        return True
    
    @staticmethod
    def update_project(project_id, user_id, data):
        """Update project details (owner or editor only)"""
        from models.project import Membership
        
        project = Project.query.get_or_404(project_id)
        
        user_membership = Membership.query.filter_by(
            user_id=user_id, 
            project_id=project_id
        ).first()
        
        if not user_membership:
            raise PermissionError('Not a member of this project')
        
        if project.owner_id != user_id and not user_membership.is_editor:
            raise PermissionError('Only owner or editors can update project')
        
        if not data:
            raise ValueError('No data provided for update')
        
        if 'name' in data:
            if not data['name'].strip():
                raise ValueError('Project name cannot be empty')
            project.name = data['name'].strip()
        
        if 'description' in data:
            project.description = data.get('description')
        
        if 'deadline' in data:
            if data['deadline']:
                try:
                    deadline = datetime.fromisoformat(data['deadline'].replace('Z', '+00:00'))
                    project.deadline = deadline
                except ValueError:
                    raise ValueError('Invalid deadline format. Use ISO format')
            else:
                project.deadline = None
        
        db.session.commit()
        
        return ProjectService.format_project_data(project, user_id)
