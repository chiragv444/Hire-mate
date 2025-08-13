from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import JSONResponse
from typing import Optional
import os
import uuid
from datetime import datetime

from ..core.auth import get_current_user
from ..core.config import settings
from ..services.resume_parser import resume_parser
from ..services.job_scraper import job_scraper
from ..core.firebase import firebase_service
from ..services.firebase_storage import firebase_storage_service
from ..models.analysis import (
    AnalysisStartRequest, 
    AnalysisStartResponse, 
    JobInputRequest, 
    JobAnalysisResponse,
    AnalysisMatchRequest,
    AnalysisMatchResponse
)

router = APIRouter(prefix="/analysis", tags=["analysis"])

@router.post("/start", response_model=AnalysisStartResponse)
async def start_new_analysis(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Start a new analysis by uploading a resume (from "New Analysis" button)
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
            file_metadata['file_path'], 
            file_metadata['file_type']
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
            'is_default': False,  # Not default for analysis flow
            'analysis_context': True  # Mark as uploaded for analysis
        }
        
        # Save to Firestore
        resume_id = firebase_service.save_resume_analysis(
            current_user['uid'], 
            resume_data
        )
        
        # The resume_id is the analysis_id for this new session
        analysis_id = resume_id

        # Update the session with initial status
        firebase_service.update_analysis_session(
            current_user['uid'],
            analysis_id,
            {'status': 'resume_uploaded'}
        )

        return AnalysisStartResponse(
            success=True,
            message="Resume uploaded and parsed successfully",
            analysis_id=analysis_id,
            resume_id=resume_id,
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
            detail=f"Error processing resume: {str(e)}"
        )

@router.post("/job-input", response_model=JobAnalysisResponse)
async def analyze_job_description(
    request: JobInputRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Analyze job description (either pasted text or LinkedIn URL)
    """
    try:
        job_data = {}
        scraped_data = None
        
        # If LinkedIn URL is provided, scrape it first
        if request.linkedin_url:
            try:
                scraped_data = await job_scraper.scrape_linkedin_job(str(request.linkedin_url))
                # Use scraped description if available, otherwise use provided description
                description_to_parse = scraped_data.get('description', request.job_description)
                
                # If scraping failed but returned error structure, use provided description
                if scraped_data.get('scraping_error'):
                    description_to_parse = request.job_description
                    
            except Exception as e:
                # If scraping fails, use the provided description
                description_to_parse = request.job_description
                scraped_data = {'error': str(e)}
        else:
            description_to_parse = request.job_description
        
        # Parse the job description
        parsed_data = await job_scraper.parse_job_description(description_to_parse)
        
        # Prepare job data for Firestore
        job_data = {
            'title': parsed_data.get('title', scraped_data.get('title', 'Job Title')),
            'company': parsed_data.get('company', scraped_data.get('company', 'Company')),
            'location': parsed_data.get('location', scraped_data.get('location', 'Location')),
            'description': description_to_parse,
            'skills': parsed_data.get('skills', []),
            'requirements': parsed_data.get('requirements', []),
            'responsibilities': parsed_data.get('responsibilities', []),
            'qualifications': parsed_data.get('qualifications', []),
            'keywords': parsed_data.get('keywords', []),
            'experience_level': parsed_data.get('experience_level', scraped_data.get('experience_level')),
            'job_type': parsed_data.get('job_type', scraped_data.get('job_type')),
            'salary_info': parsed_data.get('salary_info', scraped_data.get('salary_range')),
            'linkedin_url': str(request.linkedin_url) if request.linkedin_url else None,
            'source': 'linkedin' if request.linkedin_url else 'manual',
            'analysis_id': request.analysis_id if hasattr(request, 'analysis_id') else None
        }
        
        # Prepare job data to be updated in the analysis session
        update_data = {
            'job_data': job_data,
            'status': 'job_analyzed',
            'updated_at': datetime.now()
        }

        # Update analysis session
        if not hasattr(request, 'analysis_id') or not request.analysis_id:
            raise HTTPException(
                status_code=400,
                detail="analysis_id is required to analyze a job description."
            )

        success = firebase_service.update_analysis_session(
            current_user['uid'],
            request.analysis_id,
            update_data
        )

        if not success:
            raise HTTPException(
                status_code=404,
                detail="Analysis session not found or user not authorized."
            )

        # Format parsed results for frontend display
        formatted_results = {
            'basic_info': {
                'title': job_data['title'],
                'company': job_data['company'],
                'location': job_data['location'],
                'job_type': job_data['job_type'],
                'experience_level': job_data['experience_level'],
                'salary_info': job_data['salary_info']
            },
            'description': {
                'full_text': description_to_parse,
                'summary': description_to_parse[:300] + '...' if len(description_to_parse) > 300 else description_to_parse
            },
            'requirements': job_data['requirements'],
            'responsibilities': job_data['responsibilities'],
            'qualifications': job_data['qualifications'],
            'skills': job_data['skills'],
            'keywords': job_data['keywords']
        }

        return JobAnalysisResponse(
            success=True,
            message="Job description analyzed successfully",
            job_id=request.analysis_id,  # The job_id is now the analysis_id
            parsed_results=formatted_results,
            scraped_data=scraped_data if not scraped_data.get('scraping_error') else None,
            source=job_data['source']
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error analyzing job description: {str(e)}"
        )

@router.post("/match", response_model=AnalysisMatchResponse)
async def perform_analysis_match(
    request: AnalysisMatchRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Perform resume-job matching analysis
    """
    try:
        # Get resume data
        user_ref = firebase_service.db.collection('users').document(current_user['uid'])
        resume_ref = user_ref.collection('resumes').document(request.resume_id)
        resume_doc = resume_ref.get()
        
        if not resume_doc.exists:
            raise HTTPException(
                status_code=404,
                detail="Analysis session not found"
            )
        
        resume_parsed_data = analysis_doc.get('parsed_data', {})
        job_parsed_data = analysis_doc.get('job_data', {}).get('parsed_data', {})
        
        if not resume_parsed_data or not job_parsed_data:
            raise HTTPException(
                status_code=400,
                detail="Resume or job data is missing from the analysis session."
            )

        resume_skills = set(resume_parsed_data.get('skills', []))
        job_skills = set(job_parsed_data.get('skills', []))
        
        resume_text = resume_parsed_data.get('raw_text', '')
        job_description = job_parsed_data.get('description', '')
        
        # Calculate match score
        match_score = _calculate_match_score(resume_skills, job_skills, resume_text, job_description)
        
        # Calculate ATS score
        ats_score = _calculate_ats_score(resume_text, job_description)
        
        # Determine fit level
        fit_level = _determine_fit_level(match_score)
        
        # Find missing skills
        missing_skills = list(job_skills - resume_skills)
        matching_skills = list(resume_skills & job_skills)
        
        # Generate suggestions
        suggestions = _generate_suggestions(missing_skills, match_score)
        improvements = _generate_improvements(missing_skills, match_score)
        
        # Prepare match results
        match_results = {
            'match_score': round(match_score, 1),
            'ats_score': round(ats_score, 1),
            'fit_level': fit_level,
            'matching_skills': matching_skills,
            'missing_skills': missing_skills[:10],  # Limit to top 10
            'suggestions': suggestions,
            'improvements': improvements,
            'analysis_summary': {
                'total_skills_matched': len(matching_skills),
                'total_skills_missing': len(missing_skills),
                'skill_match_percentage': round((len(matching_skills) / len(job_skills)) * 100, 1) if job_skills else 0
            }
        }
        
        # Prepare data to update in the analysis session
        update_data = {
            'match_results': match_results,
            'status': 'completed',
            'completed_at': datetime.now()
        }

        # Update analysis session with match results
        success = firebase_service.update_analysis_session(
            current_user['uid'],
            request.analysis_id,
            update_data
        )

        if not success:
            raise HTTPException(
                status_code=500,
                detail="Failed to save analysis results."
            )

        return AnalysisMatchResponse(
            success=True,
            message="Analysis completed successfully",
            match_id=request.analysis_id,  # The match_id is the analysis_id
            results=match_results
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error performing analysis: {str(e)}"
        )

# Helper functions for matching calculations
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
