"""
Unit tests for the Status model.
"""

import pytest
from models import Status
from extensions import db


class TestStatusModel:
    """Test cases for the Status model."""

    def test_status_creation(self, app):
        """Test creating a new status."""
        with app.app_context():
            status = Status(
                name='test_status',
                description='Test status description',
                display_order=1,
                color='#FF0000'
            )
            db.session.add(status)
            db.session.commit()
            
            assert status.id is not None
            assert status.name == 'test_status'
            assert status.description == 'Test status description'
            assert status.display_order == 1
            assert status.color == '#FF0000'

    def test_status_to_dict(self, app):
        """Test status to_dict method."""
        with app.app_context():
            status = Status(
                name='test_status',
                description='Test description',
                display_order=2,
                color='#00FF00'
            )
            db.session.add(status)
            db.session.commit()
            
            status_dict = status.to_dict()
            
            assert 'id' in status_dict
            assert status_dict['name'] == 'test_status'
            assert status_dict['description'] == 'Test description'
            assert status_dict['display_order'] == 2
            assert status_dict['color'] == '#00FF00'
            assert 'created_at' in status_dict
            assert 'updated_at' in status_dict

    def test_initialize_default_statuses(self, app):
        """Test initializing default statuses."""
        with app.app_context():
            # Clear existing statuses
            Status.query.delete()
            db.session.commit()
            
            # Initialize default statuses
            Status.initialize_default_statuses()
            
            # Check that statuses were created
            statuses = Status.query.order_by(Status.display_order).all()
            assert len(statuses) == 3
            
            assert statuses[0].name == 'pending'
            assert statuses[1].name == 'in_progress'
            assert statuses[2].name == 'completed'

    def test_status_unique_name(self, app):
        """Test that status names must be unique."""
        with app.app_context():
            status1 = Status(name='unique_status', display_order=1)
            status2 = Status(name='unique_status', display_order=2)
            
            db.session.add(status1)
            db.session.commit()
            
            db.session.add(status2)
            
            with pytest.raises(Exception):  # Should raise integrity error
                db.session.commit()

    def test_status_repr(self, app):
        """Test status string representation."""
        with app.app_context():
            status = Status(name='test_status')
            assert str(status) == '<Status test_status>' 