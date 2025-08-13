from pydantic import BaseModel, Field, HttpUrl
from typing import Optional, List, Dict, Any
from datetime import datetime

class CompanyInfo(BaseModel):
    """Comprehensive company information"""
    name: str
    industry: Optional[str] = None
    size: Optional[str] = None
    location: Optional[str] = None
    website: Optional[str] = None
    description: Optional[str] = None
    linkedin_url: Optional[str] = None
    company_type: Optional[str] = None
    founded_year: Optional[str] = None
    revenue: Optional[str] = None
    specialties: List[str] = []

class JobLocation(BaseModel):
    """Job location details"""
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    is_remote: bool = False
    is_hybrid: bool = False
    full_location: Optional[str] = None
    timezone: Optional[str] = None
    relocation_assistance: Optional[bool] = None

class SalaryInfo(BaseModel):
    """Salary and compensation information"""
    min_salary: Optional[str] = None
    max_salary: Optional[str] = None
    currency: Optional[str] = None
    period: Optional[str] = None
    equity: Optional[str] = None
    bonus: Optional[str] = None
    commission: Optional[str] = None

class JobRequirements(BaseModel):
    """Job requirements and qualifications"""
    required_skills: List[str] = []
    preferred_skills: List[str] = []
    education: List[str] = []
    certifications: List[str] = []
    experience_level: Optional[str] = None
    years_of_experience: Optional[str] = None
    languages: List[str] = []
    tools_technologies: List[str] = []
    industry_experience: List[str] = []
    domain_knowledge: List[str] = []

class JobBenefits(BaseModel):
    """Job benefits and perks"""
    health_insurance: bool = False
    dental_vision: bool = False
    retirement_401k: bool = False
    paid_time_off: bool = False
    flexible_schedule: bool = False
    remote_work: bool = False
    professional_development: bool = False
    stock_options: bool = False
    other_benefits: List[str] = []
    gym_membership: bool = False
    commuter_benefits: bool = False
    tuition_reimbursement: bool = False

class JobDetails(BaseModel):
    """Additional job details"""
    job_type: Optional[str] = None
    seniority_level: Optional[str] = None
    job_function: Optional[str] = None
    industries: List[str] = []
    posted_date: Optional[str] = None
    application_deadline: Optional[str] = None
    number_of_applicants: Optional[str] = None
    application_method: Optional[str] = None
    visa_sponsorship: Optional[bool] = None
    travel_requirements: Optional[str] = None
    team_size: Optional[str] = None
    reporting_structure: Optional[str] = None

class ParsedJobStructure(BaseModel):
    """Complete parsed job structure"""
    title: Optional[str] = None
    company: CompanyInfo
    location: JobLocation
    salary: SalaryInfo
    requirements: JobRequirements
    benefits: JobBenefits
    details: JobDetails
    description: Optional[str] = None
    responsibilities: List[str] = []
    qualifications: List[str] = []
    summary: Optional[str] = None
    linkedin_url: Optional[str] = None
    company_culture: Optional[str] = None
    growth_opportunities: Optional[str] = None
    work_environment: Optional[str] = None

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
    enhanced_data: Optional[ParsedJobStructure] = None
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