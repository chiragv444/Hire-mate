import firebase_admin
from firebase_admin import credentials, firestore, auth
from firebase_admin.exceptions import FirebaseError
from typing import Optional, Dict, Any
import json
import os
from .config import settings

class FirebaseService:
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
    
    def get_user_by_uid(self, uid: str) -> Optional[Dict[str, Any]]:
        """Get user document from Firestore"""
        try:
            user_ref = self.db.collection('users').document(uid)
            user_doc = user_ref.get()
            
            if user_doc.exists:
                return user_doc.to_dict()
            return None
        except Exception as e:
            print(f"Error getting user by UID: {e}")
            return None
    
    def update_user_resume(self, uid: str, resume_id: str) -> bool:
        """Update user's default resume ID in Firestore"""
        try:
            user_ref = self.db.collection('users').document(uid)
            user_ref.update({
                'defaultResumeId': resume_id,
                'lastActiveAt': firestore.SERVER_TIMESTAMP
            })
            return True
        except Exception as e:
            print(f"Error updating user resume: {e}")
            return False
    
    def save_resume_analysis(self, uid: str, analysis_data: Dict[str, Any]) -> str:
        """Save resume analysis to the top-level analysis_sessions collection."""
        try:
            analysis_data['userId'] = uid
            analysis_data['type'] = 'resume_analysis'
            analysis_data['createdAt'] = firestore.SERVER_TIMESTAMP
            analysis_data['updatedAt'] = firestore.SERVER_TIMESTAMP

            _, analysis_ref = self.db.collection('analysis_sessions').add(analysis_data)
            return analysis_ref.id
        except Exception as e:
            print(f"Error saving resume analysis: {e}")
            raise
    
    def save_job_analysis(self, uid: str, job_data: Dict[str, Any]) -> str:
        """Save job analysis to the top-level analysis_sessions collection."""
        try:
            job_data['userId'] = uid
            job_data['type'] = 'job_analysis'
            job_data['createdAt'] = firestore.SERVER_TIMESTAMP
            job_data['updatedAt'] = firestore.SERVER_TIMESTAMP

            _, job_ref = self.db.collection('analysis_sessions').add(job_data)
            return job_ref.id
        except Exception as e:
            print(f"Error saving job analysis: {e}")
            raise
    
    def create_analysis_session(self, uid: str, analysis_data: Dict[str, Any]) -> str:
        """Create a new analysis session in the top-level analysis_sessions collection."""
        try:
            analysis_data['userId'] = uid
            analysis_data['createdAt'] = firestore.SERVER_TIMESTAMP
            analysis_data['updatedAt'] = firestore.SERVER_TIMESTAMP
            
            _, session_ref = self.db.collection('analysis_sessions').add(analysis_data)
            return session_ref.id
        except Exception as e:
            print(f"Error creating analysis session: {e}")
            raise
    
    def update_analysis_session(self, uid: str, session_id: str, update_data: Dict[str, Any]) -> bool:
        """Update an existing analysis session in the top-level analysis_sessions collection."""
        try:
            session_ref = self.db.collection('analysis_sessions').document(session_id)
            session_doc = session_ref.get()

            if session_doc.exists and session_doc.to_dict().get('userId') == uid:
                update_data['updatedAt'] = firestore.SERVER_TIMESTAMP
                session_ref.update(update_data)
                return True
            
            # If doc doesn't exist or user is not the owner
            print(f"Error: Analysis session not found or user not authorized.")
            return False
        except Exception as e:
            print(f"Error updating analysis session: {e}")
            return False
    
    def delete_analysis_session(self, uid: str, session_id: str) -> bool:
        """Delete an analysis session from the top-level analysis_sessions collection."""
        try:
            session_ref = self.db.collection('analysis_sessions').document(session_id)
            session_doc = session_ref.get()

            if session_doc.exists and session_doc.to_dict().get('userId') == uid:
                session_ref.delete()
                return True
            
            # If doc doesn't exist or user is not the owner
            print(f"Error: Analysis session not found or user not authorized for deletion.")
            return False
        except Exception as e:
            print(f"Error deleting analysis session: {e}")
            return False
    

    
    def get_analysis_session(self, uid: str, session_id: str) -> Optional[Dict[str, Any]]:
        """Get analysis session by ID from the top-level analysis_sessions collection."""
        try:
            session_ref = self.db.collection('analysis_sessions').document(session_id)
            session_doc = session_ref.get()

            if session_doc.exists:
                session_data = session_doc.to_dict()
                if session_data.get('userId') == uid:
                    return session_data
            return None
        except Exception as e:
            print(f"Error getting analysis session: {e}")
            return None
    
    def get_analysis_session_by_id(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Get analysis session by ID without user validation (for worker use)."""
        try:
            session_ref = self.db.collection('analysis_sessions').document(session_id)
            session_doc = session_ref.get()

            if session_doc.exists:
                return session_doc.to_dict()
            return None
        except Exception as e:
            print(f"Error getting analysis session by ID: {e}")
            return None
    
    def get_user_analysis_history(self, uid: str, limit: int = 20) -> list:
        """Get user's analysis history from the top-level analysis_sessions collection."""
        try:
            sessions_ref = self.db.collection('analysis_sessions')
            sessions_query = sessions_ref.where('userId', '==', uid).order_by('createdAt', direction=firestore.Query.DESCENDING).limit(limit)
            sessions_docs = sessions_query.stream()
            
            sessions = []
            for doc in sessions_docs:
                session_data = doc.to_dict()
                session_data['id'] = doc.id
                sessions.append(session_data)
            
            return sessions
        except Exception as e:
            print(f"Error getting analysis history: {e}")
            return []

# Initialize Firebase service
firebase_service = FirebaseService() 