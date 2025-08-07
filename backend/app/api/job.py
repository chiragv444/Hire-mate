from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from typing import Optional

from ..core.auth import get_current_user
from ..services.job_scraper import job_scraper
from ..core.firebase import firebase_service
from ..models.job import JobInputRequest, JobAnalysisResponse, JobMatchRequest, JobMatchResponse

router = APIRouter(prefix="/job", tags=["job"])

@router.post("/analyze", response_model=JobAnalysisResponse)
async def analyze_job_description(
    request: JobInputRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Analyze job description and extract structured information
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
            except Exception as e:
                # If scraping fails, use the provided description
                description_to_parse = request.job_description
        else:
            description_to_parse = request.job_description
        
        # Parse the job description
        parsed_data = await job_scraper.parse_job_description(description_to_parse)
        
        # Prepare job data for Firestore
        job_data = {
            'title': parsed_data.get('title', 'Job Title'),
            'company': parsed_data.get('company', 'Company'),
            'location': parsed_data.get('location', 'Location'),
            'description': parsed_data.get('description', ''),
            'skills': parsed_data.get('skills', []),
            'requirements': parsed_data.get('requirements', []),
            'responsibilities': parsed_data.get('responsibilities', []),
            'qualifications': parsed_data.get('qualifications', []),
            'keywords': parsed_data.get('keywords', []),
            'experience_level': parsed_data.get('experience_level'),
            'job_type': parsed_data.get('job_type'),
            'salary_info': parsed_data.get('salary_info'),
            'linkedin_url': str(request.linkedin_url) if request.linkedin_url else None,
            'source': 'linkedin' if request.linkedin_url else 'manual'
        }
        
        # Save to Firestore
        job_id = firebase_service.save_job_analysis(
            current_user['uid'], 
            job_data
        )
        
        return JobAnalysisResponse(
            success=True,
            message="Job description analyzed successfully",
            job_id=job_id,
            parsed_data=parsed_data,
            scraped_data=scraped_data
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error analyzing job description: {str(e)}"
        )

@router.post("/match", response_model=JobMatchResponse)
async def match_resume_job(
    request: JobMatchRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Match a resume against a job description
    """
    try:
        # Get resume data
        user_ref = firebase_service.db.collection('users').document(current_user['uid'])
        resume_ref = user_ref.collection('resumes').document(request.resume_id)
        resume_doc = resume_ref.get()
        
        if not resume_doc.exists:
            raise HTTPException(
                status_code=404,
                detail="Resume not found"
            )
        
        # Get job data
        job_ref = user_ref.collection('job_inputs').document(request.job_id)
        job_doc = job_ref.get()
        
        if not job_doc.exists:
            raise HTTPException(
                status_code=404,
                detail="Job not found"
            )
        
        resume_data = resume_doc.to_dict()
        job_data = job_doc.to_dict()
        
        # Extract skills and text
        resume_skills = set(resume_data.get('parsed_data', {}).get('skills', []))
        job_skills = set(job_data.get('skills', []))
        
        resume_text = resume_data.get('parsed_data', {}).get('raw_text', '')
        job_description = job_data.get('description', '')
        
        # Calculate match score
        match_score = _calculate_match_score(resume_skills, job_skills, resume_text, job_description)
        
        # Calculate ATS score
        ats_score = _calculate_ats_score(resume_text, job_description)
        
        # Determine fit level
        fit_level = _determine_fit_level(match_score)
        
        # Find missing skills
        missing_skills = list(job_skills - resume_skills)
        
        # Generate suggestions
        suggestions = _generate_suggestions(missing_skills, match_score)
        
        # Identify strengths
        strengths = list(resume_skills & job_skills)
        
        # Generate improvements
        improvements = _generate_improvements(missing_skills, match_score)
        
        return JobMatchResponse(
            success=True,
            match_score=match_score,
            ats_score=ats_score,
            fit_level=fit_level,
            missing_skills=missing_skills,
            suggestions=suggestions,
            strengths=strengths,
            improvements=improvements
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error matching resume to job: {str(e)}"
        )

def _calculate_match_score(resume_skills: set, job_skills: set, resume_text: str, job_description: str) -> float:
        """Calculate match score between resume and job"""
        if not job_skills:
            return 0.0
        
        # Skills match percentage
        skills_match = len(resume_skills & job_skills) / len(job_skills) * 100
        
        # Text similarity (simple keyword matching)
        resume_words = set(resume_text.lower().split())
        job_words = set(job_description.lower().split())
        
        # Remove common words
        common_words = {'the', 'and', 'or', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'}
        resume_words -= common_words
        job_words -= common_words
        
        if job_words:
            text_similarity = len(resume_words & job_words) / len(job_words) * 100
        else:
            text_similarity = 0
        
        # Weighted average (skills more important)
        match_score = (skills_match * 0.7) + (text_similarity * 0.3)
        
        return min(match_score, 100.0)

def _calculate_ats_score(resume_text: str, job_description: str) -> float:
        """Calculate ATS (Applicant Tracking System) score"""
        # Simple keyword density calculation
        resume_words = resume_text.lower().split()
        job_words = job_description.lower().split()
        
        # Count keyword matches
        keyword_matches = 0
        total_keywords = len(job_words)
        
        for word in job_words:
            if word in resume_words:
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
    
def _generate_suggestions(self, missing_skills: list, match_score: float) -> list:
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

@router.get("/list")
async def list_user_jobs(current_user: dict = Depends(get_current_user)):
    """
    List all job analyses for the current user
    """
    try:
        # Get user's job analyses from Firestore
        user_ref = firebase_service.db.collection('users').document(current_user['uid'])
        jobs_ref = user_ref.collection('job_inputs')
        jobs_docs = jobs_ref.get()
        
        jobs = []
        for doc in jobs_docs:
            job_data = doc.to_dict()
            jobs.append({
                'id': doc.id,
                'title': job_data.get('title', 'Unknown'),
                'company': job_data.get('company', 'Unknown'),
                'location': job_data.get('location', 'Unknown'),
                'skills_count': len(job_data.get('skills', [])),
                'created_at': job_data.get('createdAt'),
                'source': job_data.get('source', 'manual')
            })
        
        return {
            "success": True,
            "jobs": jobs
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving job analyses: {str(e)}"
        )

@router.delete("/{job_id}")
async def delete_job_analysis(
    job_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Delete a job analysis
    """
    try:
        # Get job data from Firestore
        user_ref = firebase_service.db.collection('users').document(current_user['uid'])
        job_ref = user_ref.collection('job_inputs').document(job_id)
        job_doc = job_ref.get()
        
        if not job_doc.exists:
            raise HTTPException(
                status_code=404,
                detail="Job analysis not found"
            )
        
        # Delete from Firestore
        job_ref.delete()
        
        return {
            "success": True,
            "message": "Job analysis deleted successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error deleting job analysis: {str(e)}"
        ) 