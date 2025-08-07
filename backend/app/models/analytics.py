from pydantic import BaseModel, HttpUrl
from typing import Optional, List, Dict, Any
from datetime import datetime

# Simplified Analytics Models for the new schema

class JobDescriptionData(BaseModel):
    """Job description data within analytics"""
    title: Optional[str] = None
    company: Optional[str] = None
    location: Optional[str] = None
    description: str
    linkedin_url: Optional[str] = None
    parsed_skills: List[str] = []
    parsed_requirements: List[str] = []
    parsed_responsibilities: List[str] = []
    parsed_qualifications: List[str] = []
    keywords: List[str] = []

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

class Analytics(BaseModel):
    """Main analytics document - stores everything in one place"""
    id: Optional[str] = None
    user_id: str
    job_description: Optional[JobDescriptionData] = None
    resume: Optional[ResumeData] = None
    results: Optional[AnalysisResults] = None
    status: str = "draft"  # draft, job_added, resume_added, completed
    created_at: datetime
    updated_at: Optional[datetime] = None

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
