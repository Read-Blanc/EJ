"""
Enhanced Assessment Service

Handles rubric-based enhanced assessments
"""
import logging
from typing import Dict, Optional
from app.enhanced_scorer import enhanced_assessment
from app.model import encode_text
from app.scorer import compute_similarity, map_similarity_to_score, generate_feedback

logger = logging.getLogger(__name__)


def perform_enhanced_assessment(
    model_answer: str,
    student_answer: str,
    max_score: int = 10,
    rubric_weights: Optional[Dict[str, float]] = None
) -> dict:
    """
    Perform enhanced rubric-based assessment
    
    Args:
        model_answer: Reference answer
        student_answer: Student's answer
        max_score: Maximum possible score
        rubric_weights: Optional weights for rubric criteria
    
    Returns:
        dict: Detailed assessment with rubric breakdown
    """
    logger.info(f"Performing enhanced assessment (max_score={max_score})")
    
    result = enhanced_assessment(
        model_answer=model_answer,
        student_answer=student_answer,
        max_score=max_score,
        rubric_weights=rubric_weights
    )
    
    logger.info(f"Enhanced assessment complete: {result['awarded_score']}/{max_score}")
    
    return result


def format_enhanced_feedback(result: dict) -> str:
    """
    Format enhanced assessment result into detailed feedback string
    
    Args:
        result: Enhanced assessment result dictionary
    
    Returns:
        str: Formatted feedback string
    """
    overall_feedback = result["feedback"]["overall"]
    
    detailed_feedback = f"""
{overall_feedback}

Accuracy: {result['feedback']['accuracy']}
Completeness: {result['feedback']['completeness']}
Clarity: {result['feedback']['clarity']}

Strengths: {', '.join(result['feedback']['strengths']) if result['feedback']['strengths'] else 'None identified'}

Improvements needed:
{chr(10).join('- ' + imp for imp in result['feedback']['improvements'])}

Score breakdown:
- Accuracy: {result['rubric_breakdown']['accuracy']['score']:.2f} (weight: {result['rubric_breakdown']['accuracy']['weight']})
- Completeness: {result['rubric_breakdown']['completeness']['score']:.2f} (weight: {result['rubric_breakdown']['completeness']['weight']})
- Clarity: {result['rubric_breakdown']['clarity']['score']:.2f} (weight: {result['rubric_breakdown']['clarity']['weight']})
    """.strip()
    
    return detailed_feedback


def compare_assessment_methods(model_answer: str, student_answer: str, max_score: int = 10) -> dict:
    """
    Compare basic vs enhanced assessment methods
    
    Args:
        model_answer: Reference answer
        student_answer: Student's answer
        max_score: Maximum score
    
    Returns:
        dict: Comparison of both methods
    """
    # Basic assessment
    model_vec = encode_text(model_answer)
    student_vec = encode_text(student_answer)
    similarity = compute_similarity(model_vec, student_vec)
    basic_score = map_similarity_to_score(similarity, max_score)
    basic_feedback = generate_feedback(similarity)
    
    # Enhanced assessment
    enhanced_result = enhanced_assessment(
        model_answer=model_answer,
        student_answer=student_answer,
        max_score=max_score
    )
    
    return {
        "basic_method": {
            "score": basic_score,
            "max_score": max_score,
            "similarity": round(similarity, 3),
            "feedback": basic_feedback
        },
        "enhanced_method": enhanced_result,
        "score_difference": enhanced_result["awarded_score"] - basic_score,
        "method_comparison": {
            "basic_description": "Simple cosine similarity between full answers",
            "enhanced_description": "Multi-criteria rubric: accuracy, completeness, and clarity with key concept detection"
        }
    }