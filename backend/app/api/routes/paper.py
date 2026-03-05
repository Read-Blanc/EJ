"""
Paper Routes - API endpoints for paper management and grading
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
import logging

from app.database import get_db
from app.schemas.paper import (
    PaperCreate, PaperUpdate, PaperResponse, PaperWithQuestions,
    PaperQuestionAdd, PaperSubmitRequest, PaperGradingResult,
    SubmissionSummary, SubmissionDetail, PaperStatistics
)
from app.crud import paper_crud
from app.services.paper_service import PaperGrader
from app.utils.dependencies import get_current_active_user, require_student, require_teacher
from app.models.user import User

logger = logging.getLogger("evalai")
router = APIRouter()


# ============================================
# Paper Management Endpoints
# ============================================

@router.post("", response_model=PaperResponse, status_code=status.HTTP_201_CREATED)
def create_paper(paper: PaperCreate, current_user: User = Depends(require_teacher), db: Session = Depends(get_db)):
    """
    Create a new theory paper/assessment
    
    - **title**: Paper title (e.g., "Biology Midterm 2025")
    - **subject**: Subject area
    - **total_marks**: Total marks for the paper
    - **duration_minutes**: Optional exam duration
    - **difficulty**: easy, medium, or hard
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
        logger.info(f"Created paper ID: {new_paper.id}")
        return new_paper
    except Exception as e:
        logger.error(f"Failed to create paper: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("", response_model=List[PaperResponse])
def get_papers(
    subject: Optional[str] = None,
    is_active: Optional[bool] = None,
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get all papers with optional filtering
    
    - **subject**: Filter by subject
    - **is_active**: Filter by active status
    - **skip**: Number of records to skip
    - **limit**: Maximum number of records to return
    """
    papers = paper_crud.get_all_papers(db, subject=subject, is_active=is_active, skip=skip, limit=limit)
    return papers


@router.get("/{paper_id}", response_model=PaperWithQuestions)
def get_paper(paper_id: int, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    """
    Get a specific paper with all questions
    
    Returns complete paper details including:
    - All questions in order
    - Mark allocation for each question
    - Question text and model answers
    """
    paper = paper_crud.get_paper_with_questions(db, paper_id)
    if not paper:
        raise HTTPException(status_code=404, detail="Paper not found")
    return paper


@router.patch("/{paper_id}", response_model=PaperResponse)
def update_paper(paper_id: int,  paper: PaperUpdate, current_user: User = Depends(require_teacher), db: Session = Depends(get_db)):
    """
    Update paper details
    
    Only provided fields will be updated
    """
    updated_paper = paper_crud.update_paper(db, paper_id, **paper.model_dump(exclude_unset=True))
    if not updated_paper:
        raise HTTPException(status_code=404, detail="Paper not found")
    return updated_paper


@router.delete("/{paper_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_paper(paper_id: int, current_user: User = Depends(require_teacher), db: Session = Depends(get_db)):
    """
    Delete (archive) a paper
    
    Performs soft delete by setting is_active=False
    """
    success = paper_crud.delete_paper(db, paper_id)
    if not success:
        raise HTTPException(status_code=404, detail="Paper not found")
    return None


# ============================================
# Paper-Question Management Endpoints
# ============================================

@router.post("/{paper_id}/questions", status_code=status.HTTP_201_CREATED)
def add_question_to_paper(
    paper_id: int,
    question_data: PaperQuestionAdd,
    db: Session = Depends(get_db)
):
    """
    Add a question to a paper with mark allocation
    
    - **question_id**: ID of existing question
    - **question_number**: Display order (Q1, Q2, etc.)
    - **marks_allocated**: Marks for this question in this paper
    - **is_required**: Whether question is required (true) or optional
    """
    try:
        paper_question = paper_crud.add_question_to_paper(
            db=db,
            paper_id=paper_id,
            question_id=question_data.question_id,
            question_number=question_data.question_number,
            marks_allocated=question_data.marks_allocated,
            is_required=question_data.is_required
        )
        logger.info(f"Added question {question_data.question_id} to paper {paper_id}")
        return {
            "message": "Question added successfully",
            "paper_question_id": paper_question.id,
            "paper_id": paper_id,
            "question_number": question_data.question_number
        }
    except Exception as e:
        logger.error(f"Failed to add question to paper: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{paper_id}/questions/{paper_question_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_question_from_paper(
    paper_id: int,
    paper_question_id: int,
    db: Session = Depends(get_db)
):
    """
    Remove a question from a paper
    """
    success = paper_crud.remove_question_from_paper(db, paper_question_id)
    if not success:
        raise HTTPException(status_code=404, detail="Paper question not found")
    return None


# ============================================
# Paper Submission & Grading Endpoints
# ============================================

@router.post("/submit", response_model=PaperGradingResult)
def submit_and_grade_paper(
    submission: PaperSubmitRequest,
    current_user: User = Depends(require_student),
    db: Session = Depends(get_db)
):
    """
    Submit and grade a complete theory paper
    
    **This is the main endpoint for full paper grading!**
    
    Example request:
    ```json
    {
        "paper_id": 1,
        "student_id": "STU001",
        "student_name": "Alice Johnson",
        "answers": [
            {"question_number": 1, "answer": "Photosynthesis is..."},
            {"question_number": 2, "answer": "DNA stores..."}
        ],
        "use_enhanced_scoring": true,
        "rubric_weights": {
            "accuracy": 0.5,
            "completeness": 0.35,
            "clarity": 0.15
        }
    }
    ```
    
    Returns:
    - Complete grading results
    - Individual question scores
    - Overall feedback
    - Letter grade
    """
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
        
        logger.info(f"Graded paper {submission.paper_id} for student {submission.student_id}")
        return result
        
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Paper submission failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/submissions/{submission_id}", response_model=SubmissionDetail)
def get_submission(submission_id: int, current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)):
    """
    Get detailed view of a paper submission
    
    Returns:
    - Complete paper details
    - All question responses
    - Scores and feedback for each question
    - Overall results
    """
    submission = paper_crud.get_submission_with_details(db, submission_id)
    if not submission:
        raise HTTPException(status_code=404, detail="Submission not found")
    return submission


@router.get("/students/{student_id}/papers", response_model=List[SubmissionSummary])
def get_student_papers(
    student_id: str,
    current_user: User = Depends(get_current_active_user),
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """
    Get all paper submissions for a student
    
    Returns list of all papers the student has attempted
    """
    submissions = paper_crud.get_student_paper_submissions(db, student_id, skip, limit)
    return submissions


# ============================================
# Statistics Endpoints
# ============================================

@router.get("/{paper_id}/statistics", response_model=PaperStatistics)
def get_paper_statistics(paper_id: int, current_user: User = Depends(require_teacher), db: Session = Depends(get_db)):
    """
    Get comprehensive statistics for a specific paper
    
    Returns:
    - Number of submissions
    - Average scores
    - Grade distribution
    - Performance bands (excellent, good, satisfactory, needs improvement)
    """
    stats = paper_crud.get_paper_statistics(db, paper_id)
    if not stats:
        raise HTTPException(status_code=404, detail="Paper not found")
    return stats