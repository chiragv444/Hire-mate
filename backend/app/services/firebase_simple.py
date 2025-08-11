import firebase_admin
from firebase_admin import credentials, firestore, auth
from firebase_admin.exceptions import FirebaseError
from typing import Optional, Dict, Any, List
import json
import os
import uuid
import shutil
from datetime import datetime
from pathlib import Path
from ..core.config import settings

class SimplifiedFirebaseService:
    """Simplified Firebase service for the new analytics and resumes schema"""
    
    def __init__(self):
        self.db = None
        self._initialize_firebase()
    
    def _initialize_firebase(self):
        """Initialize Firebase Admin SDK"""
        try:
            # Check if Firebase is already initialized
            if not firebase_admin._apps:
                # Try to load service account from environment or file
                service_account_info = self._get_service_account_info()
                
                if service_account_info:
                    cred = credentials.Certificate(service_account_info)
                    firebase_admin.initialize_app(cred)
                else:
                    # Use default credentials (for development)
                    firebase_admin.initialize_app()
                
                self.db = firestore.client()
                print("Firebase initialized successfully")
            else:
                self.db = firestore.client()
                print("Firebase already initialized")
                
        except Exception as e:
            print(f"Error initializing Firebase: {e}")
            raise
    
    def _get_service_account_info(self) -> Optional[Dict[str, Any]]:
        """Get Firebase service account info from environment or file"""
        # Try to load from service account file
        service_account_path = "service-account-key.json"
        if os.path.exists(service_account_path):
            with open(service_account_path, 'r') as f:
                return json.load(f)
        
        return None
    
    def upload_file(self, file_content: bytes, filename: str, content_type: str) -> str:
        """Upload file to local storage and return the file path"""
        try:
            # Create uploads directory if it doesn't exist
            uploads_dir = Path("uploads/resumes")
            uploads_dir.mkdir(parents=True, exist_ok=True)
            
            # Generate unique filename
            file_extension = Path(filename).suffix
            unique_filename = f"{uuid.uuid4()}{file_extension}"
            file_path = uploads_dir / unique_filename
            
            # Save file to local storage
            with open(file_path, 'wb') as f:
                f.write(file_content)
            
            # Return relative path for storage in database
            return str(file_path)
            
        except Exception as e:
            print(f"Error uploading file: {e}")
            raise
    
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
    
    # Analytics Collection Methods
    
    def create_analytics(self, user_id: str, analytics_data: Dict[str, Any]) -> str:
        """Create new analytics document"""
        try:
            analytics_data['user_id'] = user_id
            analytics_data['created_at'] = firestore.SERVER_TIMESTAMP
            analytics_data['updated_at'] = firestore.SERVER_TIMESTAMP
            
            _, analytics_ref = self.db.collection('analytics').add(analytics_data)
            return analytics_ref.id
        except Exception as e:
            print(f"Error creating analytics: {e}")
            raise
    
    def update_analytics(self, analytics_id: str, user_id: str, update_data: Dict[str, Any]) -> bool:
        """Update existing analytics document"""
        try:
            analytics_ref = self.db.collection('analytics').document(analytics_id)
            analytics_doc = analytics_ref.get()
            
            if analytics_doc.exists and analytics_doc.to_dict().get('user_id') == user_id:
                update_data['updated_at'] = firestore.SERVER_TIMESTAMP
                analytics_ref.update(update_data)
                return True
            
            print(f"Error: Analytics not found or user not authorized.")
            return False
        except Exception as e:
            print(f"Error updating analytics: {e}")
            return False
    
    def get_analytics(self, analytics_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        """Get analytics document by ID"""
        try:
            analytics_ref = self.db.collection('analytics').document(analytics_id)
            analytics_doc = analytics_ref.get()
            
            if analytics_doc.exists:
                analytics_data = analytics_doc.to_dict()
                if analytics_data.get('user_id') == user_id:
                    analytics_data['id'] = analytics_doc.id
                    return analytics_data
            return None
        except Exception as e:
            print(f"Error getting analytics: {e}")
            return None
    
    def get_user_analytics_history(self, user_id: str, limit: int = 20) -> List[Dict[str, Any]]:
        """Get user's analytics history"""
        try:
            analytics_ref = self.db.collection('analytics')
            analytics_query = analytics_ref.where('user_id', '==', user_id).order_by('created_at', direction=firestore.Query.DESCENDING).limit(limit)
            analytics_docs = analytics_query.stream()
            
            analytics_list = []
            for doc in analytics_docs:
                analytics_data = doc.to_dict()
                analytics_data['id'] = doc.id
                analytics_list.append(analytics_data)
            
            return analytics_list
        except Exception as e:
            print(f"Error getting analytics history: {e}")
            return []
    
    def delete_analytics(self, analytics_id: str, user_id: str) -> bool:
        """Delete analytics document"""
        try:
            analytics_ref = self.db.collection('analytics').document(analytics_id)
            analytics_doc = analytics_ref.get()
            
            if analytics_doc.exists and analytics_doc.to_dict().get('user_id') == user_id:
                analytics_ref.delete()
                return True
            
            print(f"Error: Analytics not found or user not authorized for deletion.")
            return False
        except Exception as e:
            print(f"Error deleting analytics: {e}")
            return False
    
    # Resumes Collection Methods
    
    def create_resume(self, user_id: str, resume_data: Dict[str, Any]) -> str:
        """Create new resume document"""
        try:
            resume_data['user_id'] = user_id
            resume_data['created_at'] = firestore.SERVER_TIMESTAMP
            resume_data['updated_at'] = firestore.SERVER_TIMESTAMP
            
            _, resume_ref = self.db.collection('resumes').add(resume_data)
            return resume_ref.id
        except Exception as e:
            print(f"Error creating resume: {e}")
            raise
    
    def update_resume(self, resume_id: str, user_id: str, update_data: Dict[str, Any]) -> bool:
        """Update existing resume document"""
        try:
            resume_ref = self.db.collection('resumes').document(resume_id)
            resume_doc = resume_ref.get()
            
            if resume_doc.exists and resume_doc.to_dict().get('user_id') == user_id:
                update_data['updated_at'] = firestore.SERVER_TIMESTAMP
                resume_ref.update(update_data)
                return True
            
            print(f"Error: Resume not found or user not authorized.")
            return False
        except Exception as e:
            print(f"Error updating resume: {e}")
            return False
    
    def get_resume(self, resume_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        """Get resume document by ID"""
        try:
            resume_ref = self.db.collection('resumes').document(resume_id)
            resume_doc = resume_ref.get()
            
            if resume_doc.exists:
                resume_data = resume_doc.to_dict()
                if resume_data.get('user_id') == user_id:
                    resume_data['id'] = resume_doc.id
                    return resume_data
            return None
        except Exception as e:
            print(f"Error getting resume: {e}")
            return None
    
    def get_user_resumes(self, user_id: str) -> List[Dict[str, Any]]:
        """Get all user's resumes"""
        try:
            resumes_ref = self.db.collection('resumes')
            resumes_query = resumes_ref.where('user_id', '==', user_id).order_by('created_at', direction=firestore.Query.DESCENDING)
            resumes_docs = resumes_query.stream()
            
            resumes_list = []
            for doc in resumes_docs:
                resume_data = doc.to_dict()
                resume_data['id'] = doc.id
                resumes_list.append(resume_data)
            
            return resumes_list
        except Exception as e:
            print(f"Error getting user resumes: {e}")
            return []
    
    def get_default_resume(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user's default resume"""
        try:
            resumes_ref = self.db.collection('resumes')
            default_query = resumes_ref.where('user_id', '==', user_id).where('is_default', '==', True).limit(1)
            default_docs = list(default_query.stream())
            
            if default_docs:
                resume_data = default_docs[0].to_dict()
                resume_data['id'] = default_docs[0].id
                return resume_data
            return None
        except Exception as e:
            print(f"Error getting default resume: {e}")
            return None
    
    def set_default_resume(self, user_id: str, resume_id: str) -> bool:
        """Set a resume as default (unset all others first)"""
        try:
            # First, unset all default resumes for this user
            resumes_ref = self.db.collection('resumes')
            user_resumes_query = resumes_ref.where('user_id', '==', user_id).where('is_default', '==', True)
            user_resumes_docs = user_resumes_query.stream()
            
            batch = self.db.batch()
            for doc in user_resumes_docs:
                batch.update(doc.reference, {'is_default': False, 'updated_at': firestore.SERVER_TIMESTAMP})
            
            # Set the new default resume
            target_resume_ref = resumes_ref.document(resume_id)
            target_resume_doc = target_resume_ref.get()
            
            if target_resume_doc.exists and target_resume_doc.to_dict().get('user_id') == user_id:
                batch.update(target_resume_ref, {'is_default': True, 'updated_at': firestore.SERVER_TIMESTAMP})
                batch.commit()
                return True
            
            return False
        except Exception as e:
            print(f"Error setting default resume: {e}")
            return False
    
    def delete_resume(self, resume_id: str, user_id: str) -> bool:
        """Delete resume document"""
        try:
            resume_ref = self.db.collection('resumes').document(resume_id)
            resume_doc = resume_ref.get()
            
            if resume_doc.exists and resume_doc.to_dict().get('user_id') == user_id:
                resume_ref.delete()
                return True
            
            print(f"Error: Resume not found or user not authorized for deletion.")
            return False
        except Exception as e:
            print(f"Error deleting resume: {e}")
            return False
    
    # Generic Document Methods (for onboarding API compatibility)
    
    def create_document(self, collection_name: str, document_data: Dict[str, Any]) -> str:
        """Create a new document in any collection"""
        try:
            document_data['created_at'] = firestore.SERVER_TIMESTAMP
            document_data['updated_at'] = firestore.SERVER_TIMESTAMP
            
            _, doc_ref = self.db.collection(collection_name).add(document_data)
            return doc_ref.id
        except Exception as e:
            print(f"Error creating document in {collection_name}: {e}")
            raise
    
    def update_document(self, collection_name: str, document_id: str, update_data: Dict[str, Any]) -> bool:
        """Update a document in any collection"""
        try:
            doc_ref = self.db.collection(collection_name).document(document_id)
            update_data['updated_at'] = firestore.SERVER_TIMESTAMP
            doc_ref.update(update_data)
            return True
        except Exception as e:
            print(f"Error updating document in {collection_name}: {e}")
            return False
    
    def get_document(self, collection_name: str, document_id: str) -> Optional[Dict[str, Any]]:
        """Get a document from any collection"""
        try:
            doc_ref = self.db.collection(collection_name).document(document_id)
            doc = doc_ref.get()
            
            if doc.exists:
                data = doc.to_dict()
                data['id'] = doc.id
                return data
            return None
        except Exception as e:
            print(f"Error getting document from {collection_name}: {e}")
            return None

# Initialize simplified Firebase service
simplified_firebase_service = SimplifiedFirebaseService()
