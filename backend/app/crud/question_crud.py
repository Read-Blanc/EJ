"""
Question CRUD Operations
Database operations for question management
"""

from sqlalchemy.orm import Session
from typing import List, Optional
from app.models.question import Question


def create_question(
    db: Session,
    question_text: str,
    model_answer: str,
    subject: Optional[str] = None,
    topic: Optional[str] = None,
    max_score: int = 10,
    difficulty: Optional[str] = None
) -> Question:
    """
    Create a new question
    
    Args:
        db: Database session
        question_text: The question text
        model_answer: The ideal/model answer
        subject: Subject area (e.g., "Biology", "Mathematics")
        topic: Specific topic (e.g., "Photosynthesis", "Algebra")
        max_score: Maximum score for this question
        difficulty: Difficulty level (easy, medium, hard)
    
    Returns:
        Created Question object
    """
    question = Question(
        question_text=question_text,
        model_answer=model_answer,
        subject=subject,
        topic=topic,
        max_score=max_score,
        difficulty=difficulty
    )
    db.add(question)
    db.commit()
    db.refresh(question)
    return question


def get_question(db: Session, question_id: int) -> Optional[Question]:
    """
    Get a question by ID
    
    Args:
        db: Database session
        question_id: Question ID
    
    Returns:
        Question object or None if not found
    """
    return db.query(Question).filter(Question.id == question_id).first()


def get_all_questions(
    db: Session,
    subject: Optional[str] = None,
    topic: Optional[str] = None,
    difficulty: Optional[str] = None,
    skip: int = 0,
    limit: int = 100
) -> List[Question]:
    """
    Get all questions with optional filtering
    
    Args:
        db: Database session
        subject: Filter by subject
        topic: Filter by topic
        difficulty: Filter by difficulty
        skip: Number of records to skip (for pagination)
        limit: Maximum number of records to return
    
    Returns:
        List of Question objects
    """
    query = db.query(Question)
    
    if subject:
        query = query.filter(Question.subject == subject)
    
    if topic:
        query = query.filter(Question.topic == topic)
    
    if difficulty:
        query = query.filter(Question.difficulty == difficulty)
    
    return query.offset(skip).limit(limit).all()


def update_question(
    db: Session,
    question_id: int,
    **kwargs
) -> Optional[Question]:
    """
    Update a question
    
    Args:
        db: Database session
        question_id: Question ID
        **kwargs: Fields to update
    
    Returns:
        Updated Question object or None if not found
    """
    question = get_question(db, question_id)
    if not question:
        return None
    
    for key, value in kwargs.items():
        if value is not None and hasattr(question, key):
            setattr(question, key, value)
    
    db.commit()
    db.refresh(question)
    return question


def delete_question(db: Session, question_id: int) -> bool:
    """
    Delete a question
    
    Args:
        db: Database session
        question_id: Question ID
    
    Returns:
        True if deleted, False if not found
    """
    question = get_question(db, question_id)
    if not question:
        return False
    
    db.delete(question)
    db.commit()
    return True


def search_questions(
    db: Session,
    search_term: str,
    skip: int = 0,
    limit: int = 100
) -> List[Question]:
    """
    Search questions by text
    
    Args:
        db: Database session
        search_term: Search term (searches in question_text and model_answer)
        skip: Number of records to skip
        limit: Maximum number of records to return
    
    Returns:
        List of matching Question objects
    """
    search_pattern = f"%{search_term}%"
    return (
        db.query(Question)
        .filter(
            (Question.question_text.ilike(search_pattern)) |
            (Question.model_answer.ilike(search_pattern)) |
            (Question.subject.ilike(search_pattern)) |
            (Question.topic.ilike(search_pattern))
        )
        .offset(skip)
        .limit(limit)
        .all()
    )


def get_questions_by_subject(
    db: Session,
    subject: str,
    skip: int = 0,
    limit: int = 100
) -> List[Question]:
    """
    Get all questions for a specific subject
    
    Args:
        db: Database session
        subject: Subject name
        skip: Number of records to skip
        limit: Maximum number of records to return
    
    Returns:
        List of Question objects
    """
    return (
        db.query(Question)
        .filter(Question.subject == subject)
        .offset(skip)
        .limit(limit)
        .all()
    )


def get_question_count(
    db: Session,
    subject: Optional[str] = None,
    difficulty: Optional[str] = None
) -> int:
    """
    Get count of questions with optional filtering
    
    Args:
        db: Database session
        subject: Filter by subject
        difficulty: Filter by difficulty
    
    Returns:
        Count of questions
    """
    query = db.query(Question)
    
    if subject:
        query = query.filter(Question.subject == subject)
    
    if difficulty:
        query = query.filter(Question.difficulty == difficulty)
    
    return query.count()

