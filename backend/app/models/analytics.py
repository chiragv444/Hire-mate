from pydantic import BaseModel, HttpUrl, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime

# Simplified Analytics Models for the new schema

class JobDescriptionData(BaseModel):
    """Job description data within analytics"""
    title: Optional[str] = None
    company: Optional[str] = None
    location: Optional[str] = None
    description: str = Field(default="", description="Job description text - always required as string")
    linkedin_url: Optional[str] = None
    
    @validator('description', pre=True)
    def ensure_description_is_string(cls, v):
        """Ensure description is always a string, never None"""
        if v is None:
            return ""
        return str(v)
    parsed_skills: List[str] = []
    parsed_requirements: List[str] = []
    parsed_responsibilities: List[str] = []
    parsed_qualifications: List[str] = []
    keywords: List[str] = []
    
    # Enhanced fields from the new parser
    raw_data: Dict[str, Any] = {}
    detailed_summary: Optional[str] = None
    parsed_data: Dict[str, Any] = {}
    
    # Additional extracted fields
    experience_level: Optional[str] = None
    years_of_experience: Optional[str] = None
    job_type: Optional[str] = None
    salary_info: Dict[str, Any] = {}
    benefits: List[str] = []
    company_info: Dict[str, Any] = {}

class ResumeData(BaseModel):
    """Resume data within analytics"""
    resume_id: Optional[str] = None
    filename: Optional[str] = None
    original_name: Optional[str] = None
    type: str = "uploaded"  # uploaded, default
    parsed_data: Dict[str, Any] = {}

class AnalysisResults(BaseModel):
    """Analysis results data"""
    match_score: Optional[float] = None
    ats_score: Optional[float] = None
    fit_level: Optional[str] = None
    matching_skills: List[str] = []
    missing_skills: List[str] = []
    suggestions: List[str] = []
    improvements: List[str] = []
    total_skills_matched: Optional[int] = None
    total_skills_missing: Optional[int] = None
    skill_match_percentage: Optional[float] = None

class TrainedModelResults(BaseModel):
    """Trained model prediction results"""
    fit_level: str = Field(description="Predicted fit level: 'Not Fit', 'Possible Fit', or 'Great Fit'")
    percentage: float = Field(description="Confidence percentage (0-100)")
    predicted_at: str = Field(description="ISO timestamp of when prediction was made")

class Analytics(BaseModel):
    """Main analytics document - stores everything in one place"""
    id: Optional[str] = None
    user_id: str
    job_description: Optional[JobDescriptionData] = None
    resume: Optional[ResumeData] = None
    results: Optional[AnalysisResults] = None
    status: str = "in_process"  # in_process, resume_added, completed, failed
    step_number: int = 1  # 1=job_parsed, 2=resume_added, 3=analysis_complete
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    # Enhanced fields for better tracking
    job_raw_data: Dict[str, Any] = {}
    job_detailed_summary: Optional[str] = None
    job_parsed_data: Dict[str, Any] = {}
    
    # Trained model results
    trained_model_results: Optional[TrainedModelResults] = None

# Request/Response Models

class CreateAnalyticsRequest(BaseModel):
    """Request to create new analytics (from job description input)"""
    job_description: str
    linkedin_url: Optional[str] = None

class CreateAnalyticsResponse(BaseModel):
    """Response for creating new analytics"""
    success: bool
    message: str
    analytics_id: str
    parsed_job: JobDescriptionData

class AddResumeToAnalyticsRequest(BaseModel):
    """Request to add resume to existing analytics"""
    analytics_id: str
    resume_id: Optional[str] = None  # If using existing resume
    # File upload handled separately if uploading new resume

class AddResumeToAnalyticsResponse(BaseModel):
    """Response for adding resume to analytics"""
    success: bool
    message: str
    analytics_id: str
    resume_id: str

class PerformAnalysisRequest(BaseModel):
    """Request to perform analysis on analytics"""
    analytics_id: str

class PerformAnalysisResponse(BaseModel):
    """Response for performing analysis"""
    success: bool
    message: str
    analytics_id: str
    results: AnalysisResults

class AnalyticsHistoryResponse(BaseModel):
    """Response for analytics history"""
    success: bool
    analytics: List[Analytics]
