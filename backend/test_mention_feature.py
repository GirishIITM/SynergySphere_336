#!/usr/bin/env python3
"""
Test script for mention detection and notification functionality
"""

import sys
import os

# Add the backend directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from utils.mention_utils import extract_mentions, get_mentioned_users
from models import User

def test_extract_mentions():
    """Test the mention extraction functionality."""
    print("🧪 Testing mention extraction...")
    
    test_cases = [
        ("Hello @john, can you help with this task?", ["john"]),
        ("@alice and @bob, please review this", ["alice", "bob"]),
        ("Hi @John Doe, your input is needed", ["John Doe"]),
        ("No mentions here", []),
        ("Email me at john@example.com", []),  # Should not match email
        ("@user123 and @another_user", ["user123", "another_user"]),
        ("@first @second @third", ["first", "second", "third"]),
        ("Mention @someone in the middle of sentence", ["someone"])
    ]
    
    for test_input, expected in test_cases:
        result = extract_mentions(test_input)
        status = "✅" if result == expected else "❌"
        print(f"{status} Input: '{test_input}'")
        print(f"    Expected: {expected}")
        print(f"    Got:      {result}")
        if result != expected:
            print(f"    ❌ FAILED!")
        print()

def test_get_mentioned_users():
    """Test getting mentioned users from project members."""
    print("🧪 Testing mentioned users detection...")
    
    # Mock user objects
    class MockUser:
        def __init__(self, id, username, full_name=None):
            self.id = id
            self.username = username
            self.full_name = full_name
    
    # Mock project members
    project_members = [
        MockUser(1, "alice", "Alice Smith"),
        MockUser(2, "bob", "Bob Johnson"),
        MockUser(3, "charlie", None),
        MockUser(4, "dave123", "Dave Wilson")
    ]
    
    test_cases = [
        ("Hello @alice, can you help?", ["alice"]),
        ("@Alice Smith please review", ["Alice Smith"]),
        ("@bob and @charlie, check this", ["bob", "charlie"]),
        ("@dave123 your turn", ["dave123"]),
        ("@nonexistent user", []),
        ("@alice @Bob Johnson @charlie", ["alice", "Bob Johnson", "charlie"])
    ]
    
    for test_input, expected_usernames in test_cases:
        result = get_mentioned_users(test_input, project_members)
        result_usernames = [u.username if u.username in expected_usernames else u.full_name for u in result]
        
        status = "✅" if set(result_usernames) == set(expected_usernames) else "❌"
        print(f"{status} Input: '{test_input}'")
        print(f"    Expected: {expected_usernames}")
        print(f"    Got:      {result_usernames}")
        if set(result_usernames) != set(expected_usernames):
            print(f"    ❌ FAILED!")
        print()

if __name__ == "__main__":
    print("🚀 Starting mention detection tests...\n")
    
    try:
        test_extract_mentions()
        test_get_mentioned_users()
        print("🎉 All tests completed!")
        
    except Exception as e:
        print(f"❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc() 