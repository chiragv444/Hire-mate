from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import JSONResponse
from typing import Optional, Dict, Any
import os
from datetime import datetime

from ..core.auth import get_current_user
from ..core.config import settings
from ..services.enhanced_resume_parser import enhanced_resume_parser
from ..services.enhanced_resume_analyzer import enhanced_resume_analyzer
from ..services.enhanced_job_parser import enhanced_job_parser
from ..services.firebase_simple import simplified_firebase_service
from ..services.firebase_storage import firebase_storage_service
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

# Test endpoint for job parser
@router.post("/test-job-parser")
async def test_job_parser(
    request: CreateAnalyticsRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Test endpoint to debug job parser issues
    """
    try:
        if not enhanced_job_parser:
            return JSONResponse(content={
                "success": False,
                "error": "Job parser not available",
                "details": "The enhanced_job_parser is None"
            })
        
        # Test the parser
        test_result = enhanced_job_parser.test_parser()
        
        # Test URL validation
        url_valid = enhanced_job_parser._is_valid_linkedin_job_url(request.linkedin_url) if request.linkedin_url else False
        
        # Test job ID extraction
        job_id = None
        if request.linkedin_url:
            job_id = enhanced_job_parser._extract_job_id_from_url(request.linkedin_url)
        
        # Check system dependencies
        system_deps = enhanced_job_parser.check_system_dependencies()
        
        return JSONResponse(content={
            "success": True,
            "parser_test": test_result,
            "url_valid": url_valid,
            "job_id": job_id,
            "linkedin_url": request.linkedin_url,
            "langchain_available": enhanced_job_parser.langchain_available,
            "openai_key_set": bool(os.getenv("OPENAI_API_KEY")),
            "system_dependencies": system_deps
        })
        
    except Exception as e:
        return JSONResponse(content={
            "success": False,
            "error": str(e),
            "traceback": str(e.__traceback__)
        })

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
        # Check if we have a LinkedIn URL to scrape
        if request.linkedin_url and enhanced_job_parser:
            try:
                print(f"Attempting to scrape LinkedIn job: {request.linkedin_url}")
                # Use the enhanced job parser to scrape the LinkedIn job
                scraped_job_data = await enhanced_job_parser.scrape_linkedin_job(request.linkedin_url)
                
                # Extract the scraped data
                job_data = JobDescriptionData(
                    title=scraped_job_data.get('title', 'Job Title Not Found'),
                    company=scraped_job_data.get('company', {}).get('name', 'Company Not Found'),
                    location=scraped_job_data.get('location', {}).get('full_location', 'Location Not Found'),
                    description=scraped_job_data.get('description', str(request.job_description or 'No description provided')),
                    linkedin_url=request.linkedin_url,
                    parsed_skills=scraped_job_data.get('requirements', {}).get('required_skills', []),
                    parsed_requirements=scraped_job_data.get('requirements', {}).get('required_skills', []),
                    parsed_responsibilities=scraped_job_data.get('responsibilities', []),
                    parsed_qualifications=scraped_job_data.get('qualifications', []),
                    keywords=[],
                    
                    # Enhanced fields
                    raw_data=scraped_job_data.get('raw_data', {}),
                    detailed_summary=scraped_job_data.get('detailed_summary', 'AI analysis completed'),
                    parsed_data=scraped_job_data,
                    experience_level=scraped_job_data.get('requirements', {}).get('experience_level', ''),
                    years_of_experience=scraped_job_data.get('requirements', {}).get('years_of_experience', ''),
                    job_type=scraped_job_data.get('details', {}).get('job_type', ''),
                    salary_info=scraped_job_data.get('salary', {}),
                    benefits=[],
                    company_info=scraped_job_data.get('company', {})
                )
                
                print(f"LinkedIn job scraped successfully: {job_data.title} at {job_data.company}")
                
            except Exception as e:
                print(f"LinkedIn scraping failed: {e}")
                # Fall back to basic approach if scraping fails
                job_data = JobDescriptionData(
                    title='Job Title (Please provide more details)',
                    company='Company (Please provide more details)',
                    location='Location (Please provide more details)',
                    description=str(request.job_description or 'No description provided'),
                    linkedin_url=request.linkedin_url,
                    parsed_skills=[],
                    parsed_requirements=[],
                    parsed_responsibilities=[],
                    parsed_qualifications=[],
                    keywords=[],
                    
                    # Enhanced fields
                    raw_data={},
                    detailed_summary=f'LinkedIn scraping failed: {str(e)}. Please provide job description manually.',
                    parsed_data={},
                    experience_level='',
                    years_of_experience='',
                    job_type='',
                    salary_info={},
                    benefits=[],
                    company_info={}
                )
        else:
            # No LinkedIn URL or parser not available, use basic approach
            job_data = JobDescriptionData(
                title='Job Title (Please provide more details)',
                company='Company (Please provide more details)',
                location='Location (Please provide more details)',
                description=str(request.job_description or 'No description provided'),
                linkedin_url=request.linkedin_url,
                parsed_skills=[],
                parsed_requirements=[],
                parsed_responsibilities=[],
                parsed_qualifications=[],
                keywords=[],
                
                # Enhanced fields
                raw_data={},
                detailed_summary='AI analysis coming soon with LangChain + OpenAI integration',
                parsed_data={},
                experience_level='',
                years_of_experience='',
                job_type='',
                salary_info={},
                benefits=[],
                company_info={}
            )
        
        # Create analytics document with enhanced structure
        analytics_data = {
            'job_description': job_data.dict(),
            'job_raw_data': job_data.raw_data,
            'job_detailed_summary': job_data.detailed_summary,
            'job_parsed_data': job_data.parsed_data,
            'resume': None,
            'results': None,
            'status': 'in_process',
            'step_number': 1,
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
            message="Job description received and processed successfully.",
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
        
        # Save file to Firebase Storage
        file_url = firebase_storage_service.upload_file(
            file_content=file_content,
            filename=file.filename,
            content_type=file.content_type,
            folder="resumes"
        )
        
        # Create file metadata
        file_metadata = {
            'filename': file.filename,
            'original_name': file.filename,
            'file_path': file_url,
            'file_size': len(file_content),
            'file_type': file.content_type
        }
        
        # For now, we'll use a simplified approach since we removed the heavy resume parser
        # In the future, you can integrate with your LangChain + OpenAI implementation
        parsed_data = {
            "personal_info": {"name": None, "email": None, "phone": None},
            "skills": {"technical": [], "soft": [], "domain": []},
            "experience": [],
            "education": [],
            "projects": [],
            "certifications": [],
            "languages": [],
            "awards": [],
            "raw_text": "Resume content extracted (AI parsing coming soon with LangChain + OpenAI)",
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
        
        # Create parsed resume data
        parsed_resume_data = ParsedResumeData(
            raw_text=parsed_data.get('raw_text', ''),
            skills=parsed_data.get('skills', {}).get('technical', []) + parsed_data.get('skills', {}).get('soft', []),
            experience=parsed_data.get('experience', []),
            education=parsed_data.get('education', []),
            contact_info=parsed_data.get('personal_info', {}),
            summary=parsed_data.get('summary', ''),
            certifications=[cert.get("name", "") for cert in parsed_data.get('certifications', [])],
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
            message="Resume uploaded successfully. AI parsing coming soon with LangChain + OpenAI integration.",
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

@router.post("/link-default-resume", response_model=AddResumeToAnalyticsResponse)
async def link_default_resume_to_analytics(
    request: AddResumeToAnalyticsRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Link user's default resume to analytics (when user chooses to use their default resume)
    """
    try:
        # Get user document to find default resume ID
        user_doc = simplified_firebase_service.get_document("users", current_user['uid'])
        if not user_doc or "default_resume_id" not in user_doc:
            raise HTTPException(
                status_code=404,
                detail="No default resume found for user"
            )
        
        default_resume_id = user_doc["default_resume_id"]
        
        # Get the default resume
        resume_data = simplified_firebase_service.get_document("resumes", default_resume_id)
        if not resume_data:
            raise HTTPException(
                status_code=404,
                detail="Default resume not found"
            )
        
        # Create resume reference data for analytics
        resume_ref_data = ResumeData(
            resume_id=default_resume_id,
            filename=resume_data.get('filename'),
            original_name=resume_data.get('original_name'),
            type=resume_data.get('type', 'default'),
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
            message="Default resume linked to analytics successfully",
            analytics_id=request.analytics_id,
            resume_id=default_resume_id
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error linking default resume to analytics: {str(e)}"
        )

@router.post("/perform-analysis", response_model=PerformAnalysisResponse)
async def perform_analysis(
    request: PerformAnalysisRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Perform the actual analysis between resume and job description using enhanced AI analysis
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
        
        # Get the raw text content for analysis
        job_description_text = job_data.get('description', '')
        resume_raw_text = resume_data.get('parsed_data', {}).get('raw_text', '')
        
        if not job_description_text or not resume_raw_text:
            raise HTTPException(
                status_code=400,
                detail="Job description or resume content is missing"
            )
        
        # For now, we'll use a simplified approach since we removed the heavy resume analyzer
        # In the future, you can integrate with your LangChain + OpenAI implementation
        analysis_results = await _perform_basic_analysis(job_data, resume_data)
        
        # Store enhanced results in the proper structure
        # Convert Pydantic model to dict for Firestore storage
        try:
            if hasattr(analysis_results, 'dict'):
                # Pydantic v1
                results_dict = analysis_results.dict()
                print(f"Converted AnalysisResults using .dict() method")
            elif hasattr(analysis_results, 'model_dump'):
                # Pydantic v2
                results_dict = analysis_results.model_dump()
                print(f"Converted AnalysisResults using .model_dump() method")
            else:
                # Fallback - try to convert to dict
                results_dict = dict(analysis_results)
                print(f"Converted AnalysisResults using dict() fallback")
            
            print(f"Successfully converted AnalysisResults to dict with keys: {list(results_dict.keys())}")
        except Exception as e:
            print(f"Error converting AnalysisResults to dict: {e}")
            # Fallback to empty dict
            results_dict = {
                'match_score': 0.0,
                'ats_score': 0.0,
                'fit_level': 'Error',
                'matching_skills': [],
                'missing_skills': [],
                'suggestions': ['Analysis conversion failed'],
                'improvements': ['Please try again'],
                'total_skills_matched': 0,
                'total_skills_missing': 0,
                'skill_match_percentage': 0.0
            }
        
        results_data = {
            'enhanced_analysis': results_dict,
            'basic_results': results_dict
        }
        
        # Update analytics with results
        update_success = simplified_firebase_service.update_analytics(
            request.analytics_id,
            current_user['uid'],
            {
                'results': results_data,
                'status': 'completed',
                'step_number': 3,
                'updated_at': datetime.now()
            }
        )
        
        if not update_success:
            raise HTTPException(
                status_code=500,
                detail="Failed to save analysis results"
            )
        
        # Convert Pydantic model to dict for response
        try:
            if hasattr(analysis_results, 'dict'):
                # Pydantic v1
                results_dict = analysis_results.dict()
            elif hasattr(analysis_results, 'model_dump'):
                # Pydantic v2
                results_dict = analysis_results.model_dump()
            else:
                # Fallback - try to convert to dict
                results_dict = dict(analysis_results)
        except Exception as e:
            print(f"Error converting AnalysisResults to dict for response: {e}")
            # Use the already converted dict from above
            results_dict = results_dict if 'results_dict' in locals() else {
                'match_score': 0.0,
                'ats_score': 0.0,
                'fit_level': 'Error',
                'matching_skills': [],
                'missing_skills': [],
                'suggestions': ['Analysis conversion failed'],
                'improvements': ['Please try again'],
                'total_skills_matched': 0,
                'total_skills_missing': 0,
                'skill_match_percentage': 0.0
            }
        
        return PerformAnalysisResponse(
            success=True,
            message="Analysis completed successfully",
            analytics_id=request.analytics_id,
            results=results_dict
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error performing analysis: {str(e)}"
        )

async def _perform_basic_analysis(job_data: Dict[str, Any], resume_data: Dict[str, Any]) -> AnalysisResults:
    """Perform basic rule-based analysis as fallback"""
    try:
        # Extract basic data
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
        return AnalysisResults(
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
        
    except Exception as e:
        print(f"Basic analysis failed: {e}")
        # Return minimal results
        return AnalysisResults(
            match_score=0.0,
            ats_score=0.0,
            fit_level="Not Fit",
            matching_skills=[],
            missing_skills=[],
            suggestions=["Analysis failed - please try again"],
            improvements=["Unable to analyze at this time"],
            total_skills_matched=0,
            total_skills_missing=0,
            skill_match_percentage=0.0
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
