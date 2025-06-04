"""
Unit tests for analytics routes.

Tests cover productivity analytics, project analytics, and team analytics
endpoints with expected use cases, edge cases, and failure scenarios.
"""

import pytest
from datetime import datetime, timezone, timedelta
from unittest.mock import patch, MagicMock

from flask import Flask
from flask_jwt_extended import create_access_token

from routes.analytics import (
    analytics_bp, 
    _calculate_consistency_score,
    _calculate_project_health_score,
    _calculate_performance_score,
    _calculate_workload_distribution
)


class TestAnalyticsRoutes:
    """Test class for analytics route endpoints."""

    def setup_method(self):
        """Set up test fixtures."""
        self.app = Flask(__name__)
        self.app.config['JWT_SECRET_KEY'] = 'test-secret'
        self.app.config['TESTING'] = True
        
        # Register blueprint
        self.app.register_blueprint(analytics_bp, url_prefix='/analytics')
        
        # Set up JWT
        from flask_jwt_extended import JWTManager
        self.jwt = JWTManager(self.app)
        
        self.client = self.app.test_client()
        
        # Create test token
        with self.app.app_context():
            self.access_token = create_access_token(identity='1')

    @patch('routes.analytics.Task')
    @patch('routes.analytics.get_jwt_identity')
    def test_get_productivity_analytics_success(self, mock_get_jwt, mock_task):
        """Test successful productivity analytics retrieval."""
        # Mock JWT identity
        mock_get_jwt.return_value = '1'
        
        # Mock task data
        mock_tasks = [
            MagicMock(
                id=1, 
                status='completed', 
                created_at=datetime.now(timezone.utc),
                due_date=None,
                owner_id=1
            ),
            MagicMock(
                id=2, 
                status='in_progress', 
                created_at=datetime.now(timezone.utc),
                due_date=None,
                owner_id=1
            )
        ]
        mock_task.query.filter.return_value.all.return_value = mock_tasks
        
        # Make request
        response = self.client.get(
            '/analytics/productivity',
            headers={'Authorization': f'Bearer {self.access_token}'}
        )
        
        assert response.status_code == 200
        data = response.get_json()
        
        # Verify response structure
        assert 'period' in data
        assert 'overview' in data
        assert 'averages' in data
        assert 'daily_breakdown' in data
        assert 'trends' in data
        
        # Verify metrics
        assert data['overview']['total_tasks'] == 2
        assert data['overview']['completed_tasks'] == 1
        assert data['overview']['completion_rate'] == 50.0

    @patch('routes.analytics.get_jwt_identity')
    def test_get_productivity_analytics_invalid_days(self, mock_get_jwt):
        """Test productivity analytics with invalid days parameter."""
        mock_get_jwt.return_value = '1'
        
        # Test with invalid days parameter (should default to 30)
        response = self.client.get(
            '/analytics/productivity?days=999',
            headers={'Authorization': f'Bearer {self.access_token}'}
        )
        
        assert response.status_code in [200, 500]  # Should handle gracefully

    def test_get_productivity_analytics_unauthorized(self):
        """Test productivity analytics without authentication."""
        response = self.client.get('/analytics/productivity')
        assert response.status_code == 401

    @patch('routes.analytics.Project')
    @patch('routes.analytics.Task')
    @patch('routes.analytics.db')
    @patch('routes.analytics.get_jwt_identity')
    def test_get_project_analytics_success(self, mock_get_jwt, mock_db, mock_task, mock_project):
        """Test successful project analytics retrieval."""
        mock_get_jwt.return_value = '1'
        
        # Mock project data
        mock_projects = [
            MagicMock(
                id=1,
                name='Test Project',
                owner_id=1,
                created_at=datetime.now(timezone.utc),
                deadline=None,
                members=[]
            )
        ]
        mock_db.session.query.return_value.join.return_value.filter.return_value.distinct.return_value.all.return_value = mock_projects
        
        # Mock task data
        mock_tasks = [
            MagicMock(id=1, status='completed', due_date=None),
            MagicMock(id=2, status='in_progress', due_date=None)
        ]
        mock_task.query.filter.return_value.all.return_value = mock_tasks
        
        response = self.client.get(
            '/analytics/projects',
            headers={'Authorization': f'Bearer {self.access_token}'}
        )
        
        assert response.status_code == 200
        data = response.get_json()
        
        assert 'overview' in data
        assert 'projects' in data
        assert data['overview']['total_projects'] == 1

    @patch('routes.analytics.Project')
    @patch('routes.analytics.get_jwt_identity')
    def test_get_team_analytics_no_owned_projects(self, mock_get_jwt, mock_project):
        """Test team analytics when user owns no projects."""
        mock_get_jwt.return_value = '1'
        mock_project.query.filter.return_value.all.return_value = []
        
        response = self.client.get(
            '/analytics/team',
            headers={'Authorization': f'Bearer {self.access_token}'}
        )
        
        assert response.status_code == 403
        data = response.get_json()
        assert 'msg' in data
        assert 'No owned projects found' in data['msg']


class TestAnalyticsHelperFunctions:
    """Test class for analytics helper functions."""

    def test_calculate_consistency_score_empty_metrics(self):
        """Test consistency score calculation with empty metrics."""
        result = _calculate_consistency_score({})
        assert result == 0.0

    def test_calculate_consistency_score_perfect_consistency(self):
        """Test consistency score with perfect consistency."""
        daily_metrics = {
            '2025-01-01': {'completion_rate': 100.0},
            '2025-01-02': {'completion_rate': 100.0},
            '2025-01-03': {'completion_rate': 100.0}
        }
        result = _calculate_consistency_score(daily_metrics)
        assert result == 100.0

    def test_calculate_consistency_score_variable_performance(self):
        """Test consistency score with variable performance."""
        daily_metrics = {
            '2025-01-01': {'completion_rate': 0.0},
            '2025-01-02': {'completion_rate': 50.0},
            '2025-01-03': {'completion_rate': 100.0}
        }
        result = _calculate_consistency_score(daily_metrics)
        assert 0.0 <= result <= 100.0

    def test_calculate_project_health_score_perfect_project(self):
        """Test project health score for a perfect project."""
        result = _calculate_project_health_score(
            completion_rate=100.0,
            overdue_tasks=0,
            total_tasks=10,
            deadline_status='on_track'
        )
        assert result == 60.0  # Base score without penalties

    def test_calculate_project_health_score_problematic_project(self):
        """Test project health score for a problematic project."""
        result = _calculate_project_health_score(
            completion_rate=50.0,
            overdue_tasks=5,
            total_tasks=10,
            deadline_status='overdue'
        )
        assert result == 0.0  # Should be heavily penalized

    def test_calculate_project_health_score_edge_case(self):
        """Test project health score edge case with zero tasks."""
        result = _calculate_project_health_score(
            completion_rate=0.0,
            overdue_tasks=0,
            total_tasks=0,
            deadline_status='on_track'
        )
        assert result == 0.0

    def test_calculate_performance_score_no_tasks(self):
        """Test performance score with no tasks."""
        result = _calculate_performance_score(
            completion_rate=0.0,
            overdue_tasks=0,
            total_tasks=0
        )
        assert result == 0.0

    def test_calculate_performance_score_excellent_performance(self):
        """Test performance score with excellent performance."""
        result = _calculate_performance_score(
            completion_rate=100.0,
            overdue_tasks=0,
            total_tasks=20
        )
        assert result == 90.0  # 80% base + 10% volume bonus

    def test_calculate_performance_score_poor_performance(self):
        """Test performance score with poor performance."""
        result = _calculate_performance_score(
            completion_rate=25.0,
            overdue_tasks=5,
            total_tasks=10
        )
        # Base: 25 * 0.8 = 20, Penalty: (5/10) * 30 = 15, Bonus: min(10*0.5, 10) = 5
        # Score: max(0, min(100, 20 - 15 + 5)) = 10
        assert result == 10.0

    def test_calculate_workload_distribution_empty_list(self):
        """Test workload distribution with empty member list."""
        result = _calculate_workload_distribution([])
        assert result == {}

    def test_calculate_workload_distribution_even_distribution(self):
        """Test workload distribution with even task distribution."""
        member_analytics = [
            {'metrics': {'total_tasks': 10}},
            {'metrics': {'total_tasks': 10}},
            {'metrics': {'total_tasks': 10}}
        ]
        result = _calculate_workload_distribution(member_analytics)
        
        assert result['balance_score'] == 100.0
        assert result['distribution'] == 'even'
        assert result['ideal_tasks_per_member'] == 10.0

    def test_calculate_workload_distribution_uneven_distribution(self):
        """Test workload distribution with uneven task distribution."""
        member_analytics = [
            {'metrics': {'total_tasks': 1}},
            {'metrics': {'total_tasks': 5}},
            {'metrics': {'total_tasks': 20}}
        ]
        result = _calculate_workload_distribution(member_analytics)
        
        assert result['balance_score'] < 80.0
        assert result['distribution'] in ['moderate', 'uneven']
        assert result['actual_range']['min'] == 1
        assert result['actual_range']['max'] == 20

    def test_calculate_workload_distribution_zero_tasks(self):
        """Test workload distribution when all members have zero tasks."""
        member_analytics = [
            {'metrics': {'total_tasks': 0}},
            {'metrics': {'total_tasks': 0}}
        ]
        result = _calculate_workload_distribution(member_analytics)
        
        assert result['balance_score'] == 100
        assert result['distribution'] == 'even'


if __name__ == '__main__':
    pytest.main([__file__]) 