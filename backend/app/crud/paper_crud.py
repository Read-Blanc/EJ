"""
Paper CRUD Operations - Database operations for paper management
"""

from sqlalchemy.orm import Session
from typing import List, Optional, Dict
from datetime import datetime
from app.models.paper import Paper, PaperQuestion, PaperSubmission, QuestionResponse
from app.models import Question, Student


# ============================================
# Paper Management
# ============================================

def create_paper(
    db: Session,
    title: str,
    description: Optional[str],
    subject: str,
    total_marks: int,
    duration_minutes: Optional[int] = None,
    difficulty: str = "medium"
) -> Paper:
    """Create a new theory paper"""
    paper = Paper(
        title=title,
        description=description,
        subject=subject,
        total_marks=total_marks,
        duration_minutes=duration_minutes,
        difficulty=difficulty
    )
    db.add(paper)
    db.commit()
    db.refresh(paper)
    return paper


def get_paper(db: Session, paper_id: int) -> Optional[Paper]:
    """Get a paper by ID"""
    return db.query(Paper).filter(Paper.id == paper_id).first()


def get_all_papers(
    db: Session,
    subject: Optional[str] = None,
    is_active: Optional[bool] = None,
    skip: int = 0,
    limit: int = 100
) -> List[Paper]:
    """Get all papers with optional filtering"""
    query = db.query(Paper)
    
    if subject:
        query = query.filter(Paper.subject == subject)
    
    if is_active is not None:
        query = query.filter(Paper.is_active == (1 if is_active else 0))
    
    return query.order_by(Paper.created_at.desc()).offset(skip).limit(limit).all()


def update_paper(
    db: Session,
    paper_id: int,
    **kwargs
) -> Optional[Paper]:
    """Update paper details"""
    paper = get_paper(db, paper_id)
    if not paper:
        return None
    
    for key, value in kwargs.items():
        if value is not None and hasattr(paper, key):
            if key == "is_active":
                value = 1 if value else 0
            setattr(paper, key, value)
    
    paper.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(paper)
    return paper


def delete_paper(db: Session, paper_id: int) -> bool:
    """Delete a paper (soft delete by setting is_active=0)"""
    paper = get_paper(db, paper_id)
    if not paper:
        return False
    
    paper.is_active = 0
    db.commit()
    return True


# ============================================
# Paper-Question Management
# ============================================

def add_question_to_paper(
    db: Session,
    paper_id: int,
    question_id: int,
    question_number: int,
    marks_allocated: int,
    is_required: bool = True
) -> PaperQuestion:
    """Add a question to a paper with mark allocation"""
    paper_question = PaperQuestion(
        paper_id=paper_id,
        question_id=question_id,
        question_number=question_number,
        marks_allocated=marks_allocated,
        is_required=1 if is_required else 0
    )
    db.add(paper_question)
    db.commit()
    db.refresh(paper_question)
    return paper_question


def remove_question_from_paper(db: Session, paper_question_id: int) -> bool:
    """Remove a question from a paper"""
    pq = db.query(PaperQuestion).filter(PaperQuestion.id == paper_question_id).first()
    if not pq:
        return False
    
    db.delete(pq)
    db.commit()
    return True


def get_paper_with_questions(db: Session, paper_id: int) -> Optional[Dict]:
    """Get paper with full question details"""
    paper = get_paper(db, paper_id)
    if not paper:
        return None
    
    questions = []
    for pq in sorted(paper.paper_questions, key=lambda x: x.question_number):
        question = pq.question
        questions.append({
            "question_number": pq.question_number,
            "question_id": pq.question_id,
            "question_text": question.question_text,
            "model_answer": question.model_answer,
            "marks_allocated": pq.marks_allocated,
            "is_required": bool(pq.is_required),
            "subject": question.subject,
            "topic": question.topic
        })
    
    return {
        "id": paper.id,
        "title": paper.title,
        "description": paper.description,
        "subject": paper.subject,
        "total_marks": paper.total_marks,
        "duration_minutes": paper.duration_minutes,
        "difficulty": paper.difficulty,
        "is_active": bool(paper.is_active),
        "created_at": paper.created_at,
        "questions": questions
    }


# ============================================
# Submission Management
# ============================================

def create_paper_submission(
    db: Session,
    paper_id: int,
    student_id: int
) -> PaperSubmission:
    """Create a new paper submission"""
    paper = get_paper(db, paper_id)
    if not paper:
        raise ValueError(f"Paper {paper_id} not found")
    
    submission = PaperSubmission(
        paper_id=paper_id,
        student_id=student_id,
        total_marks=paper.total_marks
    )
    db.add(submission)
    db.commit()
    db.refresh(submission)
    return submission


def add_question_response(
    db: Session,
    submission_id: int,
    paper_question_id: int,
    student_answer: str,
    similarity_score: float,
    awarded_score: int,
    marks_allocated: int,
    feedback: str,
    concept_analysis: Optional[Dict] = None
) -> QuestionResponse:
    """Add a question response to a submission"""
    response = QuestionResponse(
        submission_id=submission_id,
        paper_question_id=paper_question_id,
        student_answer=student_answer,
        similarity_score=similarity_score,
        awarded_score=awarded_score,
        marks_allocated=marks_allocated,
        feedback=feedback,
        concept_analysis=concept_analysis
    )
    db.add(response)
    db.commit()
    db.refresh(response)
    return response


def finalize_paper_submission(
    db: Session,
    submission_id: int,
    total_score: int,
    overall_feedback: str
) -> PaperSubmission:
    """Finalize a paper submission with total score and grade"""
    submission = db.query(PaperSubmission).filter(PaperSubmission.id == submission_id).first()
    if not submission:
        raise ValueError(f"Submission {submission_id} not found")
    
    # Calculate percentage
    percentage = (total_score / submission.total_marks * 100) if submission.total_marks > 0 else 0
    
    # Assign grade
    grade = assign_grade(percentage)
    
    # Update submission
    submission.total_score = total_score
    submission.percentage = round(percentage, 2)
    submission.grade = grade
    submission.overall_feedback = overall_feedback
    submission.grading_completed_at = datetime.utcnow()
    
    db.commit()
    db.refresh(submission)
    return submission


def assign_grade(percentage: float) -> str:
    """Assign letter grade based on percentage"""
    if percentage >= 90:
        return "A+"
    elif percentage >= 85:
        return "A"
    elif percentage >= 80:
        return "A-"
    elif percentage >= 75:
        return "B+"
    elif percentage >= 70:
        return "B"
    elif percentage >= 65:
        return "B-"
    elif percentage >= 60:
        return "C+"
    elif percentage >= 55:
        return "C"
    elif percentage >= 50:
        return "C-"
    elif percentage >= 45:
        return "D"
    else:
        return "F"


# ============================================
# Retrieval Operations
# ============================================

def get_submission(db: Session, submission_id: int) -> Optional[PaperSubmission]:
    """Get a paper submission by ID"""
    return db.query(PaperSubmission).filter(PaperSubmission.id == submission_id).first()


def get_submission_with_details(db: Session, submission_id: int) -> Optional[Dict]:
    """Get complete submission details with all responses"""
    submission = get_submission(db, submission_id)
    if not submission:
        return None
    
    paper = submission.paper
    student = submission.student
    
    # Get all question responses sorted by question number
    responses = []
    for qr in submission.question_responses:
        pq = qr.paper_question
        question = pq.question
        
        responses.append({
            "question_number": pq.question_number,
            "question_text": question.question_text,
            "student_answer": qr.student_answer,
            "marks_allocated": qr.marks_allocated,
            "awarded_score": qr.awarded_score,
            "similarity_score": qr.similarity_score,
            "feedback": qr.feedback,
            "concept_analysis": qr.concept_analysis
        })
    
    responses.sort(key=lambda x: x["question_number"])
    
    return {
        "submission_id": submission.id,
        "paper_id": paper.id,
        "paper_title": paper.title,
        "paper_subject": paper.subject,
        "paper_description": paper.description,
        "student_id": student.student_id,
        "student_name": student.name,
        "submitted_at": submission.submitted_at,
        "grading_completed_at": submission.grading_completed_at,
        "total_score": submission.total_score,
        "total_marks": submission.total_marks,
        "percentage": submission.percentage,
        "grade": submission.grade,
        "overall_feedback": submission.overall_feedback,
        "responses": responses
    }


def get_student_paper_submissions(
    db: Session,
    student_id: str,
    skip: int = 0,
    limit: int = 100
) -> List[Dict]:
    """Get all paper submissions for a student"""
    from app.crud import get_student_by_id
    
    student = get_student_by_id(db, student_id)
    if not student:
        return []
    
    submissions = (
        db.query(PaperSubmission)
        .filter(PaperSubmission.student_id == student.id)
        .order_by(PaperSubmission.submitted_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    
    results = []
    for sub in submissions:
        results.append({
            "submission_id": sub.id,
            "paper_id": sub.paper.id,
            "paper_title": sub.paper.title,
            "subject": sub.paper.subject,
            "submitted_at": sub.submitted_at,
            "total_score": sub.total_score,
            "total_marks": sub.total_marks,
            "percentage": sub.percentage,
            "grade": sub.grade,
            "grading_completed": sub.grading_completed_at is not None
        })
    
    return results


# ============================================
# Statistics Operations
# ============================================

def get_paper_statistics(db: Session, paper_id: int) -> Optional[Dict]:
    """Get comprehensive statistics for a specific paper"""
    paper = get_paper(db, paper_id)
    if not paper:
        return None
    
    submissions = db.query(PaperSubmission).filter(PaperSubmission.paper_id == paper_id).all()
    
    if not submissions:
        return {
            "paper_id": paper_id,
            "title": paper.title,
            "subject": paper.subject,
            "total_marks": paper.total_marks,
            "total_submissions": 0,
            "graded_submissions": 0,
            "pending_submissions": 0,
            "average_score": 0,
            "average_percentage": 0,
            "highest_score": 0,
            "lowest_score": 0,
            "median_score": 0,
            "grade_distribution": {},
            "excellent_count": 0,
            "good_count": 0,
            "satisfactory_count": 0,
            "needs_improvement_count": 0
        }
    
    completed = [s for s in submissions if s.total_score is not None]
    
    if not completed:
        return {
            "paper_id": paper_id,
            "title": paper.title,
            "subject": paper.subject,
            "total_marks": paper.total_marks,
            "total_submissions": len(submissions),
            "graded_submissions": 0,
            "pending_submissions": len(submissions),
            "average_score": 0,
            "average_percentage": 0,
            "highest_score": 0,
            "lowest_score": 0,
            "median_score": 0,
            "grade_distribution": {},
            "excellent_count": 0,
            "good_count": 0,
            "satisfactory_count": 0,
            "needs_improvement_count": 0
        }
    
    scores = [s.total_score for s in completed]
    percentages = [s.percentage for s in completed]
    
    # Calculate performance bands
    excellent = sum(1 for p in percentages if p >= 85)
    good = sum(1 for p in percentages if 70 <= p < 85)
    satisfactory = sum(1 for p in percentages if 50 <= p < 70)
    needs_improvement = sum(1 for p in percentages if p < 50)
    
    # Calculate median
    sorted_scores = sorted(scores)
    n = len(sorted_scores)
    median = sorted_scores[n // 2] if n % 2 else (sorted_scores[n // 2 - 1] + sorted_scores[n // 2]) / 2
    
    return {
        "paper_id": paper_id,
        "title": paper.title,
        "subject": paper.subject,
        "total_marks": paper.total_marks,
        "total_submissions": len(submissions),
        "graded_submissions": len(completed),
        "pending_submissions": len(submissions) - len(completed),
        "average_score": round(sum(scores) / len(scores), 2),
        "average_percentage": round(sum(percentages) / len(percentages), 2),
        "highest_score": max(scores),
        "lowest_score": min(scores),
        "median_score": round(median, 2),
        "grade_distribution": calculate_grade_distribution(completed),
        "excellent_count": excellent,
        "good_count": good,
        "satisfactory_count": satisfactory,
        "needs_improvement_count": needs_improvement
    }


def calculate_grade_distribution(submissions: List[PaperSubmission]) -> Dict[str, int]:
    """Calculate distribution of grades"""
    grades = {}
    for sub in submissions:
        grade = sub.grade
        grades[grade] = grades.get(grade, 0) + 1
    return grades