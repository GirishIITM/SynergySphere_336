from models import Project, User, Notification, Task, Budget
from extensions import db
from utils.email import send_email
from utils.cloudinary_upload import upload_project_image, validate_image_file
from datetime import datetime, timezone
from sqlalchemy import case, and_, or_

class ProjectService:
    @staticmethod
    def get_project_by_id(project_id):
        """Get project by ID"""
        return Project.query.get(project_id)
    
    @staticmethod
    def get_project_by_id_or_404(project_id):
        """Get project by ID or raise 404"""
        return Project.query.get_or_404(project_id)
    
    @staticmethod
    def get_user_by_id(user_id):
        """Get user by ID"""
        return User.query.get(user_id)
    
    @staticmethod
    def get_user_by_email(email):
        """Get user by email"""
        return User.query.filter_by(email=email).first()
    
    @staticmethod
    def get_project_membership(user_id, project_id):
        """Get user's membership in a project"""
        from models.project import Membership
        return Membership.query.filter_by(user_id=user_id, project_id=project_id).first()
    
    @staticmethod
    def get_project_members(project_id):
        """Get all members of a project"""
        from models.project import Membership
        return Membership.query.filter_by(project_id=project_id).all()
    
    @staticmethod
    def create_membership(user_id, project_id, is_editor=False):
        """Create a new project membership"""
        from models.project import Membership
        membership = Membership(
            user_id=user_id,
            project_id=project_id,
            is_editor=is_editor
        )
        db.session.add(membership)
        return membership
    
    @staticmethod
    def update_membership_permissions(user_id, project_id, is_editor):
        """Update user's permissions in a project"""
        from models.project import Membership
        membership = Membership.query.filter_by(user_id=user_id, project_id=project_id).first()
        if membership:
            membership.is_editor = is_editor
            db.session.commit()
        return membership
    
    @staticmethod
    def remove_member_from_project(user_id, project_id):
        """Remove a member from a project"""
        from models.project import Membership
        membership = Membership.query.filter_by(user_id=user_id, project_id=project_id).first()
        if membership:
            db.session.delete(membership)
            db.session.commit()
        return membership
    
    @staticmethod
    def get_project_budget(project_id):
        """Get project budget"""
        return Budget.query.filter_by(project_id=project_id).first()
    
    @staticmethod
    def create_project_budget(project_id, allocated_amount, currency='INR'):
        """Create project budget"""
        budget = Budget(
            project_id=project_id,
            allocated_amount=allocated_amount,
            currency=currency
        )
        db.session.add(budget)
        return budget
    
    @staticmethod
    def update_project_budget(project_id, allocated_amount=None, spent_amount=None):
        """Update project budget"""
        budget = ProjectService.get_project_budget(project_id)
        if budget:
            if allocated_amount is not None:
                budget.allocated_amount = allocated_amount
            if spent_amount is not None:
                budget.spent_amount = spent_amount
            db.session.commit()
        return budget
    
    @staticmethod
    def get_project_tasks_stats(project_id):
        """Get project task statistics"""
        return db.session.query(
            db.func.count().label('total'),
            db.func.sum(case((Task.status == 'completed', 1), else_=0)).label('completed')
        ).filter(Task.project_id == project_id).first()
    
    @staticmethod
    def get_projects_by_user(user_id):
        """Get all projects where user is a member"""
        from models.project import Membership
        return db.session.query(Project).join(Membership).filter(
            Membership.user_id == user_id
        ).all()
    
    @staticmethod
    def search_projects(user_id, search_term):
        """Search projects by name or description"""
        from models.project import Membership
        search_pattern = f"%{search_term}%"
        return db.session.query(Project).join(Membership).filter(
            and_(
                Membership.user_id == user_id,
                or_(
                    Project.name.ilike(search_pattern),
                    Project.description.ilike(search_pattern)
                )
            )
        ).all()
    
    @staticmethod
    def get_overdue_projects(user_id):
        """Get overdue projects for a user"""
        from models.project import Membership
        current_time = datetime.now(timezone.utc)
        return db.session.query(Project).join(Membership).filter(
            and_(
                Membership.user_id == user_id,
                Project.deadline.isnot(None),
                db.func.coalesce(
                    db.func.timezone('UTC', Project.deadline),
                    Project.deadline
                ) < current_time
            )
        ).all()
    
    @staticmethod
    def get_active_projects(user_id):
        """Get active projects for a user"""
        from models.project import Membership
        current_time = datetime.now(timezone.utc)
        return db.session.query(Project).join(Membership).filter(
            and_(
                Membership.user_id == user_id,
                or_(
                    Project.deadline.is_(None),
                    db.func.coalesce(
                        db.func.timezone('UTC', Project.deadline),
                        Project.deadline
                    ) >= current_time
                )
            )
        ).all()
    
    @staticmethod
    def get_owned_projects(user_id):
        """Get projects owned by user"""
        return Project.query.filter_by(owner_id=user_id).all()
    
    @staticmethod
    def create_notification(user_id, message):
        """Create a notification for a user"""
        notification = Notification(user_id=user_id, message=message)
        db.session.add(notification)
        return notification
    
    @staticmethod
    def delete_project_notifications(project_name):
        """Delete notifications related to a project"""
        notifications = Notification.query.filter(
            Notification.message.like(f"%project '{project_name}'%")
        ).all()
        for notification in notifications:
            db.session.delete(notification)
    
    @staticmethod
    def delete_project_tasks(project_id):
        """Delete all tasks for a project"""
        Task.query.filter_by(project_id=project_id).delete()
    
    @staticmethod
    def delete_project_memberships(project_id):
        """Delete all memberships for a project"""
        from models.project import Membership
        Membership.query.filter_by(project_id=project_id).delete()
    
    @staticmethod
    def delete_project_budget(project_id):
        """Delete project budget"""
        budget = ProjectService.get_project_budget(project_id)
        if budget:
            db.session.delete(budget)
    
    @staticmethod
    def get_projects_with_pagination(query, limit, offset):
        """Apply pagination to project query"""
        total_count = query.count()
        projects = query.order_by(Project.created_at.desc()).offset(offset).limit(limit).all()
        return projects, total_count
    
    @staticmethod
    def commit_changes():
        """Commit database changes"""
        db.session.commit()
    
    @staticmethod
    def rollback_changes():
        """Rollback database changes"""
        db.session.rollback()

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
        
        # Create budget if budget amount is provided
        if data.get('budget'):
            try:
                budget_amount = float(data['budget'])
                if budget_amount > 0:
                    ProjectService.create_project_budget(project.id, budget_amount)
            except (ValueError, TypeError):
                raise ValueError('Budget must be a valid positive number')
        
        # Create owner membership
        ProjectService.create_membership(user_id, project.id, is_editor=True)
        
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
        
        ProjectService.commit_changes()
        
        # Schedule deadline reminders if project has a deadline
        if deadline:
            try:
                from services.deadline_service import DeadlineService
                DeadlineService.schedule_project_reminders(project.id)
            except Exception as e:
                print(f"Warning: Failed to schedule project reminders: {e}")
        
        ProjectService._send_member_notifications(project, added_members)
        
        return project, added_members, invalid_emails
    
    @staticmethod
    def _add_project_members(project, owner_id, member_emails, member_permissions):
        """Add members to project during creation"""
        invalid_emails = []
        added_members = []
        
        owner = ProjectService.get_user_by_id(owner_id)
        
        for email in member_emails:
            if email == owner.email: 
                continue
                
            member = ProjectService.get_user_by_email(email)
            if member:
                existing_membership = ProjectService.get_project_membership(member.id, project.id)
                
                if not existing_membership:
                    has_edit_access = member_permissions.get(email, False)
                    
                    ProjectService.create_membership(member.id, project.id, has_edit_access)
                    
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
            member = ProjectService.get_user_by_id(member_info['id'])
            edit_status = "with edit access" if member_info['isEditor'] else "with view access"
            message = f"You have been added to project '{project.name}' {edit_status}"
            ProjectService.create_notification(member.id, message)
            if getattr(member, 'notify_email', True):
                send_email("Added to Project", [member.email], "", message)
        
        ProjectService.commit_changes()
    
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
        
        return ProjectService.get_projects_with_pagination(query, limit, offset)
    
    @staticmethod
    def format_project_data(project, user_id):
        """Format project data for API response"""
        user_membership = ProjectService.get_project_membership(user_id, project.id)
        
        members = []
        for membership in ProjectService.get_project_members(project.id):
            member = ProjectService.get_user_by_id(membership.user_id)
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
        
        task_stats = ProjectService.get_project_tasks_stats(project.id)
        
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
        project = ProjectService.get_project_by_id_or_404(project_id)
        
        user_membership = ProjectService.get_project_membership(user_id, project_id)
        
        if not user_membership:
            raise PermissionError('Not a member of this project')
        
        members = []
        for membership in ProjectService.get_project_members(project_id):
            member = ProjectService.get_user_by_id(membership.user_id)
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
        project = ProjectService.get_project_by_id_or_404(project_id)
        if project.owner_id != user_id:
            raise PermissionError('Only owner can delete project')
        
        # Delete related data in proper order to avoid constraint violations
        ProjectService.delete_project_tasks(project_id)
        ProjectService.delete_project_memberships(project_id)
        ProjectService.delete_project_budget(project_id)
        ProjectService.delete_project_notifications(project.name)
        
        # Finally delete the project
        db.session.delete(project)
        ProjectService.commit_changes()
        return True
    
    @staticmethod
    def update_project(project_id, user_id, data):
        """Update project details (owner or editor only)"""
        project = ProjectService.get_project_by_id_or_404(project_id)
        
        user_membership = ProjectService.get_project_membership(user_id, project_id)
        
        if not user_membership:
            raise PermissionError('Not a member of this project')
        
        if project.owner_id != user_id and not user_membership.is_editor:
            raise PermissionError('Only owner or editors can update project')
        
        if not data:
            raise ValueError('No data provided for update')
        
        deadline_changed = False
        old_deadline = project.deadline
        
        if 'name' in data:
            if not data['name'].strip():
                raise ValueError('Project name cannot be empty')
            project.name = data['name'].strip()
        
        if 'description' in data:
            project.description = data.get('description')
        
        if 'deadline' in data:
            if data['deadline']:
                try:
                    new_deadline = datetime.fromisoformat(data['deadline'].replace('Z', '+00:00'))
                    if project.deadline != new_deadline:
                        deadline_changed = True
                        project.deadline = new_deadline
                except ValueError:
                    raise ValueError('Invalid deadline format. Use ISO format')
            else:
                if project.deadline is not None:
                    deadline_changed = True
                project.deadline = None
        
        ProjectService.commit_changes()
        
        # Handle deadline reminders if deadline changed
        if deadline_changed:
            try:
                from services.deadline_service import DeadlineService
                if project.deadline:
                    # Reschedule reminders for new deadline
                    DeadlineService.reschedule_project_reminders(project.id)
                    
                    # Send project update notification to members
                    from tasks.notification_tasks import send_project_update_notification
                    send_project_update_notification.delay(project.id, 'deadline_changed')
                else:
                    # Cancel reminders if deadline was removed
                    DeadlineService.cancel_project_reminders(project.id)
                    
            except Exception as e:
                print(f"Warning: Failed to update project reminders: {e}")
        
        return ProjectService.format_project_data(project, user_id)
