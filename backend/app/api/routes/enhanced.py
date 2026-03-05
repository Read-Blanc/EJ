# Enhanced Assessment Routes

# Endpoints for rubric-based enhanced assessments

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
import logging

from app.schemas.assessment import (
    EnhancedAssessmentRequest,
    EnhancedAssessmentResponse,
)
from app.services.enhanced_service import (
    perform_enhanced_assessment,
    format_enhanced_feedback,
    compare_assessment_methods,
)
from app.database import get_db
from app import crud
from app.utils.dependencies import require_student
from app.models.user import User

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("", response_model=dict)
def assess_enhanced_endpoint(
    model_answer: str,
    student_answer: str,
    max_score: int = 10,
    current_user: User = Depends(require_student)
):
    """
    Enhanced assessment without database storage
    
    Provides detailed rubric-based scoring with:
    - Accuracy, completeness, and clarity scores
    - Key concept analysis
    - Detailed feedback with strengths and improvements
    """
    try:
        result = perform_enhanced_assessment(
            model_answer=model_answer,
            student_answer=student_answer,
            max_score=max_score
        )
        return result
    except Exception as e:
        logger.error(f"Enhanced assessment failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/store", response_model=EnhancedAssessmentResponse)
def assess_enhanced_and_store(
    request: EnhancedAssessmentRequest,
    current_user: User = Depends(require_student),
    db: Session = Depends(get_db)
):
    """
    Enhanced assessment with database storage
    
    Combines enhanced scoring with database persistence.
    Stores detailed assessment results in the database.
    """
    try:
        # Get question
        question = crud.get_question(db, request.question_id)
        if not question:
            raise HTTPException(status_code=404, detail="Question not found")
        
        # Get or create student
        student = crud.get_or_create_student(
            db,
            student_id=current_user.student_id or current_user.username,
            name=current_user.full_name or current_user.username
        )
        
        # Perform enhanced assessment
        result = perform_enhanced_assessment(
            model_answer=question.model_answer,
            student_answer=request.student_answer,
            max_score=question.max_score,
            rubric_weights=request.rubric_weights
        )
        
        # Format detailed feedback
        detailed_feedback = format_enhanced_feedback(result)
        
        # Calculate overall similarity for storage
        overall_similarity = result["percentage"] / 100.0
        
        # Store in database
        crud.create_assessment(
            db=db,
            question_id=question.id,
            student_id=student.id,
            student_answer=request.student_answer,
            similarity_score=overall_similarity,
            awarded_score=result["awarded_score"],
            feedback=detailed_feedback
        )
        
        logger.info(f"Enhanced assessment stored: {request.student_id}, Score: {result['awarded_score']}/{question.max_score}")
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Enhanced assessment with storage failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/compare-methods")
def compare_methods_endpoint(
    model_answer: str,
    student_answer: str,
    max_score: int = 10,
    current_user: User = Depends(require_student)
):
    """
    Compare basic vs enhanced assessment methods
    
    Useful for understanding the difference between the two approaches
    """
    try:
        comparison = compare_assessment_methods(
            model_answer=model_answer,
            student_answer=student_answer,
            max_score=max_score
        )
        return comparison
    
    except Exception as e:
        logger.error(f"Method comparison failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))