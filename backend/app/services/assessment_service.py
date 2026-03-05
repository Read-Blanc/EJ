from app.model import encode_text
from app.scorer import assess_answer, compute_similarity, map_similarity_to_score, generate_feedback

def assess_single_answer(model_answer: str, student_answer: str, max_score: int) -> dict:
    """Core assessment logic - reusable across endpoints"""
    result = assess_answer(model_answer, student_answer, max_score)
    
    return {
        "similarity_score": round(result['similarity'], 3),
        "awarded_score": result['score'],
        "feedback": result['feedback']
    }

def assess_with_vectors(model_vector, student_answer: str, max_score: int) -> dict:
    """
    Assess using pre-computed model vector (for batch optimization)
    
    Args:
        model_vector: Pre-computed embedding of model answer
        student_answer: The student's submitted answer
        max_score: Maximum possible score
    
    Returns:
        dict: Assessment result
    """
    student_vec = encode_text(student_answer)
    similarity = compute_similarity(model_vector, student_vec)
    score = map_similarity_to_score(similarity, max_score)
    feedback = generate_feedback(similarity)
    
    return {
        "similarity_score": round(similarity, 3),
        "awarded_score": score,
        "feedback": feedback
    }

def validate_assessment_inputs(model_answer: str, student_answer: str, max_score: int) -> tuple:
    """
    Validate assessment inputs
    
    Returns:
        tuple: (is_valid, error_message)
    """
    if not model_answer.strip():
        return False, "model_answer cannot be empty"
    
    if not student_answer.strip():
        return False, "student_answer cannot be empty"
    
    if max_score <= 0:
        return False, "max_score must be positive"
    
    return True, ""