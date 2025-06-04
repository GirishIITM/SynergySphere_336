from datetime import datetime
from models import Project, User, Membership, Task
from extensions import db
from utils.datetime_utils import ensure_utc
import cloudinary.uploader


class ProjectService:
    @staticmethod
    def create_project(user_id, data, member_emails, member_permissions, image_file):
        """Create a new project with members and image"""
        name = data.get('name').strip()
        if not name:
            raise ValueError('Project name is required')
        
        description = data.get('description', '').strip()
        
        # Handle deadline with time
        deadline = None
        if 'deadline' in data and data['deadline']:
            try:
                date_str = data['deadline']
                if 'T' not in date_str:
                    # If only date is provided, add time
                    date_str += 'T23:59:59'
                if not date_str.endswith('Z') and '+' not in date_str and '-' not in date_str[-6:]:
                    # If no timezone info, assume local time
                    date_str += 'Z'
                parsed_date = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
                deadline = ensure_utc(parsed_date)
            except ValueError:
                raise ValueError('Invalid deadline format. Use ISO format with timezone.')
        
        # Handle image upload
        project_image_url = "https://cdn-icons-png.flaticon.com/512/1087/1087927.png"
        if image_file:
            try:
                upload_result = cloudinary.uploader.upload(image_file)
                project_image_url = upload_result.get('secure_url')
            except Exception as e:
                print(f"Image upload error: {e}")
                # Continue with default image
        
        # Create project
        project = Project(
            name=name,
            description=description,
            deadline=deadline,
            owner_id=user_id,
            project_image=project_image_url
        )
        db.session.add(project)
        db.session.flush()  # Get project ID
        
        # Add owner as member with editor permissions
        owner_membership = Membership(
            user_id=user_id,
            project_id=project.id,
            is_editor=True
        )
        db.session.add(owner_membership)
        
        # Add other members
        added_members = []
        invalid_emails = []
        
        for email in member_emails:
            user = User.query.filter_by(email=email).first()
            if user and user.id != user_id:
                is_editor = member_permissions.get(email, False)
                membership = Membership(
                    user_id=user.id,
                    project_id=project.id,
                    is_editor=is_editor
                )
                db.session.add(membership)
                added_members.append({
                    'email': email,
                    'name': user.full_name,
                    'is_editor': is_editor
                })
            elif email not in [user.email for user in User.query.all()]:
                invalid_emails.append(email)
        
        db.session.commit()
        return project, added_members, invalid_emails
    
    @staticmethod
    def update_project(project_id, user_id, data):
        """Update project details"""
        if not data:
            raise ValueError('No data provided')
        
        project = Project.query.get_or_404(project_id)
        
        # Check permissions
        user_membership = Membership.query.filter_by(
            user_id=user_id, 
            project_id=project_id
        ).first()
        
        if not user_membership or (project.owner_id != user_id and not user_membership.is_editor):
            raise PermissionError('Not authorized to update this project')
        
        # Update fields
        if 'name' in data:
            name = data['name'].strip()
            if not name:
                raise ValueError('Project name cannot be empty')
            project.name = name
        
        if 'description' in data:
            project.description = data['description'].strip()
        
        if 'deadline' in data:
            if data['deadline']:
                try:
                    date_str = data['deadline']
                    if 'T' not in date_str:
                        # If only date is provided, add time
                        date_str += 'T23:59:59'
                    if not date_str.endswith('Z') and '+' not in date_str and '-' not in date_str[-6:]:
                        # If no timezone info, assume local time
                        date_str += 'Z'
                    parsed_date = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
                    project.deadline = ensure_utc(parsed_date)
                except ValueError:
                    raise ValueError('Invalid deadline format. Use ISO format with timezone.')
            else:
                project.deadline = None
        
        db.session.commit()
        return ProjectService.format_project_data(project, user_id)
    
    @staticmethod
    def get_project_list(user_id, search, owner_filter, member_filter, status, limit, offset):
        """Get filtered project list"""
        # Base query for projects user is a member of
        query = Project.query.join(Membership).filter(Membership.user_id == user_id)
        
        # Apply filters
        if search:
            query = query.filter(Project.name.ilike(f'%{search}%'))
        
        if owner_filter == 'me':
            query = query.filter(Project.owner_id == user_id)
        
        # Get total count
        total_count = query.count()
        
        # Apply pagination
        projects = query.offset(offset).limit(limit).all()
        
        return projects, total_count
    
    @staticmethod
    def get_project_details(project_id, user_id):
        """Get detailed project information"""
        project = Project.query.get_or_404(project_id)
        
        # Check if user is a member
        user_membership = Membership.query.filter_by(
            user_id=user_id, 
            project_id=project_id
        ).first()
        
        if not user_membership:
            raise PermissionError('Not a member of this project')
        
        return ProjectService.format_project_data(project, user_id)
    
    @staticmethod
    def format_project_data(project, user_id):
        """Format project data for API response"""
        # Get user's membership info
        user_membership = Membership.query.filter_by(
            user_id=user_id, 
            project_id=project.id
        ).first()
        
        # Get task statistics
        total_tasks = Task.query.filter_by(project_id=project.id).count()
        completed_tasks = Task.query.filter_by(
            project_id=project.id, 
            status='completed'
        ).count()
        
        # Get members with their roles
        members = []
        memberships = Membership.query.filter_by(project_id=project.id).all()
        for membership in memberships:
            user = User.query.get(membership.user_id)
            if user:
                members.append({
                    'id': user.id,
                    'full_name': user.full_name,
                    'email': user.email,
                    'profile_picture': getattr(user, 'profile_picture', None),
                    'is_owner': project.owner_id == user.id,
                    'isEditor': membership.is_editor
                })
        
        # Determine project status
        status = 'active'
        if project.deadline and datetime.utcnow() > project.deadline:
            if completed_tasks == total_tasks and total_tasks > 0:
                status = 'completed'
            else:
                status = 'overdue'
        elif completed_tasks == total_tasks and total_tasks > 0:
            status = 'completed'
        
        return {
            'id': project.id,
            'name': project.name,
            'description': project.description,
            'deadline': project.deadline.isoformat() if project.deadline else None,
            'project_image': project.project_image,
            'created_at': project.created_at.isoformat() if project.created_at else None,
            'updated_at': project.updated_at.isoformat() if project.updated_at else None,
            'is_owner': project.owner_id == user_id,
            'user_can_edit': user_membership.is_editor if user_membership else False,
            'status': status,
            'task_stats': {
                'total': total_tasks,
                'completed': completed_tasks
            },
            'members': members,
            'member_count': len(members)
        }
    
    @staticmethod
    def delete_project(project_id, user_id):
        """Delete a project (owner only)"""
        project = Project.query.get_or_404(project_id)
        
        if project.owner_id != user_id:
            raise PermissionError('Only project owner can delete project')
        
        # Delete associated data
        Membership.query.filter_by(project_id=project_id).delete()
        Task.query.filter_by(project_id=project_id).delete()
        
        db.session.delete(project)
        db.session.commit()
