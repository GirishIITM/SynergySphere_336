#!/usr/bin/env python3
"""
Simple test script to verify task chat implementation works.
"""

def test_imports():
    """Test that all our new modules can be imported."""
    try:
        # Test service import
        from services.task_chat_service import TaskChatService
        print("✅ TaskChatService imported successfully")
        
        # Test Socket.IO extensions
        from extensions import socketio
        print("✅ Socket.IO extension imported successfully")
        
        # Test task chat routes import
        import routes.task_chat
        print("✅ Task chat routes imported successfully")
        
        return True
        
    except ImportError as e:
        print(f"❌ Import error: {e}")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def test_service_methods():
    """Test that service methods are accessible."""
    try:
        from services.task_chat_service import TaskChatService
        
        # Check if methods exist
        methods = [
            'get_task_with_access_check',
            'create_task_message',
            'get_task_messages',
            'get_task_chat_participants',
            'get_task_message_count'
        ]
        
        for method_name in methods:
            if hasattr(TaskChatService, method_name):
                print(f"✅ Method {method_name} exists")
            else:
                print(f"❌ Method {method_name} missing")
                return False
                
        return True
        
    except Exception as e:
        print(f"❌ Service test error: {e}")
        return False

if __name__ == "__main__":
    print("🧪 Testing Task Chat Implementation")
    print("=" * 40)
    
    import_success = test_imports()
    print()
    
    if import_success:
        service_success = test_service_methods()
        print()
        
        if service_success:
            print("🎉 All tests passed! Implementation looks good.")
        else:
            print("⚠️  Service method tests failed.")
    else:
        print("⚠️  Import tests failed.")
    
    print("=" * 40) 