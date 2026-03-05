"""
Lecturer Routes

Convenience endpoints for lecturer-specific operations with intuitive paths
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
import logging

from app.database import get_db
from app.utils.dependencies import require_teacher
from app.models.user import User
from app.crud import question_crud, paper_crud
from app.schemas.question import QuestionCreate, QuestionResponse, QuestionUpdate
from app.schemas.paper import (
    PaperCreate, PaperResponse, PaperWithQuestions, 
    PaperUpdate, PaperStatistics, SubmissionDetail
)

logger = logging.getLogger("evalai")
router = APIRouter()


# ============================================
# LECTURER - QUESTION MANAGEMENT
# ============================================

@router.get("/questions", response_model=List[QuestionResponse])
def get_lecturer_questions(
    subject: Optional[str] = None,
    topic: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(require_teacher),
    db: Session = Depends(get_db)
):
    """
    Get all questions (lecturer view)
    
    Convenience endpoint that wraps /questions
    
    Query parameters:
    - subject: Filter by subject
    - topic: Filter by topic
    - skip: Pagination offset
    - limit: Maximum number of results
    """
    return question_crud.get_questions(
        db, 
        subject=subject, 
        topic=topic, 
        skip=skip, 
        limit=limit
    )


@router.post("/questions", response_model=QuestionResponse, status_code=status.HTTP_201_CREATED)
def create_lecturer_question(
    question: QuestionCreate,
    current_user: User = Depends(require_teacher),
    db: Session = Depends(get_db)
):
    """
    Create a new question (lecturer view)
    
    Convenience endpoint that wraps /questions
    """
    try:
        new_question = question_crud.create_question(
            db=db,
            question_text=question.question_text,
            model_answer=question.model_answer,
            subject=question.subject,
            topic=question.topic,
            max_score=question.max_score,
            difficulty=question.difficulty
        )
        logger.info(f"Question created by {current_user.username}: ID {new_question.id}")
        return new_question
    except Exception as e:
        logger.error(f"Failed to create question: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/questions/{question_id}", response_model=QuestionResponse)
def get_lecturer_question(
    question_id: int,
    current_user: User = Depends(require_teacher),
    db: Session = Depends(get_db)
):
    """
    Get specific question by ID (lecturer view)
    
    Convenience endpoint that wraps /questions/{id}
    """
    question = question_crud.get_question(db, question_id)
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    return question


@router.put("/questions/{question_id}", response_model=QuestionResponse)
def update_lecturer_question(
    question_id: int,
    question_update: QuestionUpdate,
    current_user: User = Depends(require_teacher),
    db: Session = Depends(get_db)
):
    """
    Update a question (lecturer view)
    
    Convenience endpoint that wraps /questions/{id}
    
    Only provided fields will be updated
    """
    update_data = question_update.dict(exclude_unset=True)
    updated = question_crud.update_question(db, question_id, **update_data)
    
    if not updated:
        raise HTTPException(status_code=404, detail="Question not found")
    
    logger.info(f"Question {question_id} updated by {current_user.username}")
    return updated


@router.delete("/questions/{question_id}")
def delete_lecturer_question(
    question_id: int,
    current_user: User = Depends(require_teacher),
    db: Session = Depends(get_db)
):
    """
    Delete a question (lecturer view)
    
    Convenience endpoint that wraps /questions/{id}
    """
    success = question_crud.delete_question(db, question_id)
    if not success:
        raise HTTPException(status_code=404, detail="Question not found")
    
    logger.info(f"Question {question_id} deleted by {current_user.username}")
    return {"message": "Question deleted successfully"}


@router.get("/questions/{question_id}/statistics")
def get_question_statistics(
    question_id: int,
    current_user: User = Depends(require_teacher),
    db: Session = Depends(get_db)
):
    """
    Get performance statistics for a specific question
    
    Convenience endpoint that wraps /questions/{id}/statistics
    
    Returns:
    - Total attempts
    - Average score
    - Pass rate
    - Difficulty rating
    """
    stats = question_crud.get_question_statistics(db, question_id)
    if not stats:
        raise HTTPException(status_code=404, detail="Question not found")
    return stats


# ============================================
# LECTURER - ASSESSMENT MANAGEMENT
# ============================================

@router.get("/assessments", response_model=List[PaperResponse])
def get_lecturer_assessments(
    subject: Optional[str] = None,
    is_active: Optional[bool] = None,
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(require_teacher),
    db: Session = Depends(get_db)
):
    """
    Get all assessments/papers (lecturer view)
    
    Convenience endpoint that wraps /papers
    
    Query parameters:
    - subject: Filter by subject
    - is_active: Filter by active status (true = published, false = draft/archived)
    - skip: Pagination offset
    - limit: Maximum number of results
    """
    return paper_crud.get_all_papers(
        db, 
        subject=subject, 
        is_active=is_active, 
        skip=skip, 
        limit=limit
    )


@router.post("/assessments", response_model=PaperResponse, status_code=status.HTTP_201_CREATED)
def create_lecturer_assessment(
    paper: PaperCreate,
    current_user: User = Depends(require_teacher),
    db: Session = Depends(get_db)
):
    """
    Create a new assessment/paper (lecturer view)
    
    Convenience endpoint that wraps /papers
    """
    try:
        new_paper = paper_crud.create_paper(
            db=db,
            title=paper.title,
            description=paper.description,
            subject=paper.subject,
            total_marks=paper.total_marks,
            duration_minutes=paper.duration_minutes,
            difficulty=paper.difficulty
        )
        logger.info(f"Assessment created by {current_user.username}: ID {new_paper.id}")
        return new_paper
    except Exception as e:
        logger.error(f"Failed to create assessment: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/assessments/{assessment_id}", response_model=PaperWithQuestions)
def get_lecturer_assessment(
    assessment_id: int,
    current_user: User = Depends(require_teacher),
    db: Session = Depends(get_db)
):
    """
    Get specific assessment with questions (lecturer view)
    
    Convenience endpoint that wraps /papers/{id}
    
    Returns complete assessment details including all questions
    """
    paper = paper_crud.get_paper_with_questions(db, assessment_id)
    if not paper:
        raise HTTPException(status_code=404, detail="Assessment not found")
    return paper


@router.patch("/assessments/{assessment_id}", response_model=PaperResponse)
def update_lecturer_assessment(
    assessment_id: int,
    paper: PaperUpdate,
    current_user: User = Depends(require_teacher),
    db: Session = Depends(get_db)
):
    """
    Update assessment details (lecturer view)
    
    Convenience endpoint that wraps /papers/{id}
    
    Only provided fields will be updated
    """
    updated = paper_crud.update_paper(
        db, 
        assessment_id, 
        **paper.model_dump(exclude_unset=True)
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Assessment not found")
    
    logger.info(f"Assessment {assessment_id} updated by {current_user.username}")
    return updated


@router.delete("/assessments/{assessment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_lecturer_assessment(
    assessment_id: int,
    current_user: User = Depends(require_teacher),
    db: Session = Depends(get_db)
):
    """
    Delete (archive) an assessment (lecturer view)
    
    Convenience endpoint that wraps /papers/{id}
    
    Performs soft delete by setting is_active=False
    """
    success = paper_crud.delete_paper(db, assessment_id)
    if not success:
        raise HTTPException(status_code=404, detail="Assessment not found")
    
    logger.info(f"Assessment {assessment_id} archived by {current_user.username}")
    return None


@router.get("/assessments/{assessment_id}/statistics", response_model=PaperStatistics)
def get_assessment_statistics(
    assessment_id: int,
    current_user: User = Depends(require_teacher),
    db: Session = Depends(get_db)
):
    """
    Get comprehensive statistics for an assessment
    
    Convenience endpoint that wraps /papers/{id}/statistics
    
    Returns:
    - Number of submissions
    - Average scores
    - Grade distribution
    - Performance bands
    """
    stats = paper_crud.get_paper_statistics(db, assessment_id)
    if not stats:
        raise HTTPException(status_code=404, detail="Assessment not found")
    return stats


# ============================================
# LECTURER - GRADING & SUBMISSIONS
# ============================================

@router.get("/submissions/{submission_id}", response_model=SubmissionDetail)
def get_submission_for_review(
    submission_id: int,
    current_user: User = Depends(require_teacher),
    db: Session = Depends(get_db)
):
    """
    Get submission details for grading/review (lecturer view)
    
    Convenience endpoint that wraps /papers/submissions/{id}
    
    Returns complete submission with all answers and grading
    """
    submission = paper_crud.get_submission_with_details(db, submission_id)
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    return submission


@router.get("/grading/pending")
def get_pending_submissions(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(require_teacher),
    db: Session = Depends(get_db)
):
    """
    Get all pending submissions that need review
    
    Returns submissions awaiting manual review or grading
    
    Note: This endpoint may need implementation in paper_crud
    """
    # TODO: Implement get_pending_submissions in paper_crud
    # For now, return empty list
    logger.warning("get_pending_submissions not yet implemented in paper_crud")
    return []


# ============================================
# LECTURER - ANALYTICS
# ============================================

@router.get("/dashboard")
def get_lecturer_analytics_dashboard(
    current_user: User = Depends(require_teacher),
    db: Session = Depends(get_db)
):
    """
    Get lecturer analytics dashboard
    
    Convenience endpoint that wraps /analytics/overview
    
    Returns:
    - Total questions, students, assessments
    - Average score overall
    - Recent activity
    - Top performing students
    - Most challenging questions
    """
    from app.crud import get_overall_statistics
    
    stats = get_overall_statistics(db)
    return {
        "role": "teacher",
        "statistics": stats,
        "user_info": {
            "username": current_user.username,
            "email": current_user.email,
            "full_name": current_user.full_name
        }
    }