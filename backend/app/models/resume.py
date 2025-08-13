from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

class ResumeUploadRequest(BaseModel):
    """Request model for resume upload"""
    is_default: bool = Field(default=False, description="Whether this should be set as default resume")

class ResumeMetadata(BaseModel):
    """Resume file metadata"""
    filename: str
    original_name: str
    file_size: int
    file_type: str
    upload_date: datetime
    file_path: str

class ParsedResumeData(BaseModel):
    """Parsed resume content"""
    raw_text: str
    skills: Dict[str, List[str]] = Field(default_factory=lambda: {"technical": [], "soft": [], "domain": []})
    experience: List[Dict[str, Any]] = []
    education: List[Dict[str, Any]] = []
    contact_info: Dict[str, str] = {}
    summary: Optional[str] = None
    languages: List[str] = []
    certifications: List[str] = []
    professional_summary: Optional[str] = Field(description="AI-generated comprehensive professional summary")
    career_highlights: List[str] = Field(description="Key career achievements and highlights", default_factory=list)
    industry_expertise: List[str] = Field(description="Areas of industry expertise", default_factory=list)
    leadership_experience: List[str] = Field(description="Leadership and management experience", default_factory=list)
    projects: List[Dict[str, Any]] = []
    awards: List[str] = []
    personal_info: Dict[str, Any] = {}

class ResumeAnalysisResponse(BaseModel):
    """Response model for resume analysis"""
    success: bool
    message: str
    resume_id: Optional[str] = None
    metadata: Optional[ResumeMetadata] = None
    parsed_data: Optional[ParsedResumeData] = None
    is_default: bool = False
    error: Optional[str] = None

class ResumePreviewResponse(BaseModel):
    """Response model for resume preview"""
    success: bool
    filename: str
    file_size: int
    parsed_text: str
    skills: Dict[str, List[str]] = Field(default_factory=lambda: {"technical": [], "soft": [], "domain": []})
    error: Optional[str] = None 