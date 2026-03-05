"""
Assessment CRUD Operations
Database operations for single-question assessment management
"""

from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional, Dict
from datetime import datetime, timedelta
from app.models.assessment import Assessment
from app.models.student import Student
from app.models.question import Question


def create_assessment(
    db: Session,
    student_id: int,
    question_id: int,
    student_answer: str,
    similarity_score: float,
    awarded_score: int,
    feedback: str,
    concept_analysis: Optional[Dict] = None
) -> Assessment:
    """
    Create a new assessment record
    
    Args:
        db: Database session
        student_id: Student database ID
        question_id: Question database ID
        student_answer: Student's answer text
        similarity_score: Similarity score (0.0 to 1.0)
        awarded_score: Score awarded
        feedback: Feedback text
        concept_analysis: Optional detailed analysis
    
    Returns:
        Created Assessment object
    """
    assessment = Assessment(
        student_id=student_id,
        question_id=question_id,
        student_answer=student_answer,
        similarity_score=similarity_score,
        awarded_score=awarded_score,
        feedback=feedback,
        concept_analysis=concept_analysis
    )
    db.add(assessment)
    db.commit()
    db.refresh(assessment)
    return assessment


def get_assessment(db: Session, assessment_id: int) -> Optional[Assessment]:
    """
    Get an assessment by ID
    
    Args:
        db: Database session
        assessment_id: Assessment ID
    
    Returns:
        Assessment object or None if not found
    """
    return db.query(Assessment).filter(Assessment.id == assessment_id).first()


def get_assessments_by_student(
    db: Session,
    student_id: int,
    skip: int = 0,
    limit: int = 100
) -> List[Assessment]:
    """
    Get all assessments for a specific student
    
    Args:
        db: Database session
        student_id: Student database ID
        skip: Number of records to skip
        limit: Maximum number of records to return
    
    Returns:
        List of Assessment objects
    """
    return (
        db.query(Assessment)
        .filter(Assessment.student_id == student_id)
        .order_by(Assessment.timestamp.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


def get_assessments_by_question(
    db: Session,
    question_id: int,
    skip: int = 0,
    limit: int = 100
) -> List[Assessment]:
    """
    Get all assessments for a specific question
    
    Args:
        db: Database session
        question_id: Question database ID
        skip: Number of records to skip
        limit: Maximum number of records to return
    
    Returns:
        List of Assessment objects
    """
    return (
        db.query(Assessment)
        .filter(Assessment.question_id == question_id)
        .order_by(Assessment.timestamp.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


def get_recent_assessments(
    db: Session,
    hours: int = 24,
    skip: int = 0,
    limit: int = 100
) -> List[Assessment]:
    """
    Get recent assessments within specified hours
    
    Args:
        db: Database session
        hours: Number of hours to look back
        skip: Number of records to skip
        limit: Maximum number of records to return
    
    Returns:
        List of Assessment objects
    """
    cutoff_time = datetime.utcnow() - timedelta(hours=hours)
    return (
        db.query(Assessment)
        .filter(Assessment.timestamp >= cutoff_time)
        .order_by(Assessment.timestamp.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


def get_student_statistics(db: Session, student_id: int) -> Dict:
    """
    Get comprehensive statistics for a student
    
    Args:
        db: Database session
        student_id: Student database ID
    
    Returns:
        Dictionary with statistics
    """
    assessments = get_assessments_by_student(db, student_id, limit=1000)
    
    if not assessments:
        return {
            "total_assessments": 0,
            "average_score": 0,
            "average_similarity": 0,
            "total_score": 0,
            "max_possible_score": 0
        }
    
    total_score = sum(a.awarded_score for a in assessments)
    max_possible = sum(a.question.max_score for a in assessments)
    avg_similarity = sum(a.similarity_score for a in assessments) / len(assessments)
    
    # Subject-wise breakdown
    subject_stats = {}
    for assessment in assessments:
        subject = assessment.question.subject or "Unknown"
        if subject not in subject_stats:
            subject_stats[subject] = {
                "count": 0,
                "total_score": 0,
                "max_possible": 0
            }
        subject_stats[subject]["count"] += 1
        subject_stats[subject]["total_score"] += assessment.awarded_score
        subject_stats[subject]["max_possible"] += assessment.question.max_score
    
    return {
        "total_assessments": len(assessments),
        "average_score": round(total_score / len(assessments), 2),
        "average_similarity": round(avg_similarity * 100, 2),
        "total_score": total_score,
        "max_possible_score": max_possible,
        "percentage": round((total_score / max_possible * 100) if max_possible > 0 else 0, 2),
        "subject_breakdown": subject_stats
    }


def get_question_statistics(db: Session, question_id: int) -> Dict:
    """
    Get statistics for how students performed on a specific question
    
    Args:
        db: Database session
        question_id: Question database ID
    
    Returns:
        Dictionary with question performance statistics
    """
    assessments = get_assessments_by_question(db, question_id, limit=1000)
    
    if not assessments:
        return {
            "total_attempts": 0,
            "average_score": 0,
            "average_similarity": 0
        }
    
    scores = [a.awarded_score for a in assessments]
    similarities = [a.similarity_score for a in assessments]
    
    return {
        "total_attempts": len(assessments),
        "average_score": round(sum(scores) / len(scores), 2),
        "average_similarity": round(sum(similarities) / len(similarities) * 100, 2),
        "max_score_achieved": max(scores),
        "min_score_achieved": min(scores),
        "perfect_scores": sum(1 for s in scores if s == assessments[0].question.max_score),
        "zero_scores": sum(1 for s in scores if s == 0)
    }


def get_overall_statistics(db: Session) -> Dict:
    """
    Get overall system statistics
    
    Args:
        db: Database session
    
    Returns:
        Dictionary with overall statistics
    """
    total_assessments = db.query(Assessment).count()
    total_students = db.query(Student).count()
    total_questions = db.query(Question).count()
    
    if total_assessments == 0:
        return {
            "total_assessments": 0,
            "total_students": total_students,
            "total_questions": total_questions,
            "average_similarity": 0
        }
    
    avg_similarity = db.query(func.avg(Assessment.similarity_score)).scalar()
    
    return {
        "total_assessments": total_assessments,
        "total_students": total_students,
        "total_questions": total_questions,
        "average_similarity": round(avg_similarity * 100, 2) if avg_similarity else 0,
        "assessments_today": len(get_recent_assessments(db, hours=24, limit=10000))
    }


def delete_assessment(db: Session, assessment_id: int) -> bool:
    """
    Delete an assessment
    
    Args:
        db: Database session
        assessment_id: Assessment ID
    
    Returns:
        True if deleted, False if not found
    """
    assessment = get_assessment(db, assessment_id)
    if not assessment:
        return False
    
    db.delete(assessment)
    db.commit()
    return True


def get_assessment_count(
    db: Session,
    student_id: Optional[int] = None,
    question_id: Optional[int] = None
) -> int:
    """
    Get count of assessments with optional filtering
    
    Args:
        db: Database session
        student_id: Filter by student
        question_id: Filter by question
    
    Returns:
        Count of assessments
    """
    query = db.query(Assessment)
    
    if student_id:
        query = query.filter(Assessment.student_id == student_id)
    
    if question_id:
        query = query.filter(Assessment.question_id == question_id)
    
    return query.count()