"""
Analytics Routes

Endpoints for system-wide analytics and statistics
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
import logging
from app.database import get_db
from app import crud
from sqlalchemy import func
from app.utils.dependencies import get_current_active_user, require_teacher
from app.models.user import User

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/overview")
def get_analytics_overview(current_user: User = Depends(require_teacher), db: Session = Depends(get_db)):
    """
    Get overall system analytics
    
    Returns:
    - Total questions, students, assessments
    - Average score overall
    - Assessments by subject
    - Top performing students
    - Most challenging questions
    """
    return crud.get_overall_statistics(db)

@router.get("/student/{student_id}")
def get_student_analytics(student_id: int, current_user: User = Depends(require_teacher), db: Session = Depends(get_db)):
    """
    Get analytics for a specific student
    
    Parameters:
    - student_id: ID of the student
    
    Returns:
    - Total assessments taken
    - Average score
    - Performance over time
    - Strengths and weaknesses by subject
    """
    return crud.get_student_statistics(db, student_id)

@router.get("/question/{question_id}")
def get_question_analytics(question_id: int, current_user: User = Depends(require_teacher), db: Session = Depends(get_db)):
    """
    Get analytics for a specific question
    
    Parameters:
    - question_id: ID of the question
    
    Returns:
    - Total attempts
    - Average score
    - Common mistakes
    - Performance distribution
    """
    return crud.get_question_statistics(db, question_id)

@router.get("/subject/{subject_name}")
def get_subject_analytics(subject_name: str, current_user: User = Depends(require_teacher), db: Session = Depends(get_db)):
    """
    Get analytics for a specific subject
    
    Parameters:
    - subject_name: Name of the subject
    
    Returns:
    - Total questions in subject
    - Average score across all assessments in subject
    - Top performing students in subject
    - Most challenging questions in subject
    """
    return crud.get_subject_statistics(db, subject_name)

@router.get("/performance/trends")
def get_performance_trends(current_user: User = Depends(require_teacher), db: Session =
Depends(get_db)):
    """
    Get performance trends over time
    
    Returns:
    - Monthly/weekly assessment counts
    - Average scores over time
    - Improvement trends for students
    - Subject-wise performance trends
    """
    return crud.get_performance_trends(db)  

@router.get("/my-dashboard")
def get_my_dashboard(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get dashboard for current user
    
    **Requires:** Authentication (any role)
    
    Returns different data based on user role:
    - Students: Their own performance stats
    - Teachers/Admins: System overview
    """
    if current_user.is_student():
        # Return student's own stats
        student_id = current_user.student_id or current_user.username
        stats = crud.get_student_statistics(db, student_id)
        return {
            "role": "student",
            "statistics": stats,
            "user_info": {
                "username": current_user.username,
                "email": current_user.email,
                "full_name": current_user.full_name
            }
        }
    else:
        # Return system overview for teachers/admins
        overall_stats = crud.get_overall_statistics(db)
        return {
            "role": "teacher" if current_user.is_teacher() else "admin",
            "statistics": overall_stats,
            "user_info": {
                "username": current_user.username,
                "email": current_user.email,
                "full_name": current_user.full_name
            }
        }