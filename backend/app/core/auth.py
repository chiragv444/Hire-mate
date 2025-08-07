from fastapi import HTTPException, Depends, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
from .firebase import firebase_service

security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """Verify Firebase token and return current user"""
    try:
        token = credentials.credentials
        decoded_token = firebase_service.verify_token(token)
        
        if not decoded_token:
            raise HTTPException(
                status_code=401,
                detail="Invalid authentication token"
            )
        
        # Get user data from Firestore
        uid = decoded_token.get('uid')
        user_data = firebase_service.get_user_by_uid(uid)
        
        if not user_data:
            raise HTTPException(
                status_code=404,
                detail="User not found"
            )
        
        return {
            "uid": uid,
            "email": decoded_token.get('email'),
            "display_name": decoded_token.get('name'),
            "user_data": user_data
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=401,
            detail=f"Authentication failed: {str(e)}"
        )

async def get_optional_user(
    authorization: Optional[str] = Header(None)
) -> Optional[dict]:
    """Get current user if authenticated, otherwise return None"""
    if not authorization or not authorization.startswith('Bearer '):
        return None
    
    try:
        token = authorization.replace('Bearer ', '')
        decoded_token = firebase_service.verify_token(token)
        
        if not decoded_token:
            return None
        
        uid = decoded_token.get('uid')
        user_data = firebase_service.get_user_by_uid(uid)
        
        if not user_data:
            return None
        
        return {
            "uid": uid,
            "email": decoded_token.get('email'),
            "display_name": decoded_token.get('name'),
            "user_data": user_data
        }
        
    except Exception:
        return None 