import cloudinary.uploader
import cloudinary.api
from urllib.parse import urlparse
import os
import re

def upload_profile_image(image_file, user_id):
    """
    Upload profile image to Cloudinary
    
    Args:
        image_file: File object from request.files
        user_id: User ID for organizing uploads
    
    Returns:
        dict: Upload result from Cloudinary or None if failed
    """
    try:
        folder = f"profile_images/user_{user_id}"
        
        upload_options = {
            'folder': folder,
            'resource_type': 'image',
            'format': 'jpg',  # Convert all images to JPG for consistency
            'quality': 'auto:good',  # Optimize quality
            'fetch_format': 'auto',  # Auto-deliver best format for browser
            'width': 400,  # Resize to max 400px width
            'height': 400,  # Resize to max 400px height
            'crop': 'fill',  # Crop to fill the dimensions
            'gravity': 'face',  # Focus on face when cropping
            'overwrite': True,  # Overwrite if file with same name exists
            'unique_filename': False,  # Use consistent filename
            'public_id': f"profile_{user_id}"  # Consistent public ID
        }
        
        result = cloudinary.uploader.upload(image_file, **upload_options)
        
        print(f"Image uploaded successfully: {result.get('public_id')}")
        return result
        
    except Exception as e:
        print(f"Cloudinary upload error: {e}")
        return None

def upload_project_image(image_file, project_id):
    """
    Upload project image to Cloudinary
    
    Args:
        image_file: File object from request.files
        project_id: Project ID for organizing uploads
    
    Returns:
        dict: Upload result from Cloudinary or None if failed
    """
    try:
        folder = f"project_images/project_{project_id}"
        
        upload_options = {
            'folder': folder,
            'resource_type': 'image',
            'format': 'jpg',  # Convert all images to JPG for consistency
            'quality': 'auto:good',  # Optimize quality
            'fetch_format': 'auto',  # Auto-deliver best format for browser
            'width': 800,  # Larger width for project images
            'height': 600,  # Larger height for project images
            'crop': 'fill',  # Crop to fill the dimensions
            'gravity': 'center',  # Center the crop
            'overwrite': True,  # Overwrite if file with same name exists
            'unique_filename': False,  # Use consistent filename
            'public_id': f"project_{project_id}"  # Consistent public ID
        }
        
        result = cloudinary.uploader.upload(image_file, **upload_options)
        
        print(f"Project image uploaded successfully: {result.get('public_id')}")
        return result
        
    except Exception as e:
        print(f"Cloudinary project image upload error: {e}")
        return None

def delete_cloudinary_image(image_url):
    """
    Delete image from Cloudinary using the image URL
    
    Args:
        image_url (str): Full Cloudinary URL of the image
    
    Returns:
        bool: True if deleted successfully, False otherwise
    """
    try:
        if not image_url or 'cloudinary.com' not in image_url:
            return False
        
        public_id = extract_public_id_from_url(image_url)
        if not public_id:
            return False
        
        result = cloudinary.uploader.destroy(public_id)
        
        if result.get('result') == 'ok':
            print(f"Image deleted successfully: {public_id}")
            return True
        else:
            print(f"Failed to delete image: {result}")
            return False
            
    except Exception as e:
        print(f"Error deleting Cloudinary image: {e}")
        return False

def extract_public_id_from_url(cloudinary_url):
    """
    Extract public_id from Cloudinary URL
    
    Args:
        cloudinary_url (str): Full Cloudinary URL
    
    Returns:
        str: Public ID or None if extraction fails
    """
    try:
        parsed_url = urlparse(cloudinary_url)
        path = parsed_url.path
        
        # Remove the version number and file extension
        # Example: /v1234567890/profile_images/user_123/profile_123.jpg
        # Should extract: profile_images/user_123/profile_123
        
        # Split path and remove empty strings
        path_parts = [part for part in path.split('/') if part]
        
        if len(path_parts) < 2:
            return None
        
        # Remove version (starts with 'v' followed by numbers)
        if path_parts[0].startswith('v') and path_parts[0][1:].isdigit():
            path_parts = path_parts[1:]
        
        # Join the remaining parts to form public_id
        public_id_with_extension = '/'.join(path_parts)
        
        # Remove file extension
        public_id = re.sub(r'\.[^.]+$', '', public_id_with_extension)
        
        return public_id
        
    except Exception as e:
        print(f"Error extracting public_id from URL: {e}")
        return None

def validate_image_file(file):
    """
    Validate if the uploaded file is a valid image
    
    Args:
        file: File object from request.files
    
    Returns:
        tuple: (is_valid, error_message)
    """
    if not file or file.filename == '':
        return False, "No file selected"
    
    allowed_extensions = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
    file_extension = file.filename.rsplit('.', 1)[1].lower() if '.' in file.filename else ''
    
    if file_extension not in allowed_extensions:
        return False, f"Invalid file type. Allowed: {', '.join(allowed_extensions).upper()}"
    
    file.seek(0, os.SEEK_END)
    file_size = file.tell()
    file.seek(0)  # Reset file pointer
    
    max_size = 5 * 1024 * 1024  # 5MB in bytes
    if file_size > max_size:
        return False, "File size too large. Maximum size is 5MB"
    
    return True, "Valid image file"

def get_optimized_image_url(cloudinary_url, width=None, height=None, quality='auto'):
    """
    Get optimized version of Cloudinary image URL
    
    Args:
        cloudinary_url (str): Original Cloudinary URL
        width (int): Desired width
        height (int): Desired height
        quality (str): Image quality ('auto', 'auto:low', 'auto:good', etc.)
    
    Returns:
        str: Optimized image URL
    """
    try:
        if not cloudinary_url or 'cloudinary.com' not in cloudinary_url:
            return cloudinary_url
        
        public_id = extract_public_id_from_url(cloudinary_url)
        if not public_id:
            return cloudinary_url
        
        transformations = []
        
        if quality:
            transformations.append(f'q_{quality}')
        
        if width and height:
            transformations.append(f'w_{width},h_{height},c_fill')
        elif width:
            transformations.append(f'w_{width}')
        elif height:
            transformations.append(f'h_{height}')
        
        transformations.append('f_auto')
        
        transformation_string = ','.join(transformations)
        
        cloud_name = os.getenv('CLOUDINARY_CLOUD_NAME')
        optimized_url = f"https://res.cloudinary.com/{cloud_name}/image/upload/{transformation_string}/{public_id}"
        
        return optimized_url
        
    except Exception as e:
        print(f"Error creating optimized URL: {e}")
        return cloudinary_url
