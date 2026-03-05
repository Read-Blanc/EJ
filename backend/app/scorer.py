from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

from app.model import encode_text

def compute_similarity(vec1, vec2):
     # Reshape if needed (sklearn expects 2D arrays)
    if vec1.ndim == 1:
        vec1 = vec1.reshape(1, -1)
    if vec2.ndim == 1:
        vec2 = vec2.reshape(1, -1)
    
    similarity = cosine_similarity(vec1, vec2)[0][0]
    
    # Ensure it's between 0 and 1
    return float(max(0.0, min(1.0, similarity)))

def map_similarity_to_score(similarity: float, max_score: int = 10):
    if similarity >= 0.80:
        return max_score
    elif similarity >= 0.60:
        return int(0.7 * max_score)
    elif similarity >= 0.40:
        return int(0.4 * max_score)
    else:
        return 0
    
def generate_feedback(similarity: float) -> str:
    if similarity >= 0.80:
        return "Excellent answer. High semantic similarity to the model answer."
    elif similarity >= 0.60:
        return "Good answer, but missing some important concepts."
    elif similarity >= 0.40:
        return "Fair attempt, but the answer lacks clarity and key ideas."
    else:
        return "Poor answer. The response is semantically different from the expected answer."

def assess_answer(student_answer: str, model_answer: str, max_score: int = 10):
    vec_student = encode_text(student_answer)
    vec_model = encode_text(model_answer)

    similarity = compute_similarity(vec_student, vec_model)
    score = map_similarity_to_score(similarity, max_score)

    return similarity, score

