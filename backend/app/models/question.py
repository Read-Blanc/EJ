"""
Question Database Model

SQLAlchemy model for questions in the question bank
"""
from sqlalchemy import Column, Integer, String, DateTime, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base


class Question(Base):
    """Question model for storing exam questions and model answers"""
    
    __tablename__ = "questions"
    
    id = Column(Integer, primary_key=True, index=True)
    question_text = Column(Text, nullable=False)
    model_answer = Column(Text, nullable=False)
    subject = Column(String(100), index=True)
    topic = Column(String(100), index=True)
    max_score = Column(Integer, default=10)
    difficulty = Column(String(20))  # easy, medium, hard
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    assessments = relationship("Assessment", back_populates="question", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Question(id={self.id}, subject='{self.subject}', topic='{self.topic}')>"