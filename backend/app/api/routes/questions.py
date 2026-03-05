"""
Question Routes

Endpoints for question bank CRUD operations
"""
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List, Optional
import logging

from app.schemas.question import QuestionCreate, QuestionResponse, QuestionUpdate
from app.database import get_db
from app import crud
from app.utils.dependencies import (
    require_teacher,
    require_admin,
    get_current_active_user
)
from app.models.user import User
from app.crud import question_crud

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("", response_model=QuestionResponse, status_code=201)
def create_question(question: QuestionCreate, current_user: User = Depends(require_teacher), db: Session = Depends(get_db)):
    """
    Create a new question in the question bank
    """
    try:
        new_question = crud.create_question(
            db=db,
            question_text=question.question_text,
            model_answer=question.model_answer,
            subject=question.subject,
            topic=question.topic,
            max_score=question.max_score,
            difficulty=question.difficulty
        )
        logger.info(f"Created question ID: {new_question.id}")
        return new_question
    except Exception as e:
        logger.error(f"Failed to create question: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("", response_model=List[QuestionResponse])
def get_questions(
    subject: Optional[str] = None,
    topic: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """
    Get all questions with optional filters
    
    Query parameters:
    - subject: Filter by subject
    - topic: Filter by topic
    - skip: Pagination offset
    - limit: Maximum number of results
    """
    questions = crud.get_questions(db, subject=subject, topic=topic, skip=skip, limit=limit)
    return questions


@router.get("/{question_id}", response_model=QuestionResponse)
def get_question(question_id: int, db: Session = Depends(get_db)):
    """
    Get a specific question by ID
    """
    question = crud.get_question(db, question_id)
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
    return question


@router.put("/{question_id}", response_model=QuestionResponse)
def update_question(
    question_id: int,
    question_update: QuestionUpdate,
    current_user: User = Depends(require_teacher),
    db: Session = Depends(get_db)
):
    """
    Update a question
    
    Only provided fields will be updated
    """
    update_data = question_update.dict(exclude_unset=True)
    updated_question = crud.update_question(db, question_id, **update_data)
    
    if not updated_question:
        raise HTTPException(status_code=404, detail="Question not found")
    
    return updated_question


@router.delete("/{question_id}")
def delete_question(question_id: int, current_user: User = Depends(require_teacher), db: Session = Depends(get_db)):
    """
    Delete a question
    """
    success = crud.delete_question(db, question_id)
    if not success:
        raise HTTPException(status_code=404, detail="Question not found")
    return {"message": "Question deleted successfully"}


@router.get("/{question_id}/assessments")
def get_question_assessments(
    question_id: int,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """
    Get all assessments for a specific question
    """
    assessments = crud.get_question_assessments(db, question_id, skip, limit)
    return assessments


@router.get("/{question_id}/statistics")
def get_question_statistics(question_id: int, db: Session = Depends(get_db)):
    """
    Get performance statistics for a specific question
    
    Returns:
    - Total attempts
    - Average score
    - Pass rate
    - Difficulty rating
    """
    stats = crud.get_question_statistics(db, question_id)
    if not stats:
        raise HTTPException(status_code=404, detail="Question not found")
    return stats

@router.get("/search", response_model=List[QuestionResponse])
def search_questions(
    q: str,
    current_user: User = Depends(require_teacher),
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """
    Search questions by text
    **Requires:** Teacher or Admin role
    """
    questions = question_crud.search_questions(db, q, skip, limit)
    return questions