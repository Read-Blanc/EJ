"""
Student Routes

Enhanced endpoints for student-specific operations with intuitive paths
"""
from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.orm import Session
from typing import List, Optional
import logging

from app.schemas.assessment import AssessmentResponse
from app.database import get_db
from app import crud
from app.utils.dependencies import get_current_active_user, require_student
from app.models.user import User
from app.crud import paper_crud
from app.schemas.paper import (
    PaperResponse, PaperWithQuestions, SubmissionSummary, 
    SubmissionDetail, PaperSubmitRequest, PaperGradingResult
)

logger = logging.getLogger("evalai")
router = APIRouter()


# ============================================
# STUDENT - ASSESSMENTS (Browse & Take)
# ============================================

@router.get("/assessments", response_model=List[PaperResponse])
def get_available_assessments(
    subject: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(require_student),
    db: Session = Depends(get_db)
):
    """
    Get all available assessments for student
    
    Returns active/published papers that student can take
    
    Convenience endpoint that wraps /papers with filtering
    """
    # Only show active papers
    papers = paper_crud.get_all_papers(
        db, 
        subject=subject, 
        is_active=True,  # Only active/published
        skip=skip, 
        limit=limit
    )
    return papers


@router.get("/assessments/{assessment_id}", response_model=PaperWithQuestions)
def get_assessment_to_take(
    assessment_id: int,
    current_user: User = Depends(require_student),
    db: Session = Depends(get_db)
):
    """
    Get assessment details for taking exam
    
    Returns complete assessment with all questions
    
    Convenience endpoint that wraps /papers/{id}
    """
    paper = paper_crud.get_paper_with_questions(db, assessment_id)
    if not paper:
        raise HTTPException(status_code=404, detail="Assessment not found")
    
    # Check if active
    if not paper.is_active:
        raise HTTPException(
            status_code=403, 
            detail="This assessment is not currently available"
        )
    
    return paper


@router.post("/assessments/{assessment_id}/submit", response_model=PaperGradingResult)
def submit_assessment(
    assessment_id: int,
    submission: PaperSubmitRequest,
    current_user: User = Depends(require_student),
    db: Session = Depends(get_db)
):
    """
    Submit answers for an assessment
    
    This endpoint:
    1. Validates the submission
    2. Grades using AI (SBERT)
    3. Stores results in database
    4. Returns grading results
    
    Convenience endpoint that wraps /papers/submit
    """
    from app.services.paper_service import PaperGrader
    
    # Ensure paper_id matches URL
    submission.paper_id = assessment_id
    
    # Use current user's info
    submission.student_id = current_user.student_id or current_user.username
    submission.student_name = current_user.full_name or current_user.username
    
    try:
        grader = PaperGrader(db)
        
        # Convert answers to expected format
        answers = [
            {"question_number": ans.question_number, "answer": ans.answer}
            for ans in submission.answers
        ]
        
        if submission.use_enhanced_scoring:
            result = grader.grade_paper_enhanced(
                paper_id=submission.paper_id,
                student_id=submission.student_id,
                student_name=submission.student_name,
                answers=answers,
                rubric_weights=submission.rubric_weights
            )
        else:
            result = grader.grade_paper_basic(
                paper_id=submission.paper_id,
                student_id=submission.student_id,
                student_name=submission.student_name,
                answers=answers
            )
        
        logger.info(f"Assessment {assessment_id} submitted by {current_user.username}")
        return result
        
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Submission failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================
# STUDENT - SUBMISSIONS & RESULTS
# ============================================

@router.get("/submissions", response_model=List[SubmissionSummary])
def get_my_submissions(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(require_student),
    db: Session = Depends(get_db)
):
    """
    Get all submissions for current student
    
    Returns list of all assessments the student has attempted
    
    Convenience endpoint that wraps /papers/students/{id}/papers
    """
    student_id = current_user.student_id or current_user.username
    submissions = paper_crud.get_student_paper_submissions(db, student_id, skip, limit)
    return submissions


@router.get("/submissions/{submission_id}", response_model=SubmissionDetail)
def get_my_submission_detail(
    submission_id: int,
    current_user: User = Depends(require_student),
    db: Session = Depends(get_db)
):
    """
    Get detailed view of a specific submission
    
    Returns:
    - Complete assessment details
    - All question responses
    - Scores and AI feedback for each question
    - Overall results
    
    Convenience endpoint that wraps /papers/submissions/{id}
    """
    submission = paper_crud.get_submission_with_details(db, submission_id)
    
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    
    # Verify this submission belongs to current student
    student_id = current_user.student_id or current_user.username
    if submission.student_id != student_id:
        raise HTTPException(
            status_code=403, 
            detail="You can only view your own submissions"
        )
    
    return submission


# ============================================
# STUDENT - ANALYTICS & PERFORMANCE
# ============================================

@router.get("/analytics")
def get_my_analytics(
    current_user: User = Depends(require_student),
    db: Session = Depends(get_db)
):
    """
    Get performance analytics for current student
    
    Returns:
    - Total assessments taken
    - Average score
    - Performance over time
    - Strengths and weaknesses by subject
    
    Convenience endpoint that wraps /students/{id}/statistics
    """
    student_id = current_user.student_id or current_user.username
    
    stats = crud.get_student_statistics(db, student_id)
    if not stats:
        # Return empty stats if no data yet
        return {
            "student_id": student_id,
            "total_assessments": 0,
            "average_score": 0,
            "assessments": []
        }
    
    return stats


@router.get("/dashboard")
def get_my_dashboard(
    current_user: User = Depends(require_student),
    db: Session = Depends(get_db)
):
    """
    Get dashboard data for current student
    
    Convenience endpoint that wraps /analytics/my-dashboard
    """
    student_id = current_user.student_id or current_user.username
    
    stats = crud.get_student_statistics(db, student_id)
    return {
        "role": "student",
        "statistics": stats or {
            "student_id": student_id,
            "total_assessments": 0,
            "average_score": 0,
            "assessments": []
        },
        "user_info": {
            "username": current_user.username,
            "email": current_user.email,
            "full_name": current_user.full_name,
            "student_id": student_id
        }
    }


# ============================================
# BACKWARDS COMPATIBILITY ROUTES
# (Original endpoints - kept for backwards compatibility)
# ============================================

@router.get("/{student_id}/statistics")
def get_student_statistics_by_id(
    student_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get performance statistics for a student by ID
    
    Original endpoint - kept for backwards compatibility
    
    Returns:
    - Total assessments
    - Average score
    - Highest/lowest scores
    - Subject-wise performance
    - Recent assessments
    """
    # Security check: students can only view their own stats
    if current_user.is_student():
        user_student_id = current_user.student_id or current_user.username
        if student_id != user_student_id:
            raise HTTPException(
                status_code=403,
                detail="Students can only view their own statistics"
            )
    
    stats = crud.get_student_statistics(db, student_id)
    if not stats:
        raise HTTPException(status_code=404, detail="Student not found")
    return stats


@router.get("/{student_id}/assessments", response_model=List[AssessmentResponse])
def get_student_assessments_by_id(
    student_id: str,
    current_user: User = Depends(get_current_active_user),
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """
    Get all assessments for a specific student by ID
    
    Original endpoint - kept for backwards compatibility
    
    Query parameters:
    - skip: Pagination offset
    - limit: Maximum number of results
    """
    # Security check: students can only view their own assessments
    if current_user.is_student():
        user_student_id = current_user.student_id or current_user.username
        if student_id != user_student_id:
            raise HTTPException(
                status_code=403,
                detail="Students can only view their own assessments"
            )
    
    assessments = crud.get_student_assessments(db, student_id, skip, limit)
    return assessments