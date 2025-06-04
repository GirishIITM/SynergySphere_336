"""
Unit tests for PriorityService.
"""

import pytest
from datetime import datetime, timedelta
from unittest.mock import Mock, patch
from services.priority_service import PriorityService
from models import Task, Project, User
from utils.datetime_utils import get_utc_now, ensure_utc


class TestPriorityService:
    """Test cases for PriorityService."""
    
    def setup_method(self):
        """Set up test fixtures."""
        self.now = get_utc_now()
        
        # Mock task with basic attributes
        self.mock_task = Mock(spec=Task)
        self.mock_task.id = 1
        self.mock_task.title = "Test Task"
        self.mock_task.estimated_effort = 8
        self.mock_task.subtasks = []
        self.mock_task.parent_task_id = None
        self.mock_task.percent_complete = 0
        self.mock_task.status.value = 'pending'
        
    def test_calculate_urgency_score_no_due_date(self):
        """Test urgency calculation when no due date is set."""
        result = PriorityService.calculate_urgency_score(None)
        assert result == 0.0
        
    def test_calculate_urgency_score_overdue(self):
        """Test urgency calculation for overdue tasks."""
        overdue_date = self.now - timedelta(days=1)
        result = PriorityService.calculate_urgency_score(overdue_date)
        assert result == 10.0
        
    def test_calculate_urgency_score_due_today(self):
        """Test urgency calculation for tasks due today."""
        due_today = self.now + timedelta(hours=12)
        result = PriorityService.calculate_urgency_score(due_today)
        assert result == 9.0
        
    def test_calculate_urgency_score_due_in_week(self):
        """Test urgency calculation for tasks due in a week."""
        due_in_week = self.now + timedelta(days=7)
        result = PriorityService.calculate_urgency_score(due_in_week)
        assert result == 5.0
        
    def test_calculate_urgency_score_due_far_future(self):
        """Test urgency calculation for tasks due far in future."""
        due_far_future = self.now + timedelta(days=60)
        result = PriorityService.calculate_urgency_score(due_far_future)
        assert result == 0.5
        
    def test_calculate_effort_score_no_effort(self):
        """Test effort calculation with no effort estimate."""
        result = PriorityService.calculate_effort_score(0)
        assert result == 0.0
        
    def test_calculate_effort_score_small_effort(self):
        """Test effort calculation with small effort estimate."""
        result = PriorityService.calculate_effort_score(2)
        assert result == 0.0
        
    def test_calculate_effort_score_medium_effort(self):
        """Test effort calculation with medium effort estimate."""
        result = PriorityService.calculate_effort_score(8)
        assert result == -0.5
        
    def test_calculate_effort_score_large_effort(self):
        """Test effort calculation with large effort estimate."""
        result = PriorityService.calculate_effort_score(30)
        assert result == -2.0
        
    def test_calculate_dependency_score_no_dependencies(self):
        """Test dependency calculation with no subtasks."""
        self.mock_task.subtasks = []
        self.mock_task.parent_task_id = None
        result = PriorityService.calculate_dependency_score(self.mock_task)
        assert result == 0.0
        
    def test_calculate_dependency_score_with_subtasks(self):
        """Test dependency calculation with subtasks."""
        self.mock_task.subtasks = [Mock(), Mock(), Mock()]  # 3 subtasks
        result = PriorityService.calculate_dependency_score(self.mock_task)
        assert result == 4.5  # 3 * 1.5
        
    def test_calculate_dependency_score_is_subtask(self):
        """Test dependency calculation for subtasks."""
        self.mock_task.parent_task_id = 5
        result = PriorityService.calculate_dependency_score(self.mock_task)
        assert result == -0.5
        
    def test_calculate_status_modifier_pending(self):
        """Test status modifier for pending tasks."""
        result = PriorityService.calculate_status_modifier('pending')
        assert result == 0.0
        
    def test_calculate_status_modifier_in_progress(self):
        """Test status modifier for in-progress tasks."""
        result = PriorityService.calculate_status_modifier('in_progress')
        assert result == 2.0
        
    def test_calculate_status_modifier_completed(self):
        """Test status modifier for completed tasks."""
        result = PriorityService.calculate_status_modifier('completed')
        assert result == -10.0
        
    @patch('services.priority_service.get_utc_now')
    def test_compute_priority_score(self, mock_get_utc_now):
        """Test overall priority score computation."""
        mock_get_utc_now.return_value = self.now
        
        # Set up task with specific attributes
        self.mock_task.due_date = self.now + timedelta(days=3)
        self.mock_task.estimated_effort = 4
        self.mock_task.subtasks = []
        self.mock_task.parent_task_id = None
        self.mock_task.status.value = 'pending'
        self.mock_task.percent_complete = 0
        
        result = PriorityService.compute_priority_score(self.mock_task)
        
        # Expected: urgency (7.0) + effort (0.0) + dependency (0.0) + status (0.0) = 7.0
        assert result == 7.0
        
    def test_compute_priority_score_negative_becomes_zero(self):
        """Test that negative priority scores become zero."""
        # Set up task that would have negative score
        self.mock_task.due_date = None  # No urgency
        self.mock_task.estimated_effort = 50  # High effort penalty
        self.mock_task.subtasks = []
        self.mock_task.parent_task_id = None
        self.mock_task.status.value = 'completed'  # Completed penalty
        self.mock_task.percent_complete = 100
        
        result = PriorityService.compute_priority_score(self.mock_task)
        assert result == 0.0
        
    @patch('services.priority_service.Task')
    @patch('services.priority_service.db')
    def test_compute_priority_scores(self, mock_db, mock_task_model):
        """Test priority score computation for all user tasks."""
        # Mock tasks for user
        mock_tasks = [Mock(spec=Task) for _ in range(3)]
        for i, task in enumerate(mock_tasks):
            task.priority_score = 0.0
            task.due_date = self.now + timedelta(days=i+1)
            task.estimated_effort = 4
            task.subtasks = []
            task.parent_task_id = None
            task.status.value = 'pending'
            task.percent_complete = 0
        
        mock_task_model.query.filter_by.return_value.all.return_value = mock_tasks
        
        with patch.object(PriorityService, 'compute_priority_score') as mock_compute:
            mock_compute.side_effect = [9.0, 7.0, 5.0]
            
            result = PriorityService.compute_priority_scores(user_id=1)
            
            assert result['total_tasks'] == 3
            assert result['updated_tasks'] == 3
            assert 'timestamp' in result
            
    @patch('services.priority_service.Project')
    @patch('services.priority_service.Task')
    @patch('services.priority_service.db')
    def test_get_prioritized_tasks_for_project(self, mock_db, mock_task_model, mock_project_model):
        """Test getting prioritized tasks for a project."""
        # Mock project and membership check
        mock_project = Mock()
        mock_project.members = [Mock(id=1)]
        mock_project_model.query.get_or_404.return_value = mock_project
        
        # Mock tasks
        mock_tasks = [Mock(spec=Task) for _ in range(2)]
        for i, task in enumerate(mock_tasks):
            task.priority_score = 0.0
            task.to_dict.return_value = {'id': i+1, 'title': f'Task {i+1}'}
        
        mock_task_model.query.filter.return_value.all.return_value = mock_tasks
        
        with patch.object(PriorityService, 'compute_priority_score') as mock_compute:
            mock_compute.side_effect = [8.0, 6.0]
            
            result = PriorityService.get_prioritized_tasks_for_project(
                project_id=1, 
                user_id=1
            )
            
            assert len(result) == 2
            assert result[0]['id'] == 1  # Higher priority task first
            
    @patch('services.priority_service.Project')
    def test_get_prioritized_tasks_permission_error(self, mock_project_model):
        """Test permission error when user is not project member."""
        # Mock project with no matching members
        mock_project = Mock()
        mock_project.members = [Mock(id=2)]  # Different user
        mock_project_model.query.get_or_404.return_value = mock_project
        
        with pytest.raises(PermissionError):
            PriorityService.get_prioritized_tasks_for_project(
                project_id=1, 
                user_id=1
            ) 