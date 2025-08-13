#!/usr/bin/env python3
"""
Test script for Firebase Storage integration
"""

import os
import sys
from pathlib import Path

# Add the app directory to the Python path
sys.path.append(str(Path(__file__).parent / "app"))

from services.firebase_storage import firebase_storage_service
from core.config import settings

def test_firebase_storage():
    """Test Firebase Storage functionality"""
    print("🧪 Testing Firebase Storage Integration...")
    print("=" * 50)
    
    try:
        # Test 1: Check if Firebase is initialized
        print("1. Testing Firebase initialization...")
        if firebase_storage_service.bucket:
            print("✅ Firebase Storage bucket initialized successfully")
            print(f"   Bucket: {firebase_storage_service.bucket.name}")
        else:
            print("❌ Firebase Storage bucket not initialized")
            return False
        
        # Test 2: Check if Firestore is accessible
        print("\n2. Testing Firestore connection...")
        if firebase_storage_service.db:
            print("✅ Firestore client initialized successfully")
        else:
            print("❌ Firestore client not initialized")
            return False
        
        # Test 3: Test file upload (with a small test file)
        print("\n3. Testing file upload...")
        test_content = b"This is a test file for Firebase Storage integration"
        test_filename = "test_file.txt"
        
        try:
            file_url = firebase_storage_service.upload_file(
                file_content=test_content,
                filename=test_filename,
                content_type="text/plain",
                folder="test"
            )
            print(f"✅ File uploaded successfully")
            print(f"   URL: {file_url}")
            
            # Test 4: Test file deletion
            print("\n4. Testing file deletion...")
            if firebase_storage_service.delete_file(file_url):
                print("✅ File deleted successfully")
            else:
                print("❌ File deletion failed")
                return False
                
        except Exception as e:
            print(f"❌ File upload failed: {e}")
            return False
        
        print("\n" + "=" * 50)
        print("🎉 All Firebase Storage tests passed!")
        return True
        
    except Exception as e:
        print(f"❌ Firebase Storage test failed: {e}")
        return False

def test_configuration():
    """Test configuration settings"""
    print("🔧 Testing Configuration...")
    print("=" * 50)
    
    print(f"Firebase Project ID: {settings.firebase_project_id}")
    print(f"Upload Directory: {settings.upload_dir}")
    print(f"Max File Size: {settings.max_file_size // (1024*1024)}MB")
    print(f"Allowed Extensions: {settings.allowed_extensions}")
    
    # Check if service account file exists
    service_account_path = "service-account-key.json"
    if os.path.exists(service_account_path):
        print(f"✅ Service account file found: {service_account_path}")
    else:
        print(f"⚠️  Service account file not found: {service_account_path}")
        print("   Using default credentials (for development)")

if __name__ == "__main__":
    print("🚀 HireMate Firebase Storage Integration Test")
    print("=" * 60)
    
    # Test configuration
    test_configuration()
    print()
    
    # Test Firebase Storage
    success = test_firebase_storage()
    
    if success:
        print("\n🎯 Firebase Storage integration is working correctly!")
        print("   You can now upload resumes to Firebase Storage instead of local storage.")
    else:
        print("\n❌ Firebase Storage integration failed!")
        print("   Please check your configuration and try again.")
        sys.exit(1)
