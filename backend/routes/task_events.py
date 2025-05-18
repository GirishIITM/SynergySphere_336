from flask import Blueprint, request, jsonify
from datetime import datetime
from models import db, Task, Event, Project, User

tasks_events_bp = Blueprint('tasks_events', __name__)

# Task Routes
@tasks_events_bp.route('/projects/<int:project_id>/tasks', methods=['GET'])
def get_project_tasks(project_id):
    try:
        project = Project.query.get(project_id)
        if not project:
            return jsonify({'error': 'Project not found'}), 404
        
        tasks = Task.query.filter_by(project_id=project_id).all()
        return jsonify([{
            'id': task.id,
            'project_id': task.project_id,
            'title': task.title,
            'description': task.description,
            'assignee_id': task.assignee_id,
            'due_date': task.due_date.isoformat() if task.due_date else None,
            'status': task.status
        } for task in tasks])
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@tasks_events_bp.route('/projects/<int:project_id>/tasks', methods=['POST'])
def create_project_task(project_id):
    try:
        project = Project.query.get(project_id)
        if not project:
            return jsonify({'error': 'Project not found'}), 404

        data = request.get_json()
        
        # Validate required fields
        if not data.get('title') or not data.get('status'):
            return jsonify({'error': 'Title and status are required'}), 400

        # Validate assignee if provided
        assignee_id = data.get('assignee_id')
        if assignee_id:
            assignee = User.query.get(assignee_id)
            if not assignee:
                return jsonify({'error': 'Assignee not found'}), 400

        # Parse due date if provided
        due_date = None
        if data.get('due_date'):
            try:
                due_date = datetime.fromisoformat(data['due_date']).date()
            except ValueError:
                return jsonify({'error': 'Invalid due date format. Use ISO 8601 format.'}), 400

        task = Task(
            project_id=project_id,
            title=data['title'],
            description=data.get('description'),
            assignee_id=assignee_id,
            due_date=due_date,
            status=data['status']
        )

        db.session.add(task)
        db.session.commit()

        return jsonify({
            'id': task.id,
            'project_id': task.project_id,
            'title': task.title,
            'description': task.description,
            'assignee_id': task.assignee_id,
            'due_date': task.due_date.isoformat() if task.due_date else None,
            'status': task.status
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@tasks_events_bp.route('/tasks/<int:task_id>', methods=['GET'])
def get_task(task_id):
    try:
        task = Task.query.get(task_id)
        if not task:
            return jsonify({'error': 'Task not found'}), 404

        return jsonify({
            'id': task.id,
            'project_id': task.project_id,
            'title': task.title,
            'description': task.description,
            'assignee_id': task.assignee_id,
            'due_date': task.due_date.isoformat() if task.due_date else None,
            'status': task.status
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@tasks_events_bp.route('/tasks/<int:task_id>', methods=['PUT'])
def update_task(task_id):
    try:
        task = Task.query.get(task_id)
        if not task:
            return jsonify({'error': 'Task not found'}), 404

        data = request.get_json()

        # Update fields if provided
        if 'title' in data:
            task.title = data['title']
        if 'description' in data:
            task.description = data['description']
        if 'assignee_id' in data:
            if data['assignee_id']:
                assignee = User.query.get(data['assignee_id'])
                if not assignee:
                    return jsonify({'error': 'Assignee not found'}), 400
            task.assignee_id = data['assignee_id']
        if 'due_date' in data:
            try:
                task.due_date = datetime.fromisoformat(data['due_date']).date() if data['due_date'] else None
            except ValueError:
                return jsonify({'error': 'Invalid due date format. Use ISO 8601 format.'}), 400
        if 'status' in data:
            task.status = data['status']

        db.session.commit()

        return jsonify({
            'id': task.id,
            'project_id': task.project_id,
            'title': task.title,
            'description': task.description,
            'assignee_id': task.assignee_id,
            'due_date': task.due_date.isoformat() if task.due_date else None,
            'status': task.status
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@tasks_events_bp.route('/tasks/<int:task_id>', methods=['DELETE'])
def delete_task(task_id):
    try:
        task = Task.query.get(task_id)
        if not task:
            return jsonify({'error': 'Task not found'}), 404

        db.session.delete(task)
        db.session.commit()

        return jsonify({'message': 'Task deleted successfully'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Event Routes
@tasks_events_bp.route('/projects/<int:project_id>/events', methods=['GET'])
def get_project_events(project_id):
    try:
        project = Project.query.get(project_id)
        if not project:
            return jsonify({'error': 'Project not found'}), 404
        
        events = Event.query.filter_by(project_id=project_id).all()
        return jsonify([{
            'id': event.id,
            'project_id': event.project_id,
            'title': event.title,
            'description': event.description,
            'start_time': event.start_time.isoformat(),
            'end_time': event.end_time.isoformat()
        } for event in events])
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@tasks_events_bp.route('/projects/<int:project_id>/events', methods=['POST'])
def create_project_event(project_id):
    try:
        project = Project.query.get(project_id)
        if not project:
            return jsonify({'error': 'Project not found'}), 404

        data = request.get_json()
        
        # Validate required fields
        required_fields = ['title', 'start_time', 'end_time']
        if not all(field in data for field in required_fields):
            return jsonify({'error': 'Title, start_time, and end_time are required'}), 400

        try:
            start_time = datetime.fromisoformat(data['start_time'])
            end_time = datetime.fromisoformat(data['end_time'])
        except ValueError:
            return jsonify({'error': 'Invalid datetime format. Use ISO 8601 format.'}), 400

        if end_time <= start_time:
            return jsonify({'error': 'End time must be after start time'}), 400

        event = Event(
            project_id=project_id,
            title=data['title'],
            description=data.get('description'),
            start_time=start_time,
            end_time=end_time
        )

        db.session.add(event)
        db.session.commit()

        return jsonify({
            'id': event.id,
            'project_id': event.project_id,
            'title': event.title,
            'description': event.description,
            'start_time': event.start_time.isoformat(),
            'end_time': event.end_time.isoformat()
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@tasks_events_bp.route('/events/<int:event_id>', methods=['GET'])
def get_event(event_id):
    try:
        event = Event.query.get(event_id)
        if not event:
            return jsonify({'error': 'Event not found'}), 404

        return jsonify({
            'id': event.id,
            'project_id': event.project_id,
            'title': event.title,
            'description': event.description,
            'start_time': event.start_time.isoformat(),
            'end_time': event.end_time.isoformat()
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@tasks_events_bp.route('/events/<int:event_id>', methods=['PUT'])
def update_event(event_id):
    try:
        event = Event.query.get(event_id)
        if not event:
            return jsonify({'error': 'Event not found'}), 404

        data = request.get_json()

        # Update fields if provided
        if 'title' in data:
            event.title = data['title']
        if 'description' in data:
            event.description = data['description']
        
        # Handle datetime updates
        start_time = event.start_time
        end_time = event.end_time
        
        if 'start_time' in data:
            try:
                start_time = datetime.fromisoformat(data['start_time'])
            except ValueError:
                return jsonify({'error': 'Invalid start_time format. Use ISO 8601 format.'}), 400
                
        if 'end_time' in data:
            try:
                end_time = datetime.fromisoformat(data['end_time'])
            except ValueError:
                return jsonify({'error': 'Invalid end_time format. Use ISO 8601 format.'}), 400

        if end_time <= start_time:
            return jsonify({'error': 'End time must be after start time'}), 400

        event.start_time = start_time
        event.end_time = end_time

        db.session.commit()

        return jsonify({
            'id': event.id,
            'project_id': event.project_id,
            'title': event.title,
            'description': event.description,
            'start_time': event.start_time.isoformat(),
            'end_time': event.end_time.isoformat()
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@tasks_events_bp.route('/events/<int:event_id>', methods=['DELETE'])
def delete_event(event_id):
    try:
        event = Event.query.get(event_id)
        if not event:
            return jsonify({'error': 'Event not found'}), 404

        db.session.delete(event)
        db.session.commit()

        return jsonify({'message': 'Event deleted successfully'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500