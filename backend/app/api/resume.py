from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import JSONResponse
from typing import Optional
import os
import uuid
from datetime import datetime

from ..core.auth import get_current_user
from ..core.config import settings
from ..services.resume_parser import resume_parser
from ..core.firebase import firebase_service
from ..services.firebase_storage import firebase_storage_service
from ..models.resume import ResumeUploadRequest, ResumeAnalysisResponse, ResumePreviewResponse

router = APIRouter(prefix="/resume", tags=["resume"])

@router.post("/upload", response_model=ResumeAnalysisResponse)
async def upload_resume(
    file: UploadFile = File(...),
    is_default: bool = Form(False),
    current_user: dict = Depends(get_current_user)
):
    """
    Upload and parse a resume file
    """
    try:
        # Validate file type
        file_extension = os.path.splitext(file.filename)[1].lower()
        if file_extension not in settings.allowed_extensions:
            raise HTTPException(
                status_code=400,
                detail=f"File type not allowed. Allowed types: {settings.allowed_extensions}"
            )
        
        # Validate file size
        file_content = await file.read()
        if len(file_content) > settings.max_file_size:
            raise HTTPException(
                status_code=400,
                detail=f"File too large. Maximum size: {settings.max_file_size // (1024*1024)}MB"
            )
        
        # Save file to Firebase Storage
        file_url = firebase_storage_service.upload_file(
            file_content=file_content,
            filename=file.filename,
            content_type=file.content_type,
            folder="resumes"
        )
        
        # Create file metadata
        file_metadata = {
            'filename': f"{uuid.uuid4()}{os.path.splitext(file.filename)[1]}",
            'original_name': file.filename,
            'file_size': len(file_content),
            'file_type': file.content_type,
            'file_path': file_url,
            'upload_date': datetime.now()
        }
        
        # Parse resume
        parsed_data = await resume_parser.parse_resume(
            file_url, 
            file.content_type
        )
        
        # Prepare resume data for Firestore
        resume_data = {
            'filename': file_metadata['filename'],
            'original_name': file_metadata['original_name'],
            'file_size': file_metadata['file_size'],
            'file_type': file_metadata['file_type'],
            'file_path': file_metadata['file_path'],
            'upload_date': file_metadata['upload_date'],
            'parsed_data': parsed_data,
            'is_default': is_default
        }
        
        # Save to Firestore
        resume_id = firebase_service.save_resume_analysis(
            current_user['uid'], 
            resume_data
        )
        
        # Update user's default resume if requested
        if is_default:
            firebase_service.update_user_resume(current_user['uid'], resume_id)
        
        return ResumeAnalysisResponse(
            success=True,
            message="Resume uploaded and parsed successfully",
            resume_id=resume_id,
            metadata=file_metadata,
            parsed_data=parsed_data,
            is_default=is_default
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error processing resume: {str(e)}"
        )

@router.post("/upload-onboarding", response_model=ResumeAnalysisResponse)
async def upload_resume_onboarding(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Upload resume during onboarding (automatically set as default)
    """
    try:
        # Validate file type
        file_extension = os.path.splitext(file.filename)[1].lower()
        if file_extension not in settings.allowed_extensions:
            raise HTTPException(
                status_code=400,
                detail=f"File type not allowed. Allowed types: {settings.allowed_extensions}"
            )
        
        # Validate file size
        file_content = await file.read()
        if len(file_content) > settings.max_file_size:
            raise HTTPException(
                status_code=400,
                detail=f"File too large. Maximum size: {settings.max_file_size // (1024*1024)}MB"
            )
        
        # Save file to Firebase Storage
        file_url = firebase_storage_service.upload_file(
            file_content=file_content,
            filename=file.filename,
            content_type=file.content_type,
            folder="resumes"
        )
        
        # Create file metadata
        file_metadata = {
            'filename': f"{uuid.uuid4()}{os.path.splitext(file.filename)[1]}",
            'original_name': file.filename,
            'file_size': len(file_content),
            'file_type': file.content_type,
            'file_path': file_url,
            'upload_date': datetime.now()
        }
        
        # Parse resume
        parsed_data = await resume_parser.parse_resume(
            file_url, 
            file.content_type
        )
        
        # Prepare resume data for Firestore
        resume_data = {
            'filename': file_metadata['filename'],
            'original_name': file_metadata['original_name'],
            'file_size': file_metadata['file_size'],
            'file_type': file_metadata['file_type'],
            'file_path': file_metadata['file_path'],
            'upload_date': file_metadata['upload_date'],
            'parsed_data': parsed_data,
            'is_default': True,  # Always default for onboarding
            'file_url': file_url,  # Store the Firebase Storage URL
            'source': 'onboarding'
        }
        
        # Save to Firestore
        resume_id = firebase_service.save_resume_analysis(
            current_user['uid'], 
            resume_data
        )
        
        # Update user's default resume
        firebase_service.update_user_resume(current_user['uid'], resume_id)
        
        return ResumeAnalysisResponse(
            success=True,
            message="Resume uploaded and set as default",
            resume_id=resume_id,
            metadata=file_metadata,
            parsed_data=parsed_data,
            is_default=True
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error processing resume: {str(e)}"
        )

@router.get("/preview/{resume_id}", response_model=ResumePreviewResponse)
async def get_resume_preview(
    resume_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get resume preview with parsed text and skills
    """
    try:
        # Get resume data from Firestore
        resume_data = firebase_service.get_analysis_session(current_user['uid'], resume_id)
        
        if not resume_data or resume_data.get('type') != 'resume_analysis':
            raise HTTPException(
                status_code=404,
                detail="Resume not found"
            )
        
        parsed_data = resume_data.get('parsed_data', {})
        
        return ResumePreviewResponse(
            success=True,
            filename=resume_data.get('original_name', 'Unknown'),
            file_size=resume_data.get('file_size', 0),
            parsed_text=parsed_data.get('raw_text', ''),
            skills=parsed_data.get('skills', [])
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving resume preview: {str(e)}"
        )

@router.get("/list")
async def list_user_resumes(current_user: dict = Depends(get_current_user)):
    """
    List all resumes for the current user
    """
    try:
        # Get user's default resume ID
        user_doc = firebase_service.get_user_by_uid(current_user['uid'])
        default_resume_id = user_doc.get('defaultResumeId') if user_doc else None

        # Get user's resumes from Firestore
        resumes_ref = firebase_service.db.collection('analysis_sessions')
        query = resumes_ref.where('userId', '==', current_user['uid']).where('type', '==', 'resume_analysis')
        resumes_docs = query.stream()
        
        resumes = []
        for doc in resumes_docs:
            resume_data = doc.to_dict()
            resume_id = doc.id
            resumes.append({
                'id': resume_id,
                'filename': resume_data.get('original_name', 'Unknown'),
                'file_size': resume_data.get('file_size', 0),
                'upload_date': resume_data.get('upload_date'),
                'is_default': resume_id == default_resume_id,
                'skills_count': len(resume_data.get('parsed_data', {}).get('skills', []))
            })
        
        return {
            "success": True,
            "resumes": resumes
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving resumes: {str(e)}"
        )

@router.delete("/{resume_id}")
async def delete_resume(
    resume_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Delete a resume
    """
    try:
        uid = current_user['uid']
        # Get resume data from Firestore
        resume_data = firebase_service.get_analysis_session(uid, resume_id)
        
        if not resume_data or resume_data.get('type') != 'resume_analysis':
            raise HTTPException(
                status_code=404,
                detail="Resume not found"
            )
        
        # Delete file from Firebase Storage
        file_url = resume_data.get('file_path') or resume_data.get('file_url')
        if file_url:
            firebase_storage_service.delete_file(file_url)
        
        # Delete from Firestore
        if not firebase_service.delete_analysis_session(uid, resume_id):
            raise HTTPException(
                status_code=500,
                detail="Failed to delete resume from database"
            )
        
        # If the deleted resume was the default, clear it
        user_doc = firebase_service.get_user_by_uid(uid)
        if user_doc and user_doc.get('defaultResumeId') == resume_id:
            firebase_service.db.collection('users').document(uid).update({'defaultResumeId': None})

        return {
            "success": True,
            "message": "Resume deleted successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error deleting resume: {str(e)}"
        ) 