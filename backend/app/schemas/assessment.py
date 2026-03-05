# Assessment-related Pydantic schemas

# All request/response models for assessment endpoints

from pydantic import BaseModel
from typing import List


class AnswerRequest(BaseModel):
    """Single answer assessment request"""
    model_answer: str
    student_answer: str
    max_score: int = 10


class AssessmentResponse(BaseModel):
    """Assessment result response"""
    similarity_score: float
    awarded_score: int
    feedback: str


class BatchAnswerItem(BaseModel):
    """Single answer in a batch request"""
    student_id: str  # Unique identifier for the student
    model_answer: str
    student_answer: str
    max_score: int = 10


class BatchAnswerRequest(BaseModel):
    """Request for batch assessment"""
    answers: List[BatchAnswerItem]


class BatchAssessmentResult(BaseModel):
    """Result for a single assessment in batch"""
    student_id: str
    similarity_score: float
    awarded_score: int
    feedback: str


class BatchAssessmentResponse(BaseModel):
    """Response for batch assessment"""
    total_assessed: int
    results: List[BatchAssessmentResult]
    average_score: float
    processing_time_seconds: float


class SingleModelBatchRequest(BaseModel):
    """
    Batch assessment where all students answer the same question
    More efficient because model answer is encoded only once
    """
    model_answer: str
    student_answers: List[dict]  # [{"student_id": "...", "answer": "...", "max_score": 10}]


class AssessWithStorageRequest(BaseModel):
    """Assessment request that stores to database"""
    question_id: int
    student_id: str
    student_name: str
    student_answer: str


class EnhancedAssessmentRequest(BaseModel):
    """Request for enhanced rubric-based assessment with storage"""
    question_id: int
    student_id: str
    student_name: str
    student_answer: str
    rubric_weights: dict = None  # Optional: {"accuracy": 0.5, "completeness": 0.35, "clarity": 0.15}


class EnhancedAssessmentResponse(BaseModel):
    """Response from enhanced assessment"""
    awarded_score: int
    max_score: int
    percentage: float
    rubric_breakdown: dict
    feedback: dict
    key_concepts: dict