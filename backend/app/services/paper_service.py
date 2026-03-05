"""
Paper Grading Service - Business logic for grading complete papers
Orchestrates the assessment of multi-question papers
"""

from sqlalchemy.orm import Session
from typing import List, Dict, Optional
from datetime import datetime
import logging

from app.crud import paper_crud
from app.crud import get_or_create_student
from app.model import encode_text
from app.scorer import assess_answer, compute_similarity, map_similarity_to_score, generate_feedback
from app.enhanced_scorer import enhanced_assessment

logger = logging.getLogger("evalai")


class PaperGrader:
    """
    Orchestrates multi-question paper grading
    Supports both basic and enhanced scoring methods
    """
    
    def __init__(self, db: Session):
        self.db = db
    
    def grade_paper_basic(
        self,
        paper_id: int,
        student_id: str,
        student_name: str,
        answers: List[Dict[str, any]]  # [{"question_number": 1, "answer": "..."}]
    ) -> Dict:
        """
        Grade a complete paper using basic similarity scoring
        
        Args:
            paper_id: ID of the paper/assessment
            student_id: Student identifier
            student_name: Student name
            answers: List of answers with question numbers
        
        Returns:
            Complete grading result with breakdown
        """
        try:
            # Get paper with all questions
            paper_details = paper_crud.get_paper_with_questions(self.db, paper_id)
            if not paper_details:
                raise ValueError(f"Paper {paper_id} not found")
            
            # Get or create student
            student = get_or_create_student(self.db, student_id, student_name)
            
            # Create submission record
            submission = paper_crud.create_paper_submission(
                self.db,
                paper_id=paper_id,
                student_id=student.id
            )
            
            # Grade each question
            question_results = []
            total_score = 0
            
            # Create answer lookup by question number
            answer_map = {ans["question_number"]: ans["answer"] for ans in answers}
            
            for q in paper_details["questions"]:
                q_num = q["question_number"]
                student_answer = answer_map.get(q_num, "").strip()
                
                if not student_answer:
                    # Unanswered question
                    result = self._create_unanswered_result(q)
                else:
                    # Score the answer
                    result = self._score_question_basic(q, student_answer)
                    total_score += result["awarded_score"]
                
                question_results.append(result)
                
                # Save to database
                self._save_question_response(submission.id, paper_id, q_num, result)
            
            # Generate overall feedback
            percentage = (total_score / paper_details["total_marks"] * 100) if paper_details["total_marks"] > 0 else 0
            overall_feedback = self._generate_overall_feedback(percentage, question_results)
            
            # Finalize submission
            paper_crud.finalize_paper_submission(
                self.db,
                submission_id=submission.id,
                total_score=total_score,
                overall_feedback=overall_feedback
            )
            
            logger.info(f"Paper {paper_id} graded for {student_id}: {total_score}/{paper_details['total_marks']}")
            
            return {
                "submission_id": submission.id,
                "paper_id": paper_id,
                "paper_title": paper_details["title"],
                "student_id": student_id,
                "student_name": student_name,
                "total_score": total_score,
                "total_marks": paper_details["total_marks"],
                "percentage": round(percentage, 2),
                "grade": paper_crud.assign_grade(percentage),
                "overall_feedback": overall_feedback,
                "question_results": question_results,
                "submitted_at": submission.submitted_at,
                "grading_completed_at": submission.grading_completed_at
            }
            
        except Exception as e:
            logger.error(f"Paper grading failed: {e}")
            raise
    
    def grade_paper_enhanced(
        self,
        paper_id: int,
        student_id: str,
        student_name: str,
        answers: List[Dict[str, any]],
        rubric_weights: Optional[Dict[str, float]] = None
    ) -> Dict:
        """
        Grade a complete paper using enhanced rubric-based scoring
        
        Args:
            paper_id: ID of the paper/assessment
            student_id: Student identifier
            student_name: Student name
            answers: List of answers with question numbers
            rubric_weights: Optional custom rubric weights
        
        Returns:
            Complete grading result with detailed breakdown
        """
        try:
            # Get paper with all questions
            paper_details = paper_crud.get_paper_with_questions(self.db, paper_id)
            if not paper_details:
                raise ValueError(f"Paper {paper_id} not found")
            
            # Get or create student
            student = get_or_create_student(self.db, student_id, student_name)
            
            # Create submission record
            submission = paper_crud.create_paper_submission(
                self.db,
                paper_id=paper_id,
                student_id=student.id
            )
            
            # Grade each question with enhanced scoring
            question_results = []
            total_score = 0
            
            # Create answer lookup
            answer_map = {ans["question_number"]: ans["answer"] for ans in answers}
            
            for q in paper_details["questions"]:
                q_num = q["question_number"]
                student_answer = answer_map.get(q_num, "").strip()
                
                if not student_answer:
                    # Unanswered
                    result = self._create_unanswered_result(q)
                else:
                    # Enhanced assessment
                    result = self._score_question_enhanced(q, student_answer, rubric_weights)
                    total_score += result["awarded_score"]
                
                question_results.append(result)
                
                # Save to database
                self._save_question_response(submission.id, paper_id, q_num, result)
            
            # Generate overall feedback
            percentage = (total_score / paper_details["total_marks"] * 100) if paper_details["total_marks"] > 0 else 0
            overall_feedback = self._generate_overall_feedback_enhanced(percentage, question_results)
            
            # Finalize
            paper_crud.finalize_paper_submission(
                self.db,
                submission_id=submission.id,
                total_score=total_score,
                overall_feedback=overall_feedback
            )
            
            logger.info(f"Paper {paper_id} graded (enhanced) for {student_id}: {total_score}/{paper_details['total_marks']}")
            
            return {
                "submission_id": submission.id,
                "paper_id": paper_id,
                "paper_title": paper_details["title"],
                "student_id": student_id,
                "student_name": student_name,
                "total_score": total_score,
                "total_marks": paper_details["total_marks"],
                "percentage": round(percentage, 2),
                "grade": paper_crud.assign_grade(percentage),
                "overall_feedback": overall_feedback,
                "question_results": question_results,
                "submitted_at": submission.submitted_at,
                "grading_completed_at": submission.grading_completed_at
            }
            
        except Exception as e:
            logger.error(f"Enhanced paper grading failed: {e}")
            raise
    
    # ============================================
    # Helper Methods
    # ============================================
    
    def _create_unanswered_result(self, question: Dict) -> Dict:
        """Create result for an unanswered question"""
        return {
            "question_number": question["question_number"],
            "question_text": question["question_text"],
            "student_answer": "",
            "marks_allocated": question["marks_allocated"],
            "awarded_score": 0,
            "similarity_score": 0.0,
            "feedback": "Question not attempted."
        }
    
    def _score_question_basic(self, question: Dict, student_answer: str) -> Dict:
        """Score a single question using basic similarity"""
        # Encode and compute similarity
        model_vec = encode_text(question["model_answer"])
        student_vec = encode_text(student_answer)
        similarity = compute_similarity(model_vec, student_vec)
        
        # Map to score
        score = map_similarity_to_score(similarity, question["marks_allocated"])
        feedback = generate_feedback(similarity)
        
        return {
            "question_number": question["question_number"],
            "question_text": question["question_text"],
            "student_answer": student_answer,
            "marks_allocated": question["marks_allocated"],
            "awarded_score": score,
            "similarity_score": round(similarity, 3),
            "feedback": feedback
        }
    
    def _score_question_enhanced(
        self,
        question: Dict,
        student_answer: str,
        rubric_weights: Optional[Dict[str, float]]
    ) -> Dict:
        """Score a single question using enhanced rubric-based scoring"""
        assessment = enhanced_assessment(
            model_answer=question["model_answer"],
            student_answer=student_answer,
            max_score=question["marks_allocated"],
            rubric_weights=rubric_weights
        )
        
        return {
            "question_number": question["question_number"],
            "question_text": question["question_text"],
            "student_answer": student_answer,
            "marks_allocated": question["marks_allocated"],
            "awarded_score": assessment["awarded_score"],
            "percentage": assessment["percentage"],
            "similarity_score": assessment.get("similarity_score"),
            "rubric_breakdown": assessment.get("rubric_breakdown"),
            "concept_analysis": assessment.get("concept_analysis"),
            "feedback": assessment["feedback"]
        }
    
    def _save_question_response(
        self,
        submission_id: int,
        paper_id: int,
        question_number: int,
        result: Dict
    ) -> None:
        """Save question response to database"""
        # Find the paper_question record
        paper = paper_crud.get_paper(self.db, paper_id)
        pq = next((pq for pq in paper.paper_questions if pq.question_number == question_number), None)
        
        if pq:
            # Extract feedback as string
            feedback_str = result["feedback"]
            if isinstance(feedback_str, dict):
                feedback_str = feedback_str.get("overall", str(feedback_str))
            
            paper_crud.add_question_response(
                self.db,
                submission_id=submission_id,
                paper_question_id=pq.id,
                student_answer=result["student_answer"],
                similarity_score=result.get("similarity_score", 0.0),
                awarded_score=result["awarded_score"],
                marks_allocated=result["marks_allocated"],
                feedback=feedback_str,
                concept_analysis=result.get("concept_analysis")
            )
    
    def _generate_overall_feedback(self, percentage: float, question_results: List[Dict]) -> str:
        """Generate overall feedback for the entire paper"""
        # Calculate performance summary
        total_questions = len(question_results)
        attempted = sum(1 for q in question_results if q["awarded_score"] > 0)
        
        # Performance level
        if percentage >= 85:
            message = "Outstanding performance! You demonstrated comprehensive understanding across all topics."
        elif percentage >= 70:
            message = "Very good work! You showed strong grasp of most concepts."
        elif percentage >= 60:
            message = "Good effort! You understood key concepts but could improve in some areas."
        elif percentage >= 50:
            message = "Satisfactory performance. Review areas where you lost marks and strengthen your understanding."
        else:
            message = "Your performance needs significant improvement. Please review all topics carefully."
        
        # Identify strong and weak areas
        strong_areas = [q for q in question_results if q["awarded_score"] / q["marks_allocated"] >= 0.75]
        weak_areas = [q for q in question_results if q["awarded_score"] / q["marks_allocated"] < 0.5]
        
        feedback = f"""{message}

Paper Statistics:
- Total Questions: {total_questions}
- Questions Attempted: {attempted}
- Overall Score: {percentage:.1f}%

"""
        
        if strong_areas:
            feedback += "Strong Areas:\n"
            for q in strong_areas[:3]:  # Top 3
                feedback += f"  ✓ Question {q['question_number']}: {q['awarded_score']}/{q['marks_allocated']} marks\n"
            feedback += "\n"
        
        if weak_areas:
            feedback += "Areas Needing Improvement:\n"
            for q in weak_areas[:3]:  # Top 3 weakest
                feedback += f"  ✗ Question {q['question_number']}: {q['awarded_score']}/{q['marks_allocated']} marks\n"
        
        return feedback.strip()
    
    def _generate_overall_feedback_enhanced(self, percentage: float, question_results: List[Dict]) -> str:
        """Generate enhanced overall feedback with rubric analysis"""
        feedback = self._generate_overall_feedback(percentage, question_results)
        
        # Add rubric-level analysis if available
        rubric_results = [q for q in question_results if "rubric_breakdown" in q]
        
        if rubric_results:
            # Calculate average rubric scores
            accuracy_scores = [q["rubric_breakdown"]["accuracy"]["score"] for q in rubric_results]
            completeness_scores = [q["rubric_breakdown"]["completeness"]["score"] for q in rubric_results]
            clarity_scores = [q["rubric_breakdown"]["clarity"]["score"] for q in rubric_results]
            
            feedback += f"\n\nDetailed Rubric Analysis:\n"
            feedback += f"- Average Accuracy: {sum(accuracy_scores)/len(accuracy_scores):.2f}\n"
            feedback += f"- Average Completeness: {sum(completeness_scores)/len(completeness_scores):.2f}\n"
            feedback += f"- Average Clarity: {sum(clarity_scores)/len(clarity_scores):.2f}\n"
        
        return feedback