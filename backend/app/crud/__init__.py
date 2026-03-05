"""
CRUD Operations Package
Centralizes all database operations for the EvalAI system
"""

from .question_crud import *
from .student_crud import *
from .assessment_crud import *
from .paper_crud import *

__all__ = [
    # Question CRUD
    "create_question",
    "get_question",
    "get_all_questions",
    "update_question",
    "delete_question",
    "search_questions",
    
    # Student CRUD
    "create_student",
    "get_student",
    "get_student_by_id",
    "get_or_create_student",
    "get_all_students",
    "update_student",
    "delete_student",
    
    # Assessment CRUD
    "create_assessment",
    "get_assessment",
    "get_assessments_by_student",
    "get_assessments_by_question",
    "get_student_statistics",
    
    # Paper CRUD
    "create_paper",
    "get_paper",
    "get_all_papers",
    "update_paper",
    "delete_paper",
    "add_question_to_paper",
    "remove_question_from_paper",
    "get_paper_with_questions",
    "create_paper_submission",
    "add_question_response",
    "finalize_paper_submission",
    "get_submission",
    "get_submission_with_details",
    "get_student_paper_submissions",
    "get_paper_statistics",
]