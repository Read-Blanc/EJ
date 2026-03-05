# Student-related Pydantic schemas

# Models for student data and statistics

from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class StudentBase(BaseModel):
    """Base student fields"""
    student_id: str
    name: str


class StudentCreate(StudentBase):
    """Schema for creating a new student"""
    pass


class StudentResponse(StudentBase):
    """Schema for student response"""
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True


class StudentStatistics(BaseModel):
    """Statistics for a student's performance"""
    student_id: str
    student_name: str
    total_assessments: int
    average_score: float
    highest_score: int
    lowest_score: int
    subjects: dict  # Subject-wise performance
    recent_assessments: list