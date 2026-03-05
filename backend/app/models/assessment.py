"""
Assessment Database Model

SQLAlchemy model for assessment records
"""
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base


class Assessment(Base):
    """Assessment model for storing student answer assessments"""
    
    __tablename__ = "assessments"
    
    id = Column(Integer, primary_key=True, index=True)
    question_id = Column(Integer, ForeignKey("questions.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    student_answer = Column(Text, nullable=False)
    similarity_score = Column(Float, nullable=False)  # 0.0 to 1.0
    awarded_score = Column(Integer, nullable=False)
    feedback = Column(Text)
    assessed_at = Column(DateTime, default=datetime.utcnow, index=True)
    
    # Relationships
    question = relationship("Question", back_populates="assessments")
    student = relationship("Student", back_populates="assessments")
    
    def __repr__(self):
        return f"<Assessment(id={self.id}, question_id={self.question_id}, student_id={self.student_id}, score={self.awarded_score})>"