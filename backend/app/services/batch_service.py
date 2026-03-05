"""
Batch Assessment Service

Handles batch processing of multiple assessments
"""
import logging
import time
from typing import List
from app.model import encode_text
from app.scorer import compute_similarity, map_similarity_to_score, generate_feedback
from app.schemas.assessment import BatchAnswerItem, BatchAssessmentResult

logger = logging.getLogger(__name__)


def process_batch_assessments(answers: List[BatchAnswerItem]) -> tuple[List[BatchAssessmentResult], float, float]:
    """
    Process multiple assessments in batch
    
    Args:
        answers: List of BatchAnswerItem objects
    
    Returns:
        tuple: (results, average_score, processing_time)
    """
    start_time = time.time()
    
    logger.info(f"Starting batch assessment for {len(answers)} answers")
    
    results = []
    total_score = 0
    
    for item in answers:
        # Validate
        if not item.model_answer.strip() or not item.student_answer.strip():
            results.append(BatchAssessmentResult(
                student_id=item.student_id,
                similarity_score=0.0,
                awarded_score=0,
                feedback="Invalid answer: empty text provided"
            ))
            continue
        
        # Encode and assess
        model_vec = encode_text(item.model_answer)
        student_vec = encode_text(item.student_answer)
        similarity = compute_similarity(model_vec, student_vec)
        score = map_similarity_to_score(similarity, item.max_score)
        feedback = generate_feedback(similarity)
        
        results.append(BatchAssessmentResult(
            student_id=item.student_id,
            similarity_score=round(similarity, 3),
            awarded_score=score,
            feedback=feedback
        ))
        
        total_score += score
    
    # Calculate metrics
    avg_score = total_score / len(results) if results else 0.0
    processing_time = time.time() - start_time
    
    logger.info(f"Batch assessment complete: {len(results)} answers in {processing_time:.2f}s")
    
    return results, round(avg_score, 2), round(processing_time, 3)


def process_single_model_batch(model_answer: str, student_answers: List[dict]) -> tuple[List[BatchAssessmentResult], float, float]:
    """
    Optimized batch processing when all students answer the same question
    Model answer is encoded only once for efficiency
    
    Args:
        model_answer: The reference answer (encoded once)
        student_answers: List of dicts with student_id, answer, max_score
    
    Returns:
        tuple: (results, average_score, processing_time)
    """
    start_time = time.time()
    
    logger.info(f"Optimized batch assessment for {len(student_answers)} answers")
    
    # Encode model answer ONCE
    model_vec = encode_text(model_answer)
    
    results = []
    total_score = 0
    
    for item in student_answers:
        student_id = item.get("student_id", "unknown")
        answer = item.get("answer", "")
        max_score = item.get("max_score", 10)
        
        if not answer.strip():
            results.append(BatchAssessmentResult(
                student_id=student_id,
                similarity_score=0.0,
                awarded_score=0,
                feedback="Invalid answer: empty text provided"
            ))
            continue
        
        # Encode student answer and assess
        student_vec = encode_text(answer)
        similarity = compute_similarity(model_vec, student_vec)
        score = map_similarity_to_score(similarity, max_score)
        feedback = generate_feedback(similarity)
        
        results.append(BatchAssessmentResult(
            student_id=student_id,
            similarity_score=round(similarity, 3),
            awarded_score=score,
            feedback=feedback
        ))
        
        total_score += score
    
    avg_score = total_score / len(results) if results else 0.0
    processing_time = time.time() - start_time
    
    logger.info(f"Optimized batch complete: {len(results)} answers in {processing_time:.2f}s")
    
    return results, round(avg_score, 2), round(processing_time, 3)