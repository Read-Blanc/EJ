# Analytics-related Pydantic schemas

# Models for system-wide analytics and statistics
from pydantic import BaseModel
from typing import Dict, List


class QuestionStatistics(BaseModel):
    """Statistics for a specific question"""
    question_id: int
    question_text: str
    total_attempts: int
    average_score: float
    pass_rate: float  # Percentage of students scoring above threshold
    difficulty_rating: str  # Based on average performance


class OverallAnalytics(BaseModel):
    """System-wide analytics overview"""
    total_questions: int
    total_students: int
    total_assessments: int
    average_score_overall: float
    assessments_by_subject: Dict[str, int]
    top_performing_students: List[dict]
    most_challenging_questions: List[dict]


class ComparisonAnalytics(BaseModel):
    """Comparison between assessment methods"""
    basic_method: dict
    enhanced_method: dict
    score_difference: int
    method_comparison: dict