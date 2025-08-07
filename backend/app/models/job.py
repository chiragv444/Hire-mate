from pydantic import BaseModel, Field, HttpUrl
from typing import Optional, List, Dict, Any
from datetime import datetime

class JobInputRequest(BaseModel):
    """Request model for job description input"""
    job_description: str = Field(..., min_length=10, description="Job description text")
    linkedin_url: Optional[HttpUrl] = Field(None, description="LinkedIn job URL (optional)")

class ScrapedJobData(BaseModel):
    """Scraped job data from LinkedIn"""
    title: str
    company: str
    location: str
    description: str
    requirements: List[str] = []
    benefits: List[str] = []
    salary_range: Optional[str] = None
    job_type: Optional[str] = None
    experience_level: Optional[str] = None

class ParsedJobData(BaseModel):
    """Parsed job description data"""
    title: str
    company: str
    location: str
    description: str
    skills: List[str] = []
    requirements: List[str] = []
    responsibilities: List[str] = []
    qualifications: List[str] = []
    keywords: List[str] = []
    experience_level: Optional[str] = None
    job_type: Optional[str] = None
    salary_info: Optional[str] = None

class JobAnalysisResponse(BaseModel):
    """Response model for job analysis"""
    success: bool
    message: str
    job_id: Optional[str] = None
    parsed_data: Optional[ParsedJobData] = None
    scraped_data: Optional[ScrapedJobData] = None
    error: Optional[str] = None

class JobMatchRequest(BaseModel):
    """Request model for job matching"""
    resume_id: str = Field(..., description="Resume ID to match against")
    job_id: str = Field(..., description="Job ID to match against")

class JobMatchResponse(BaseModel):
    """Response model for job matching results"""
    success: bool
    match_score: float
    ats_score: float
    fit_level: str  # "Not Fit", "Possible Fit", "Great Fit"
    missing_skills: List[str]
    suggestions: List[str]
    strengths: List[str]
    improvements: List[str]
    error: Optional[str] = None 