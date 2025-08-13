import firebase_admin
from firebase_admin import credentials, firestore, auth, storage
from firebase_admin.exceptions import FirebaseError
from typing import Optional, Dict, Any, List
import json
import os
import uuid
import shutil
from datetime import datetime, timedelta
from pathlib import Path
from ..core.config import settings

class FirebaseStorageService:
    """Firebase Storage service for handling file uploads"""
    
    def __init__(self):
        self.bucket = None
        self.db = None
        self._initialize_firebase()
    
    def _initialize_firebase(self):
        """Initialize Firebase Admin SDK with Storage"""
        try:
            # Check if Firebase is already initialized
            if not firebase_admin._apps:
                # Try to load service account from environment or file
                service_account_info = self._get_service_account_info()
                
                if service_account_info:
                    cred = credentials.Certificate(service_account_info)
                    firebase_admin.initialize_app(cred, {
                        'storageBucket': f"{settings.firebase_project_id}.firebasestorage.app"
                    })
                else:
                    # Use default credentials (for development)
                    firebase_admin.initialize_app({
                        'storageBucket': f"{settings.firebase_project_id}.firebasestorage.app"
                    })
                
                self.bucket = storage.bucket(f"{settings.firebase_project_id}.firebasestorage.app")
                self.db = firestore.client()
                print("Firebase Storage initialized successfully")
            else:
                self.bucket = storage.bucket(f"{settings.firebase_project_id}.firebasestorage.app")
                self.db = firestore.client()
                print("Firebase Storage already initialized")
                
        except Exception as e:
            print(f"Error initializing Firebase Storage: {e}")
            raise
    
    def _get_service_account_info(self) -> Optional[Dict[str, Any]]:
        """Get Firebase service account info from environment or file"""
        # Try to get from environment variables
        if all([
            settings.firebase_private_key_id,
            settings.firebase_private_key,
            settings.firebase_client_email,
            settings.firebase_client_id
        ]):
            return {
                "type": "service_account",
                "project_id": settings.firebase_project_id,
                "private_key_id": settings.firebase_private_key_id,
                "private_key": settings.firebase_private_key.replace('\\n', '\n'),
                "client_email": settings.firebase_client_email,
                "client_id": settings.firebase_client_id,
                "auth_uri": settings.firebase_auth_uri,
                "token_uri": settings.firebase_token_uri,
                "auth_provider_x509_cert_url": settings.firebase_auth_provider_x509_cert_url,
                "client_x509_cert_url": settings.firebase_client_x509_cert_url
            }
        
        # Try to load from service account file
        service_account_path = "service-account-key.json"
        if os.path.exists(service_account_path):
            with open(service_account_path, 'r') as f:
                return json.load(f)
        
        return None
    
    def upload_file(self, file_content: bytes, filename: str, content_type: str, folder: str = "resumes") -> str:
        """Upload file to Firebase Storage and return the download URL"""
        try:
            # Generate unique filename
            file_extension = Path(filename).suffix
            unique_filename = f"{uuid.uuid4()}{file_extension}"
            
            # Create blob path in the specified folder
            blob_path = f"{folder}/{unique_filename}"
            blob = self.bucket.blob(blob_path)
            
            # Set content type for proper file handling
            blob.content_type = content_type
            
            # Upload file content
            blob.upload_from_string(file_content, content_type=content_type)
            
            # Make the blob publicly readable (optional, depending on your security requirements)
            # blob.make_public()
            
            # Get the download URL
            download_url = blob.generate_signed_url(
                version="v4",
                expiration=timedelta(days=7),  # 7 days expiration (Firebase max)
                method="GET"
            )
            
            print(f"File uploaded successfully to Firebase Storage: {blob_path}")
            return download_url
            
        except Exception as e:
            print(f"Error uploading file to Firebase Storage: {e}")
            raise
    
    def delete_file(self, file_url: str) -> bool:
        """Delete file from Firebase Storage"""
        try:
            # Extract blob path from URL
            # Firebase Storage URLs typically contain the blob path
            if "firebasestorage.googleapis.com" in file_url:
                # Extract the path from the signed URL
                # This is a simplified approach - you might need to adjust based on your URL structure
                blob_path = file_url.split("/o/")[-1].split("?")[0] if "/o/" in file_url else None
                
                if blob_path:
                    blob = self.bucket.blob(blob_path)
                    blob.delete()
                    print(f"File deleted successfully from Firebase Storage: {blob_path}")
                    return True
                else:
                    print(f"Could not extract blob path from URL: {file_url}")
                    return False
            else:
                print(f"Invalid Firebase Storage URL: {file_url}")
                return False
                
        except Exception as e:
            print(f"Error deleting file from Firebase Storage: {e}")
            return False
    
    def get_file_metadata(self, file_url: str) -> Optional[Dict[str, Any]]:
        """Get file metadata from Firebase Storage"""
        try:
            if "firebasestorage.googleapis.com" in file_url:
                blob_path = file_url.split("/o/")[-1].split("?")[0] if "/o/" in file_url else None
                
                if blob_path:
                    blob = self.bucket.blob(blob_path)
                    blob.reload()  # Refresh metadata
                    
                    return {
                        'name': blob.name,
                        'size': blob.size,
                        'content_type': blob.content_type,
                        'created': blob.time_created,
                        'updated': blob.updated,
                        'md5_hash': blob.md5_hash
                    }
            
            return None
            
        except Exception as e:
            print(f"Error getting file metadata: {e}")
            return None
    
    def verify_token(self, id_token: str) -> Optional[Dict[str, Any]]:
        """Verify Firebase ID token and return user info"""
        try:
            decoded_token = auth.verify_id_token(id_token)
            return decoded_token
        except FirebaseError as e:
            print(f"Firebase token verification error: {e}")
            return None
        except Exception as e:
            print(f"Token verification error: {e}")
            return None

# Initialize Firebase Storage service
firebase_storage_service = FirebaseStorageService()
