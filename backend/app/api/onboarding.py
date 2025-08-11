from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import JSONResponse
from typing import Optional

import os
from datetime import datetime

from ..core.auth import get_current_user
from ..core.config import settings
from app.services.enhanced_resume_parser import enhanced_resume_parser
from ..services.firebase_simple import simplified_firebase_service
from ..models.resume_simple import (
    UploadResumeRequest,
    UploadResumeResponse,
    ParsedResumeData
)

router = APIRouter(prefix="/onboarding", tags=["onboarding"])

@router.post("/upload-resume", response_model=UploadResumeResponse)
async def upload_onboarding_resume(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Upload resume during onboarding flow
    This stores the resume in the resumes table and sets it as the user's default resume
    """
    try:
        user_id = current_user["uid"]
        
        # Validate file type
        allowed_types = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]
        if file.content_type not in allowed_types:
            raise HTTPException(
                status_code=400,
                detail="Invalid file type. Only PDF and DOCX files are allowed."
            )
        
        # Validate file size (10MB limit)
        file_content = await file.read()
        if len(file_content) > 10 * 1024 * 1024:  # 10MB
            raise HTTPException(
                status_code=400,
                detail="File size too large. Maximum 10MB allowed."
            )
        
        # Reset file pointer
        await file.seek(0)
        
        # Create unique filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        file_extension = os.path.splitext(file.filename)[1]
        unique_filename = f"onboarding_{user_id}_{timestamp}{file_extension}"
        
        # Save file to storage
        file_url = simplified_firebase_service.upload_file(
            file_content=file_content,
            filename=file.filename,
            content_type=file.content_type
        )
        
        # Parse resume content using enhanced parser
        if enhanced_resume_parser:
            parsed_data = await enhanced_resume_parser.parse_resume(file_content, file.content_type)
        else:
            # Fallback to basic parsing if enhanced parser is not available
            parsed_data = {
                "personal_info": {"name": None, "email": None, "phone": None},
                "skills": {"technical": [], "soft": [], "domain": []},
                "experience": [],
                "education": [],
                "projects": [],
                "certifications": [],
                "languages": [],
                "awards": [],
                "raw_text": "Resume content extracted",
                "parsing_method": "basic_fallback",
                "parsed_at": datetime.utcnow().isoformat(),
                "statistics": {
                    "total_experience_years": 0,
                    "skill_count": 0,
                    "education_count": 0,
                    "project_count": 0,
                    "certification_count": 0
                }
            }
        
        # Store resume in database
        resume_data = {
            "user_id": user_id,
            "filename": file.filename,
            "original_name": file.filename,
            "file_path": file_url,  # Use file_url as the file path
            "file_url": file_url,
            "file_size": len(file_content),
            "file_type": file.content_type,
            "is_default": True,  # Set as default since it's from onboarding
            "type": "onboarding",
            "parsed_data": parsed_data,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        # Save to resumes collection
        resume_id = simplified_firebase_service.create_document("resumes", resume_data)
        
        # Update user document with default resume ID
        simplified_firebase_service.update_document(
            "users", 
            user_id, 
            {
                "default_resume_id": resume_id,
                "updated_at": datetime.utcnow()
            }
        )
        
        # Prepare parsed data response
        parsed_resume_data = ParsedResumeData(
            raw_text=parsed_data.get("raw_text", ""),
            skills=parsed_data.get("skills", {}).get("technical", []) + parsed_data.get("skills", {}).get("soft", []),
            experience=parsed_data.get("experience", []),
            education=parsed_data.get("education", []),
            contact_info=parsed_data.get("personal_info", {}),
            summary=parsed_data.get("summary", ""),
            certifications=[cert.get("name", "") for cert in parsed_data.get("certifications", [])],
            projects=parsed_data.get("projects", [])
        )
        
        # Prepare preview data
        preview_data = {
            "filename": file.filename,
            "file_size": len(file_content),
            "file_type": file.content_type,
            "skills_count": len(parsed_resume_data.skills),
            "experience_count": len(parsed_resume_data.experience),
            "education_count": len(parsed_resume_data.education),
            "projects_count": len(parsed_resume_data.projects),
            "certifications_count": len(parsed_resume_data.certifications)
        }
        
        return UploadResumeResponse(
            success=True,
            message="Resume uploaded successfully and set as default",
            resume_id=resume_id,
            parsed_data=parsed_resume_data,
            preview=preview_data
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error uploading onboarding resume: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to upload resume: {str(e)}"
        )

@router.get("/default-resume")
async def get_onboarding_default_resume(
    current_user: dict = Depends(get_current_user)
):
    """
    Get user's default resume (set during onboarding)
    """
    try:
        user_id = current_user["uid"]
        
        # Get user document to find default resume ID
        user_doc = simplified_firebase_service.get_document("users", user_id)
        if not user_doc or "default_resume_id" not in user_doc:
            return JSONResponse(
                status_code=200,
                content={
                    "success": True,
                    "message": "No default resume found",
                    "resume": None
                }
            )
        
        # Get the default resume
        default_resume_id = user_doc["default_resume_id"]
        resume_doc = simplified_firebase_service.get_document("resumes", default_resume_id)
        
        if not resume_doc:
            return JSONResponse(
                status_code=200,
                content={
                    "success": True,
                    "message": "Default resume not found",
                    "resume": None
                }
            )
        
        # Prepare response
        resume_data = ParsedResumeData(
            id=default_resume_id,
            filename=resume_doc.get("filename", ""),
            original_name=resume_doc.get("original_name", ""),
            file_url=resume_doc.get("file_url", ""),
            file_size=resume_doc.get("file_size", 0),
            file_type=resume_doc.get("file_type", ""),
            is_default=resume_doc.get("is_default", False),
            parsed_data=resume_doc.get("parsed_data", {}),
            created_at=resume_doc.get("created_at")
        )
        
        return JSONResponse(
            status_code=200,
            content={
                "success": True,
                "message": "Default resume retrieved successfully",
                "resume": resume_data.dict()
            }
        )
        
    except Exception as e:
        print(f"Error getting default resume: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get default resume: {str(e)}"
        )
