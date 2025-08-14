from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from typing import Dict, Any
from datetime import datetime

from ..core.auth import get_current_user
from ..services.enhanced_cover_letter_generator import enhanced_cover_letter_generator
from ..services.firebase_simple import simplified_firebase_service

router = APIRouter(prefix="/cover-letter", tags=["cover-letter"])

@router.post("/generate/{analytics_id}")
async def generate_cover_letter(
    analytics_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Generate a cover letter for the specified analytics session
    """
    try:
        # Get analytics data
        analytics_data = simplified_firebase_service.get_analytics(
            analytics_id,
            current_user['uid']
        )
        
        if not analytics_data:
            raise HTTPException(
                status_code=404,
                detail="Analytics not found"
            )
        
        # Check if both job description and resume are available
        job_data = analytics_data.get('job_description')
        resume_data = analytics_data.get('resume')
        
        if not job_data or not resume_data:
            raise HTTPException(
                status_code=400,
                detail="Analytics must have both job description and resume before generating cover letter"
            )
        
        # Generate cover letter using the enhanced generator
        if enhanced_cover_letter_generator:
            cover_letter = await enhanced_cover_letter_generator.generate_cover_letter(
                job_data,
                resume_data
            )
        else:
            raise HTTPException(
                status_code=500,
                detail="Cover letter generator service not available"
            )
        
        # Store cover letter in the analytics document
        cover_letter_data = {
            'cover_letter': cover_letter,
            'cover_letter_generated_at': datetime.now(),
            'cover_letter_status': 'generated'
        }
        
        update_success = simplified_firebase_service.update_analytics(
            analytics_id,
            current_user['uid'],
            cover_letter_data
        )
        
        if not update_success:
            raise HTTPException(
                status_code=500,
                detail="Failed to save cover letter to analytics"
            )
        
        return JSONResponse(content={
            "success": True,
            "message": "Cover letter generated successfully",
            "analytics_id": analytics_id,
            "cover_letter": cover_letter
        })
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error generating cover letter: {str(e)}"
        )

@router.post("/regenerate/{analytics_id}")
async def regenerate_cover_letter(
    analytics_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Regenerate a cover letter for the specified analytics session
    """
    try:
        # Get analytics data
        analytics_data = simplified_firebase_service.get_analytics(
            analytics_id,
            current_user['uid']
        )
        
        if not analytics_data:
            raise HTTPException(
                status_code=404,
                detail="Analytics not found"
            )
        
        # Check if both job description and resume are available
        job_data = analytics_data.get('job_description')
        resume_data = analytics_data.get('resume')
        
        if not job_data or not resume_data:
            raise HTTPException(
                status_code=400,
                detail="Analytics must have both job description and resume before regenerating cover letter"
            )
        
        # Generate new cover letter using the enhanced generator
        if enhanced_cover_letter_generator:
            cover_letter = await enhanced_cover_letter_generator.generate_cover_letter(
                job_data,
                resume_data
            )
        else:
            raise HTTPException(
                status_code=500,
                detail="Cover letter generator service not available"
            )
        
        # Update cover letter in the analytics document
        cover_letter_data = {
            'cover_letter': cover_letter,
            'cover_letter_generated_at': datetime.now(),
            'cover_letter_status': 'regenerated',
            'cover_letter_version': analytics_data.get('cover_letter_version', 0) + 1
        }
        
        update_success = simplified_firebase_service.update_analytics(
            analytics_id,
            current_user['uid'],
            cover_letter_data
        )
        
        if not update_success:
            raise HTTPException(
                status_code=500,
                detail="Failed to update cover letter in analytics"
            )
        
        return JSONResponse(content={
            "success": True,
            "message": "Cover letter regenerated successfully",
            "analytics_id": analytics_id,
            "cover_letter": cover_letter
        })
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error regenerating cover letter: {str(e)}"
        )

@router.get("/{analytics_id}")
async def get_cover_letter(
    analytics_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get the cover letter for the specified analytics session
    """
    try:
        # Get analytics data
        analytics_data = simplified_firebase_service.get_analytics(
            analytics_id,
            current_user['uid']
        )
        
        if not analytics_data:
            raise HTTPException(
                status_code=404,
                detail="Analytics not found"
            )
        
        # Check if cover letter exists
        cover_letter = analytics_data.get('cover_letter')
        if not cover_letter:
            raise HTTPException(
                status_code=404,
                detail="Cover letter not found. Please generate one first."
            )
        
        return JSONResponse(content={
            "success": True,
            "analytics_id": analytics_id,
            "cover_letter": cover_letter,
            "job_description": analytics_data.get('job_description'),
            "resume": analytics_data.get('resume')
        })
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error getting cover letter: {str(e)}"
        )

@router.delete("/{analytics_id}")
async def delete_cover_letter(
    analytics_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Delete the cover letter for the specified analytics session
    """
    try:
        # Get analytics data
        analytics_data = simplified_firebase_service.get_analytics(
            analytics_id,
            current_user['uid']
        )
        
        if not analytics_data:
            raise HTTPException(
                status_code=404,
                detail="Analytics not found"
            )
        
        # Remove cover letter from analytics
        update_data = {
            'cover_letter': None,
            'cover_letter_generated_at': None,
            'cover_letter_status': None,
            'cover_letter_version': None
        }
        
        update_success = simplified_firebase_service.update_analytics(
            analytics_id,
            current_user['uid'],
            update_data
        )
        
        if not update_success:
            raise HTTPException(
                status_code=500,
                detail="Failed to delete cover letter from analytics"
            )
        
        return JSONResponse(content={
            "success": True,
            "message": "Cover letter deleted successfully",
            "analytics_id": analytics_id
        })
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error deleting cover letter: {str(e)}"
        )
