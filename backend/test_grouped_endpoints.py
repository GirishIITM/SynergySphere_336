#!/usr/bin/env python3
"""
Simple test script to verify the new grouped task endpoints
"""
import requests
import json
import sys
import os

# Add the current directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def test_grouped_endpoints():
    """Test the new grouped task endpoints"""
    
    base_url = "http://localhost:5000"  # Adjust if your backend runs on a different port
    
    # Test data
    login_data = {
        "email": "test@example.com",  # Replace with a valid test user
        "password": "testpassword"     # Replace with valid password
    }
    
    print("Testing grouped task endpoints...")
    
    try:
        # Login to get JWT token
        print("1. Logging in...")
        login_response = requests.post(f"{base_url}/auth/login", json=login_data)
        
        if login_response.status_code != 200:
            print(f"❌ Login failed: {login_response.status_code}")
            print(f"Response: {login_response.text}")
            return
            
        token = login_response.json().get('access_token')
        if not token:
            print("❌ No access token received")
            return
            
        headers = {'Authorization': f'Bearer {token}'}
        print("✅ Login successful")
        
        # Test /tasks/grouped endpoint
        print("\n2. Testing /tasks/grouped endpoint...")
        grouped_response = requests.get(f"{base_url}/tasks/grouped", headers=headers)
        
        if grouped_response.status_code == 200:
            grouped_data = grouped_response.json()
            print("✅ /tasks/grouped endpoint working")
            print(f"   - Pending tasks: {len(grouped_data.get('pending', []))}")
            print(f"   - In Progress tasks: {len(grouped_data.get('in_progress', []))}")
            print(f"   - Completed tasks: {len(grouped_data.get('completed', []))}")
        else:
            print(f"❌ /tasks/grouped failed: {grouped_response.status_code}")
            print(f"Response: {grouped_response.text}")
            
        # Test /projects/<id>/tasks/grouped endpoint (if you have a project)
        print("\n3. Testing /projects/<id>/tasks/grouped endpoint...")
        
        # First get projects to find a valid project ID
        projects_response = requests.get(f"{base_url}/projects", headers=headers)
        if projects_response.status_code == 200:
            projects_data = projects_response.json()
            projects = projects_data.get('projects', projects_data) if isinstance(projects_data, dict) else projects_data
            
            if projects and len(projects) > 0:
                project_id = projects[0]['id']
                project_grouped_response = requests.get(
                    f"{base_url}/projects/{project_id}/tasks/grouped", 
                    headers=headers
                )
                
                if project_grouped_response.status_code == 200:
                    project_grouped_data = project_grouped_response.json()
                    print(f"✅ /projects/{project_id}/tasks/grouped endpoint working")
                    print(f"   - Pending tasks: {len(project_grouped_data.get('pending', []))}")
                    print(f"   - In Progress tasks: {len(project_grouped_data.get('in_progress', []))}")
                    print(f"   - Completed tasks: {len(project_grouped_data.get('completed', []))}")
                else:
                    print(f"❌ /projects/{project_id}/tasks/grouped failed: {project_grouped_response.status_code}")
                    print(f"Response: {project_grouped_response.text}")
            else:
                print("⚠️  No projects found to test project-specific endpoint")
        else:
            print(f"⚠️  Could not fetch projects: {projects_response.status_code}")
            
    except requests.exceptions.ConnectionError:
        print("❌ Could not connect to backend. Make sure the backend server is running.")
    except Exception as e:
        print(f"❌ Test failed with error: {e}")

if __name__ == "__main__":
    test_grouped_endpoints() 