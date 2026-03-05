# Question-related Pydantic schemas
# Models for question bank CRUD operations

from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class QuestionBase(BaseModel):
    """Base question fields"""
    question_text: str
    model_answer: str
    subject: Optional[str] = None
    topic: Optional[str] = None
    max_score: int = 10
    difficulty: Optional[str] = None  # e.g., "easy", "medium", "hard"


class QuestionCreate(QuestionBase):
    """Schema for creating a new question"""
    pass


class QuestionUpdate(BaseModel):
    """Schema for updating a question (all fields optional)"""
    question_text: Optional[str] = None
    model_answer: Optional[str] = None
    subject: Optional[str] = None
    topic: Optional[str] = None
    max_score: Optional[int] = None
    difficulty: Optional[str] = None


class QuestionResponse(QuestionBase):
    """Schema for question response (includes DB fields)"""
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True  # Pydantic v2 (use orm_mode = True for Pydantic v1)