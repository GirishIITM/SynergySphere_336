import os
import json
from datetime import datetime

# Default version info
DEFAULT_VERSION = {
    "version": "1.0.0",
    "build_date": None,
    "docker_tag": None,
    "environment": "development",
    "build_number": None
}

def generate_version():
    """Generate version."""
    version = "1.0.0"
    return version

def get_version_info():
    """Get version information from various sources."""
    version_info = DEFAULT_VERSION.copy()
    
    auto_version = generate_version()
    
    try:
        version_file_path = os.path.join(os.path.dirname(__file__), 'version.json')
        if os.path.exists(version_file_path):
            with open(version_file_path, 'r') as f:
                file_version = json.load(f)
                version_info.update(file_version)
    except Exception as e:
        print(f"Warning: Could not read version.json: {e}")
    
    if os.getenv('APP_VERSION'):
        version_info['version'] = os.getenv('APP_VERSION')
    else:
        version_info['version'] = auto_version
    
    if os.getenv('BUILD_DATE'):
        version_info['build_date'] = os.getenv('BUILD_DATE')
    
    if os.getenv('DOCKER_TAG'):
        version_info['docker_tag'] = os.getenv('DOCKER_TAG')
    
    if os.getenv('FLASK_ENV'):
        version_info['environment'] = os.getenv('FLASK_ENV')
    
    if not version_info['build_date']:
        version_info['build_date'] = datetime.utcnow().isoformat() + 'Z'
    
    return version_info

def get_version_string():
    """Get a simple version string."""
    version_info = get_version_info()
    return version_info.get('version', 'unknown')
