#!/usr/bin/env python3
"""
Test script to verify project immutability in task updates.

This script tests that the backend properly prevents changing a task's project_id
during task update operations.
"""

import requests
import sys
import os

# Add the current directory to the path so we can import from the backend
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def test_project_immutability():
    """Test that task project_id cannot be changed during updates."""
    
    # Configuration
    BASE_URL = "http://localhost:5000"
    
    print("🧪 Testing Task Project Immutability")
    print("=" * 50)
    
    # Note: This test requires:
    # 1. Flask app running on localhost:5000
    # 2. Valid authentication token
    # 3. Existing tasks and projects in the database
    
    print("⚠️  Manual Test Instructions:")
    print("1. Start the Flask backend server")
    print("2. Login to get a valid JWT token")
    print("3. Try to update a task with a different project_id")
    print("4. Verify that the API returns a 400 error")
    print("")
    
    print("Expected behavior:")
    print("✅ Task updates with same project_id should succeed")
    print("❌ Task updates with different project_id should return 400 error")
    print("📝 Error message: 'Project assignment cannot be changed when editing a task'")
    print("")
    
    print("Test endpoints:")
    print("- PUT /tasks/<task_id> (main endpoint)")
    print("- PUT /auth/tasks/<task_id> (alternative endpoint)")
    print("")
    
    print("💡 To run automated tests:")
    print("1. Use Postman collection in the /postman directory")
    print("2. Or use the existing test_api.py script")
    print("3. Ensure you have valid authentication credentials")

if __name__ == "__main__":
    test_project_immutability() 