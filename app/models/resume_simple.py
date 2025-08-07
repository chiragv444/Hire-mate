from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

# Simplified Resume Models

class ParsedResumeData(BaseModel):
    """Parsed resume data structure"""
    raw_text: str = ""
    skills: List[str] = []
    experience: List[Dict[str, Any]] = []
    education: List[Dict[str, Any]] = []
    contact_info: Dict[str, Any] = {}
    summary: str = ""
    certifications: List[str] = []
    projects: List[Dict[str, Any]] = []

class Resume(BaseModel):
    """Main resume document"""
    id: Optional[str] = None
    user_id: str
    filename: str
    original_name: str
    file_path: Optional[str] = None
    file_size: Optional[int] = None
    file_type: str
    type: str = "uploaded"  # uploaded, default
    is_default: bool = False
    parsed_data: ParsedResumeData
    created_at: datetime
    updated_at: Optional[datetime] = None

# Request/Response Models

class UploadResumeRequest(BaseModel):
    """Request for uploading resume"""
    analytics_id: Optional[str] = None  # If uploading for specific analytics
    set_as_default: bool = False

class UploadResumeResponse(BaseModel):
    """Response for uploading resume"""
    success: bool
    message: str
    resume_id: str
    parsed_data: ParsedResumeData
    preview: Dict[str, Any]

class ResumeListResponse(BaseModel):
    """Response for listing user's resumes"""
    success: bool
    resumes: List[Resume]

class SetDefaultResumeRequest(BaseModel):
    """Request to set default resume"""
    resume_id: str

class SetDefaultResumeResponse(BaseModel):
    """Response for setting default resume"""
    success: bool
    message: str
