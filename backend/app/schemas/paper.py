"""
Paper Schemas - Pydantic models for request/response validation
"""

from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
from datetime import datetime


# ============================================
# Paper Management Schemas
# ============================================

class PaperCreate(BaseModel):
    """Request schema for creating a new paper"""
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    subject: str = Field(..., min_length=1, max_length=100)
    total_marks: int = Field(..., gt=0)
    duration_minutes: Optional[int] = Field(None, gt=0)
    difficulty: Optional[str] = Field("medium", pattern="^(easy|medium|hard)$")


class PaperUpdate(BaseModel):
    """Request schema for updating a paper"""
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    subject: Optional[str] = Field(None, min_length=1, max_length=100)
    total_marks: Optional[int] = Field(None, gt=0)
    duration_minutes: Optional[int] = Field(None, gt=0)
    difficulty: Optional[str] = Field(None, pattern="^(easy|medium|hard)$")
    is_active: Optional[bool] = None


class PaperResponse(BaseModel):
    """Response schema for a paper"""
    id: int
    title: str
    description: Optional[str]
    subject: str
    total_marks: int
    duration_minutes: Optional[int]
    difficulty: str
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class PaperQuestionAdd(BaseModel):
    """Request schema for adding a question to a paper"""
    question_id: int = Field(..., gt=0)
    question_number: int = Field(..., gt=0)
    marks_allocated: int = Field(..., gt=0)
    is_required: bool = True


class QuestionInPaper(BaseModel):
    """Question details within a paper"""
    question_number: int
    question_id: int
    question_text: str
    model_answer: str
    marks_allocated: int
    is_required: bool
    subject: Optional[str]
    topic: Optional[str]


class PaperWithQuestions(BaseModel):
    """Complete paper with all questions"""
    id: int
    title: str
    description: Optional[str]
    subject: str
    total_marks: int
    duration_minutes: Optional[int]
    difficulty: str
    is_active: bool
    created_at: datetime
    questions: List[QuestionInPaper]


# ============================================
# Submission Schemas
# ============================================

class AnswerSubmission(BaseModel):
    """Single answer in a paper submission"""
    question_number: int = Field(..., gt=0)
    answer: str = Field(..., min_length=1)


class PaperSubmitRequest(BaseModel):
    """Request to submit and grade a complete paper"""
    paper_id: int = Field(..., gt=0)
    student_id: str = Field(..., min_length=1, max_length=50)
    student_name: str = Field(..., min_length=1, max_length=200)
    answers: List[AnswerSubmission] = Field(..., min_length=1)
    use_enhanced_scoring: bool = False
    rubric_weights: Optional[Dict[str, float]] = None


class QuestionResult(BaseModel):
    """Result for a single question"""
    question_number: int
    question_text: str
    student_answer: str
    marks_allocated: int
    awarded_score: int
    similarity_score: Optional[float] = None
    percentage: Optional[float] = None
    feedback: Any  # Can be string or dict depending on scoring method


class PaperGradingResult(BaseModel):
    """Complete paper grading result"""
    submission_id: int
    paper_id: int
    paper_title: str
    student_id: str
    student_name: str
    total_score: int
    total_marks: int
    percentage: float
    grade: str
    overall_feedback: str
    question_results: List[QuestionResult]
    submitted_at: datetime
    grading_completed_at: datetime


class SubmissionSummary(BaseModel):
    """Brief submission summary for lists"""
    submission_id: int
    paper_id: int
    paper_title: str
    subject: str
    submitted_at: datetime
    total_score: Optional[int]
    total_marks: int
    percentage: Optional[float]
    grade: Optional[str]
    grading_completed: bool


class SubmissionDetail(BaseModel):
    """Detailed submission view with all responses"""
    submission_id: int
    paper_id: int
    paper_title: str
    paper_subject: str
    paper_description: Optional[str]
    student_id: str
    student_name: str
    submitted_at: datetime
    grading_completed_at: Optional[datetime]
    total_score: Optional[int]
    total_marks: int
    percentage: Optional[float]
    grade: Optional[str]
    overall_feedback: Optional[str]
    responses: List[Dict[str, Any]]


# ============================================
# Statistics Schemas
# ============================================

class PaperStatistics(BaseModel):
    """Statistics for a specific paper"""
    paper_id: int
    title: str
    subject: str
    total_marks: int
    
    # Submission counts
    total_submissions: int
    graded_submissions: int
    pending_submissions: int
    
    # Score statistics
    average_score: float
    average_percentage: float
    highest_score: int
    lowest_score: int
    median_score: float
    
    # Grade distribution
    grade_distribution: Dict[str, int]
    
    # Performance bands
    excellent_count: int  # >= 85%
    good_count: int  # 70-84%
    satisfactory_count: int  # 50-69%
    needs_improvement_count: int  # < 50%


class StudentPaperHistory(BaseModel):
    """Student's paper submission history"""
    student_id: str
    student_name: str
    total_papers_attempted: int
    total_papers_graded: int
    average_percentage: float
    average_grade: str
    submissions: List[SubmissionSummary]


class QuestionPerformance(BaseModel):
    """Performance statistics for a specific question across all submissions"""
    question_id: int
    question_number: int
    question_text: str
    marks_allocated: int
    
    # Attempt statistics
    total_attempts: int
    average_score: float
    average_percentage: float
    
    # Score distribution
    full_marks_count: int
    zero_marks_count: int
    
    # Common issues
    common_mistakes: List[str]