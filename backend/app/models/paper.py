from sqlalchemy import Column, Integer, String, Float, DateTime, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base


class Paper(Base):
    """Theory paper/assessment definition"""
    __tablename__ = "papers"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text)
    subject = Column(String(100), index=True)
    total_marks = Column(Integer, nullable=False)
    duration_minutes = Column(Integer)  # Exam duration
    difficulty = Column(String(20))  # easy, medium, hard
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    paper_questions = relationship("PaperQuestion", back_populates="paper", cascade="all, delete-orphan")
    paper_submissions = relationship("PaperSubmission", back_populates="paper")
    
    def __repr__(self):
        return f"<Paper(id={self.id}, title='{self.title}', total_marks={self.total_marks})>"


class PaperQuestion(Base):
    """Links questions to papers with specific marks allocation"""
    __tablename__ = "paper_questions"
    
    id = Column(Integer, primary_key=True, index=True)
    paper_id = Column(Integer, ForeignKey("papers.id"), nullable=False)
    question_id = Column(Integer, ForeignKey("questions.id"), nullable=False)
    question_number = Column(Integer, nullable=False)  # Q1, Q2, etc.
    marks_allocated = Column(Integer, nullable=False)
    is_required = Column(Integer, default=1)  # 1=required, 0=optional
    
    # Relationships
    paper = relationship("Paper", back_populates="paper_questions")
    question = relationship("Question")
    
    def __repr__(self):
        return f"<PaperQuestion(paper_id={self.paper_id}, q_num={self.question_number}, marks={self.marks_allocated})>"


class PaperSubmission(Base):
    """Student's complete paper submission"""
    __tablename__ = "paper_submissions"
    
    id = Column(Integer, primary_key=True, index=True)
    paper_id = Column(Integer, ForeignKey("papers.id"), nullable=False)
    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    submitted_at = Column(DateTime, default=datetime.utcnow)
    total_score = Column(Integer)
    total_marks = Column(Integer)
    percentage = Column(Float)
    grade = Column(String(5))  # A+, A, B+, etc.
    overall_feedback = Column(Text)
    grading_completed_at = Column(DateTime)
    
    # Relationships
    paper = relationship("Paper", back_populates="paper_submissions")
    student = relationship("Student")
    question_responses = relationship("QuestionResponse", back_populates="submission", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<PaperSubmission(id={self.id}, student_id={self.student_id}, score={self.total_score}/{self.total_marks})>"


class QuestionResponse(Base):
    """Individual question response within a paper submission"""
    __tablename__ = "question_responses"
    
    id = Column(Integer, primary_key=True, index=True)
    submission_id = Column(Integer, ForeignKey("paper_submissions.id"), nullable=False)
    paper_question_id = Column(Integer, ForeignKey("paper_questions.id"), nullable=False)
    student_answer = Column(Text, nullable=False)
    similarity_score = Column(Float)
    awarded_score = Column(Integer)
    marks_allocated = Column(Integer)
    feedback = Column(Text)
    concept_analysis = Column(JSON)  # Store detailed analysis as JSON
    
    # Relationships
    submission = relationship("PaperSubmission", back_populates="question_responses")
    paper_question = relationship("PaperQuestion")
    
    def __repr__(self):
        return f"<QuestionResponse(id={self.id}, score={self.awarded_score}/{self.marks_allocated})>"
