from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import JSONResponse
from typing import Optional, Dict, Any
import os
from datetime import datetime
import asyncio

from ..core.auth import get_current_user
from ..core.config import settings
from ..services.resume_parser import resume_parser
from ..services.enhanced_resume_parser import enhanced_resume_parser
from ..services.enhanced_resume_analyzer import enhanced_resume_analyzer

from ..services.enhanced_job_parser import enhanced_job_parser
from ..services.firebase_simple import simplified_firebase_service
from ..services.firebase_storage import firebase_storage_service

# Import the trained model with fallback
try:
    import sys
    import os
    # Add the model_integration directory to the Python path
    model_integration_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'model_integration')
    if model_integration_path not in sys.path:
        sys.path.append(model_integration_path)
    
    from resume_job_matcher import ResumeJobMatcher
    TRAINED_MODEL_AVAILABLE = True
    print(f"✅ Trained model imported successfully from {model_integration_path}")
except ImportError as e:
    print(f"❌ Warning: Trained model not available: {e}")
    TRAINED_MODEL_AVAILABLE = False
    ResumeJobMatcher = None
except Exception as e:
    print(f"❌ Warning: Trained model import failed: {e}")
    TRAINED_MODEL_AVAILABLE = False
    ResumeJobMatcher = None
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
    AnalysisResults,
    TrainedModelResults
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
        # Parse job description using enhanced parser
        if request.linkedin_url:
            # If LinkedIn URL is provided, scrape from LinkedIn using enhanced parser
            parsed_job = await enhanced_job_parser.scrape_linkedin_job(request.linkedin_url)
        else:
            # If no LinkedIn URL, parse the plain text job description using enhanced parser
            parsed_job = await enhanced_job_parser.parse_job_description(request.job_description)
        
        # Extract comprehensive data from parsed job
        company_info = parsed_job.get('company', {})
        location_info = parsed_job.get('location', {})
        requirements_info = parsed_job.get('requirements', {})
        salary_info = parsed_job.get('salary', {})
        benefits_info = parsed_job.get('benefits', {})
        details_info = parsed_job.get('details', {})
        
        # Create job description data with enhanced fields
        job_data = JobDescriptionData(
            title=parsed_job.get('title', ''),
            company=company_info.get('name', '') if isinstance(company_info, dict) else str(company_info or ''),
            location=location_info.get('full_location', '') if isinstance(location_info, dict) else str(location_info or ''),
            description=str(request.job_description or parsed_job.get('description') or ''),
            linkedin_url=request.linkedin_url,
            parsed_skills=requirements_info.get('required_skills', []) + requirements_info.get('preferred_skills', []),
            parsed_requirements=parsed_job.get('qualifications', []),
            parsed_responsibilities=parsed_job.get('responsibilities', []),
            parsed_qualifications=parsed_job.get('qualifications', []),
            keywords=requirements_info.get('required_skills', []),
            
            # Enhanced fields
            raw_data=parsed_job.get('raw_data', {}),
            detailed_summary=parsed_job.get('detailed_summary', ''),
            parsed_data=parsed_job,
            experience_level=requirements_info.get('experience_level', ''),
            years_of_experience=requirements_info.get('years_of_experience', ''),
            job_type=details_info.get('job_type', ''),
            salary_info=salary_info,
            benefits=benefits_info.get('other_benefits', []) if isinstance(benefits_info, dict) else [],
            company_info=company_info
        )
        
        # Create analytics document with enhanced structure
        analytics_data = {
            'job_description': job_data.dict(),
            'job_raw_data': parsed_job.get('raw_data', {}),
            'job_detailed_summary': parsed_job.get('detailed_summary', ''),
            'job_parsed_data': parsed_job,
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
        
        # Parse resume using enhanced parser
        if enhanced_resume_parser:
            parsed_data = await enhanced_resume_parser.parse_resume(
                file_content, 
                file.content_type
            )
        else:
            # Fallback to basic parsing if enhanced parser is not available
            parsed_data = {
                "personal_info": {"name": None, "email": None, "phone": None},
                "skills": {"technical": [], "soft": [], "domain": []},
                "experience": [],
                "education": [],
                "projects": [],
                "certifications": [],
                "languages": [],
                "awards": [],
                "raw_text": "Resume content extracted",
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
        
        # Start the trained model prediction asynchronously (fire and forget)
        async def run_trained_model_prediction():
            try:
                # Check if trained model is available
                if not TRAINED_MODEL_AVAILABLE or not ResumeJobMatcher:
                    print("Trained model not available, skipping prediction")
                    return
                
                # Initialize the trained model
                matcher = ResumeJobMatcher()  # Will auto-detect the model path
                
                # Get resume summary and job summary
                resume_summary = resume_data.get('parsed_data', {}).get('summary', '') or resume_raw_text[:1000]
                job_summary = job_data.get('detailed_summary', '') or job_description_text[:1000]
                
                # Run prediction
                trained_model_result = matcher.predict_fit_simple(resume_summary, job_summary)
                
                print(f"Raw trained model result: {trained_model_result}")
                
                # Ensure percentage is a proper number and format it correctly
                percentage_value = trained_model_result.get('percentage', 0.0)
                if isinstance(percentage_value, str):
                    percentage_value = float(percentage_value)
                
                # Ensure percentage is between 0 and 100
                percentage_value = max(0.0, min(100.0, percentage_value))
                
                print(f"Processed percentage: {percentage_value}")
                
                # Create validated trained model results
                trained_model_data = TrainedModelResults(
                    fit_level=trained_model_result.get('fit_level', 'Not Fit'),
                    percentage=percentage_value,
                    predicted_at=datetime.now().isoformat()
                )
                
                # Store the trained model results in the database
                update_data = {
                    'trained_model_results': trained_model_data.dict()
                }
                
                # Update analytics with trained model results
                simplified_firebase_service.update_analytics(
                    request.analytics_id,
                    current_user['uid'],
                    update_data
                )
                
                print(f"Trained model prediction completed and stored: {trained_model_data.dict()}")
                
            except Exception as e:
                print(f"Trained model prediction failed: {str(e)}")
                # Don't fail the main request if trained model fails
        
        # Start the trained model prediction in background (fire and forget)
        asyncio.create_task(run_trained_model_prediction())
        
        # Perform enhanced analysis using the enhanced resume analyzer
        if enhanced_resume_analyzer:
            analysis_results = await enhanced_resume_analyzer.analyze_resume_against_job(
                job_description_text,
                resume_raw_text
            )
            
            # Store enhanced results in the proper structure
            results_data = {
                'enhanced_analysis': analysis_results,
                'basic_results': {
                    'match_score': analysis_results.get('match_score', 0),
                    'ats_score': analysis_results.get('ats_score', 0),
                    'fit_level': analysis_results.get('fit_level', 'Not Fit'),
                    'missing_skills': analysis_results.get('missing_keywords', []),
                    'suggestions': analysis_results.get('suggestions', []),
                    'improvements': analysis_results.get('ats_feedback', []),
                    'total_skills_matched': len(analysis_results.get('skill_analysis', {}).get('matching_skills', [])),
                    'total_skills_missing': len(analysis_results.get('skill_analysis', {}).get('missing_skills', [])),
                    'skill_match_percentage': analysis_results.get('skill_analysis', {}).get('skill_match_percentage', 0)
                }
            }
        else:
            # Fallback to basic analysis
            analysis_results = await _perform_basic_analysis(job_data, resume_data)
            results_data = {
                'basic_results': analysis_results
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
        
        return PerformAnalysisResponse(
            success=True,
            message="Analysis completed successfully",
            analytics_id=request.analytics_id,
            results=analysis_results # Return the analysis_results object directly
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
