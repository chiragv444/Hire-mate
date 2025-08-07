from pydantic import BaseModel, HttpUrl
from typing import Optional, List, Dict, Any
from datetime import datetime

class AnalysisStartRequest(BaseModel):
    """Request model for starting a new analysis"""
    pass  # File upload handled separately

class ResumePreview(BaseModel):
    """Resume preview data"""
    filename: str
    file_size: int
    parsed_text: str
    skills: List[str]
    skills_count: int
    experience_count: int
    education_count: int

class AnalysisStartResponse(BaseModel):
    """Response model for starting a new analysis"""
    success: bool
    message: str
    analysis_id: str
    resume_id: str
    preview: ResumePreview

class JobInputRequest(BaseModel):
    """Request model for job description input"""
    job_description: str
    linkedin_url: Optional[HttpUrl] = None
    analysis_id: Optional[str] = None

class JobBasicInfo(BaseModel):
    """Basic job information"""
    title: str
    company: str
    location: str
    job_type: Optional[str] = None
    experience_level: Optional[str] = None
    salary_info: Optional[str] = None

class JobDescription(BaseModel):
    """Job description details"""
    full_text: str
    summary: str

class ParsedJobResults(BaseModel):
    """Parsed job description results"""
    basic_info: JobBasicInfo
    description: JobDescription
    requirements: List[str]
    responsibilities: List[str]
    qualifications: List[str]
    skills: List[str]
    keywords: List[str]

class JobAnalysisResponse(BaseModel):
    """Response model for job description analysis"""
    success: bool
    message: str
    job_id: str
    parsed_results: ParsedJobResults
    scraped_data: Optional[Dict[str, Any]] = None
    source: str

class AnalysisMatchRequest(BaseModel):
    """Request model for analysis matching"""
    resume_id: str
    job_id: str
    analysis_id: Optional[str] = None

class AnalysisSummary(BaseModel):
    """Analysis summary statistics"""
    total_skills_matched: int
    total_skills_missing: int
    skill_match_percentage: float

class MatchResults(BaseModel):
    """Match results data"""
    match_score: float
    ats_score: float
    fit_level: str
    matching_skills: List[str]
    missing_skills: List[str]
    suggestions: List[str]
    improvements: List[str]
    analysis_summary: AnalysisSummary

class AnalysisMatchResponse(BaseModel):
    """Response model for analysis matching"""
    success: bool
    message: str
    match_id: str
    results: MatchResults

class AnalysisSession(BaseModel):
    """Analysis session data"""
    id: str
    resume_id: Optional[str] = None
    job_id: Optional[str] = None
    match_id: Optional[str] = None
    status: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

class AnalysisHistoryResponse(BaseModel):
    """Response model for analysis history"""
    success: bool
    analyses: List[AnalysisSession]
