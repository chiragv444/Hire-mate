from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import JSONResponse
from typing import Optional
import os
from datetime import datetime

from ..core.auth import get_current_user
from ..core.config import settings
from ..services.resume_parser import resume_parser
from ..services.job_scraper import job_scraper
from ..services.firebase_simple import simplified_firebase_service
from ..models.analytics import (
    CreateAnalyticsRequest,
    CreateAnalyticsResponse,
    AddResumeToAnalyticsRequest,
    AddResumeToAnalyticsResponse,
    PerformAnalysisRequest,
    PerformAnalysisResponse,
    AnalyticsHistoryResponse,
    JobDescriptionData,
    ResumeData,
    AnalysisResults
)
from ..models.resume_simple import (
    UploadResumeRequest,
    UploadResumeResponse,
    ResumeListResponse,
    SetDefaultResumeRequest,
    SetDefaultResumeResponse,
    ParsedResumeData
)

router = APIRouter(prefix="/analytics", tags=["analytics"])

@router.post("/create", response_model=CreateAnalyticsResponse)
async def create_analytics(
    request: CreateAnalyticsRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Create new analytics from job description (Step 1 of the flow)
    This is called when user submits job description from the "New Analysis" page
    """
    try:
        # Parse job description - handle LinkedIn URL vs plain text
        if request.linkedin_url:
            # If LinkedIn URL is provided, scrape from LinkedIn
            parsed_job = await job_scraper.scrape_linkedin_job(request.linkedin_url)
        else:
            # If no LinkedIn URL, parse the plain text job description
            parsed_job = await job_scraper.parse_job_description(request.job_description)
        
        # Create job description data
        job_data = JobDescriptionData(
            title=parsed_job.get('title'),
            company=parsed_job.get('company'),
            location=parsed_job.get('location'),
            description=request.job_description,
            linkedin_url=request.linkedin_url,
            parsed_skills=parsed_job.get('skills', []),
            parsed_requirements=parsed_job.get('requirements', []),
            parsed_responsibilities=parsed_job.get('responsibilities', []),
            parsed_qualifications=parsed_job.get('qualifications', []),
            keywords=parsed_job.get('keywords', [])
        )
        
        # Create analytics document
        analytics_data = {
            'job_description': job_data.dict(),
            'resume': None,
            'results': None,
            'status': 'job_added',
            'created_at': datetime.now(),
            'updated_at': datetime.now()
        }
        
        # Save to Firestore
        analytics_id = simplified_firebase_service.create_analytics(
            current_user['uid'], 
            analytics_data
        )
        
        return CreateAnalyticsResponse(
            success=True,
            message="Job description parsed and analytics created successfully",
            analytics_id=analytics_id,
            parsed_job=job_data
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error creating analytics: {str(e)}"
        )

@router.post("/upload-resume", response_model=UploadResumeResponse)
async def upload_resume_for_analytics(
    file: UploadFile = File(...),
    analytics_id: Optional[str] = Form(None),
    current_user: dict = Depends(get_current_user)
):
    """
    Upload resume (can be for specific analytics or just to add to user's resume collection)
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
        
        # Save file
        file_metadata = await resume_parser.save_uploaded_file(
            file_content, 
            file.filename, 
            settings.upload_dir
        )
        
        # Parse resume
        parsed_data = await resume_parser.parse_resume(
            file_metadata['file_path'], 
            file_metadata['file_type']
        )
        
        # Create parsed resume data
        parsed_resume_data = ParsedResumeData(
            raw_text=parsed_data.get('raw_text', ''),
            skills=parsed_data.get('skills', []),
            experience=parsed_data.get('experience', []),
            education=parsed_data.get('education', []),
            contact_info=parsed_data.get('contact_info', {}),
            summary=parsed_data.get('summary', ''),
            certifications=parsed_data.get('certifications', []),
            projects=parsed_data.get('projects', [])
        )
        
        # Prepare resume data for Firestore
        resume_data = {
            'filename': file_metadata['filename'],
            'original_name': file_metadata['original_name'],
            'file_path': file_metadata['file_path'],
            'file_size': file_metadata['file_size'],
            'file_type': file_metadata['file_type'],
            'type': 'uploaded',
            'is_default': False,
            'parsed_data': parsed_resume_data.dict(),
            'created_at': datetime.now(),
            'updated_at': datetime.now()
        }
        
        # Save resume to collection
        resume_id = simplified_firebase_service.create_resume(
            current_user['uid'], 
            resume_data
        )
        
        # If analytics_id is provided, update the analytics with resume data
        if analytics_id:
            resume_ref_data = ResumeData(
                resume_id=resume_id,
                filename=file_metadata['filename'],
                original_name=file_metadata['original_name'],
                type='uploaded',
                parsed_data=parsed_resume_data.dict()
            )
            
            update_success = simplified_firebase_service.update_analytics(
                analytics_id,
                current_user['uid'],
                {
                    'resume': resume_ref_data.dict(),
                    'status': 'resume_added'
                }
            )
            
            if not update_success:
                raise HTTPException(
                    status_code=404,
                    detail="Analytics not found or access denied"
                )
        
        return UploadResumeResponse(
            success=True,
            message="Resume uploaded and parsed successfully",
            resume_id=resume_id,
            parsed_data=parsed_resume_data,
            preview={
                'filename': file_metadata['original_name'],
                'file_size': file_metadata['file_size'],
                'parsed_text': parsed_data.get('raw_text', '')[:500] + '...' if len(parsed_data.get('raw_text', '')) > 500 else parsed_data.get('raw_text', ''),
                'skills': parsed_data.get('skills', []),
                'skills_count': len(parsed_data.get('skills', [])),
                'experience_count': len(parsed_data.get('experience', [])),
                'education_count': len(parsed_data.get('education', []))
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error uploading resume: {str(e)}"
        )

@router.post("/add-resume", response_model=AddResumeToAnalyticsResponse)
async def add_existing_resume_to_analytics(
    request: AddResumeToAnalyticsRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Add existing resume to analytics (when user selects from their resume list)
    """
    try:
        # Get the resume
        resume_data = simplified_firebase_service.get_resume(
            request.resume_id, 
            current_user['uid']
        )
        
        if not resume_data:
            raise HTTPException(
                status_code=404,
                detail="Resume not found"
            )
        
        # Create resume reference data for analytics
        resume_ref_data = ResumeData(
            resume_id=request.resume_id,
            filename=resume_data.get('filename'),
            original_name=resume_data.get('original_name'),
            type=resume_data.get('type', 'uploaded'),
            parsed_data=resume_data.get('parsed_data', {})
        )
        
        # Update analytics with resume data
        update_success = simplified_firebase_service.update_analytics(
            request.analytics_id,
            current_user['uid'],
            {
                'resume': resume_ref_data.dict(),
                'status': 'resume_added'
            }
        )
        
        if not update_success:
            raise HTTPException(
                status_code=404,
                detail="Analytics not found or access denied"
            )
        
        return AddResumeToAnalyticsResponse(
            success=True,
            message="Resume added to analytics successfully",
            analytics_id=request.analytics_id,
            resume_id=request.resume_id
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error adding resume to analytics: {str(e)}"
        )

@router.post("/perform-analysis", response_model=PerformAnalysisResponse)
async def perform_analysis(
    request: PerformAnalysisRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Perform the actual analysis between resume and job description
    """
    try:
        # Get analytics data
        analytics_data = simplified_firebase_service.get_analytics(
            request.analytics_id,
            current_user['uid']
        )
        
        if not analytics_data:
            raise HTTPException(
                status_code=404,
                detail="Analytics not found"
            )
        
        if not analytics_data.get('job_description') or not analytics_data.get('resume'):
            raise HTTPException(
                status_code=400,
                detail="Analytics must have both job description and resume before analysis"
            )
        
        # Extract data for analysis
        job_data = analytics_data['job_description']
        resume_data = analytics_data['resume']
        
        job_skills = set(job_data.get('parsed_skills', []))
        job_keywords = set(job_data.get('keywords', []))
        job_description_text = job_data.get('description', '')
        
        resume_skills = set(resume_data.get('parsed_data', {}).get('skills', []))
        resume_text = resume_data.get('parsed_data', {}).get('raw_text', '')
        
        # Perform matching calculations
        matching_skills = list(resume_skills & job_skills)
        missing_skills = list(job_skills - resume_skills)
        
        # Calculate match score
        match_score = _calculate_match_score(resume_skills, job_skills, resume_text, job_description_text)
        
        # Calculate ATS score
        ats_score = _calculate_ats_score(resume_text, job_description_text)
        
        # Determine fit level
        fit_level = _determine_fit_level(match_score)
        
        # Generate suggestions and improvements
        suggestions = _generate_suggestions(missing_skills, match_score)
        improvements = _generate_improvements(missing_skills, match_score)
        
        # Create results
        results = AnalysisResults(
            match_score=round(match_score, 1),
            ats_score=round(ats_score, 1),
            fit_level=fit_level,
            matching_skills=matching_skills,
            missing_skills=missing_skills,
            suggestions=suggestions,
            improvements=improvements,
            total_skills_matched=len(matching_skills),
            total_skills_missing=len(missing_skills),
            skill_match_percentage=round((len(matching_skills) / len(job_skills)) * 100, 1) if job_skills else 0
        )
        
        # Update analytics with results
        update_success = simplified_firebase_service.update_analytics(
            request.analytics_id,
            current_user['uid'],
            {
                'results': results.dict(),
                'status': 'completed'
            }
        )
        
        if not update_success:
            raise HTTPException(
                status_code=500,
                detail="Failed to save analysis results"
            )
        
        return PerformAnalysisResponse(
            success=True,
            message="Analysis completed successfully",
            analytics_id=request.analytics_id,
            results=results
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error performing analysis: {str(e)}"
        )

@router.get("/history", response_model=AnalyticsHistoryResponse)
async def get_analytics_history(
    current_user: dict = Depends(get_current_user)
):
    """
    Get user's analytics history for the dashboard
    """
    try:
        analytics_list = simplified_firebase_service.get_user_analytics_history(
            current_user['uid']
        )
        
        return AnalyticsHistoryResponse(
            success=True,
            analytics=analytics_list
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error getting analytics history: {str(e)}"
        )

@router.get("/{analytics_id}")
async def get_analytics_details(
    analytics_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get specific analytics details
    """
    try:
        analytics_data = simplified_firebase_service.get_analytics(
            analytics_id,
            current_user['uid']
        )
        
        if not analytics_data:
            raise HTTPException(
                status_code=404,
                detail="Analytics not found"
            )
        
        return JSONResponse(content={
            "success": True,
            "analytics": analytics_data
        })
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error getting analytics details: {str(e)}"
        )

# Resume management endpoints

@router.get("/resumes/list", response_model=ResumeListResponse)
async def get_user_resumes(
    current_user: dict = Depends(get_current_user)
):
    """
    Get all user's resumes
    """
    try:
        resumes = simplified_firebase_service.get_user_resumes(current_user['uid'])
        
        return ResumeListResponse(
            success=True,
            resumes=resumes
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error getting resumes: {str(e)}"
        )

@router.post("/resumes/set-default", response_model=SetDefaultResumeResponse)
async def set_default_resume(
    request: SetDefaultResumeRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Set a resume as default
    """
    try:
        success = simplified_firebase_service.set_default_resume(
            current_user['uid'],
            request.resume_id
        )
        
        if not success:
            raise HTTPException(
                status_code=404,
                detail="Resume not found or access denied"
            )
        
        return SetDefaultResumeResponse(
            success=True,
            message="Default resume set successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error setting default resume: {str(e)}"
        )

@router.get("/resumes/default")
async def get_default_resume(
    current_user: dict = Depends(get_current_user)
):
    """
    Get user's default resume
    """
    try:
        default_resume = simplified_firebase_service.get_default_resume(current_user['uid'])
        
        return JSONResponse(content={
            "success": True,
            "resume": default_resume
        })
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error getting default resume: {str(e)}"
        )

# Helper functions for analysis calculations

def _calculate_match_score(resume_skills: set, job_skills: set, resume_text: str, job_description: str) -> float:
    """Calculate match score between resume and job"""
    if not job_skills:
        return 0.0
    
    # Skill-based matching (70% weight)
    skill_match = len(resume_skills & job_skills) / len(job_skills) * 70
    
    # Text similarity matching (30% weight)
    resume_words = set(resume_text.lower().split())
    job_words = set(job_description.lower().split())
    
    if job_words:
        text_match = len(resume_words & job_words) / len(job_words) * 30
    else:
        text_match = 0
    
    return min(skill_match + text_match, 100.0)

def _calculate_ats_score(resume_text: str, job_description: str) -> float:
    """Calculate ATS (Applicant Tracking System) score"""
    job_keywords = job_description.lower().split()
    resume_keywords = resume_text.lower().split()
    
    if not job_keywords:
        return 0.0
    
    keyword_matches = 0
    total_keywords = len(set(job_keywords))
    
    for keyword in set(job_keywords):
        if keyword in resume_keywords:
            keyword_matches += 1
    
    if total_keywords > 0:
        ats_score = (keyword_matches / total_keywords) * 100
    else:
        ats_score = 0
    
    return min(ats_score, 100.0)

def _determine_fit_level(match_score: float) -> str:
    """Determine fit level based on match score"""
    if match_score >= 80:
        return "Great Fit"
    elif match_score >= 60:
        return "Possible Fit"
    else:
        return "Not Fit"

def _generate_suggestions(missing_skills: list, match_score: float) -> list:
    """Generate suggestions based on missing skills and match score"""
    suggestions = []
    
    if missing_skills:
        suggestions.append(f"Add these skills to your resume: {', '.join(missing_skills[:5])}")
    
    if match_score < 60:
        suggestions.append("Consider tailoring your resume to better match the job requirements")
        suggestions.append("Highlight relevant experience and achievements")
    
    if match_score < 40:
        suggestions.append("This position may not be the best fit for your current skillset")
        suggestions.append("Consider applying to roles that better match your experience")
    
    return suggestions

def _generate_improvements(missing_skills: list, match_score: float) -> list:
    """Generate specific improvement suggestions"""
    improvements = []
    
    for skill in missing_skills[:3]:  # Focus on top 3 missing skills
        improvements.append(f"Gain experience with {skill} through online courses or projects")
    
    if match_score < 70:
        improvements.append("Quantify your achievements with specific metrics")
        improvements.append("Use industry-specific keywords from the job description")
    
    return improvements
