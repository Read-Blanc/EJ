import numpy as np
from typing import List, Dict, Tuple, Optional
from sklearn.metrics.pairwise import cosine_similarity
import re
from app.model import encode_text, encode_texts

# ============================================
# Key Concept Extraction and Matching
# ============================================

class ConceptMatcher:
    """Match and score key concepts in answers"""
    
    def __init__(self):
        self.concept_threshold = 0.65  # Similarity threshold for concept match
    
    def extract_key_phrases(self, text: str, min_words: int = 2) -> List[str]:
        """
        Extract potential key phrases from text
        Simple approach: sentences and noun phrases
        """
        # Split into sentences
        sentences = [s.strip() for s in text.split('.') if s.strip()]
        
        # Also split by commas and semicolons for sub-phrases
        phrases = []
        for sent in sentences:
            # Add full sentence if not too long
            if len(sent.split()) <= 15:
                phrases.append(sent)
            
            # Add comma-separated phrases
            for phrase in sent.split(','):
                phrase = phrase.strip()
                if len(phrase.split()) >= min_words:
                    phrases.append(phrase)
        
        return phrases
    
    def identify_key_concepts(
        self, 
        model_answer: str, 
        top_n: int = 5
    ) -> List[str]:
        """
        Identify the most important concepts from model answer
        For now, we'll use sentence splitting, but this could be enhanced with NLP
        """
        phrases = self.extract_key_phrases(model_answer)
        
        # For simplicity, take first N phrases or all if fewer
        return phrases[:top_n] if len(phrases) > top_n else phrases
    
    def match_concepts(
        self,
        key_concepts: List[str],
        student_answer: str
    ) -> Dict[str, Dict]:
        """
        Match key concepts against student answer
        
        Returns:
            Dict with concept matches and scores
        """
        if not key_concepts:
            return {}
        
        # Extract student phrases
        student_phrases = self.extract_key_phrases(student_answer)
        
        if not student_phrases:
            return {concept: {"matched": False, "score": 0.0, "matched_phrase": None} 
                    for concept in key_concepts}
        
        # Encode all concepts and student phrases
        concept_embeddings = encode_texts(key_concepts)
        student_embeddings = encode_texts(student_phrases)
        
        # Compute similarity matrix
        similarity_matrix = cosine_similarity(concept_embeddings, student_embeddings)
        
        # Match each concept to best student phrase
        results = {}
        for i, concept in enumerate(key_concepts):
            best_match_idx = np.argmax(similarity_matrix[i])
            best_score = similarity_matrix[i][best_match_idx]
            
            results[concept] = {
                "matched": bool(best_score >= self.concept_threshold),
                "score": float(best_score),
                "matched_phrase": student_phrases[best_match_idx] if best_score >= self.concept_threshold else None
            }
        
        return results


# ============================================
# Rubric-Based Scorer
# ============================================

class RubricScorer:
    """Score answers based on multiple criteria"""
    
    def __init__(self):
        self.concept_matcher = ConceptMatcher()
    
    def score_completeness(
        self,
        model_answer: str,
        student_answer: str
    ) -> Dict[str, float]:
        """
        Score based on how complete the answer is
        Checks: length, key concepts coverage
        """
        model_len = len(model_answer.split())
        student_len = len(student_answer.split())
        
        # Length ratio (capped at 1.0)
        length_ratio = min(student_len / model_len, 1.0) if model_len > 0 else 0.0
        
        # Key concepts coverage
        key_concepts = self.concept_matcher.identify_key_concepts(model_answer)
        concept_matches = self.concept_matcher.match_concepts(key_concepts, student_answer)
        
        matched_count = sum(1 for m in concept_matches.values() if m["matched"])
        concept_coverage = matched_count / len(key_concepts) if key_concepts else 0.0
        
        # Combined completeness score
        completeness = (length_ratio * 0.3 + concept_coverage * 0.7)
        
        return {
            "score": float(completeness),
            "length_ratio": float(length_ratio),
            "concept_coverage": float(concept_coverage),
            "concepts_found": matched_count,
            "total_concepts": len(key_concepts)
        }
    
    def score_accuracy(
        self,
        model_answer: str,
        student_answer: str
    ) -> Dict[str, float]:
        """
        Score based on semantic accuracy
        Uses overall similarity as proxy for correctness
        """
        model_vec = encode_text(model_answer)
        student_vec = encode_text(student_answer)
        
        similarity = cosine_similarity(
            model_vec.reshape(1, -1),
            student_vec.reshape(1, -1)
        )[0][0]
        
        return {
            "score": float(max(0.0, min(1.0, similarity))),
            "similarity": float(similarity)
        }
    
    def score_clarity(
        self,
        student_answer: str
    ) -> Dict[str, float]:
        """
        Score based on clarity and structure
        Checks: sentence structure, proper punctuation, etc.
        """
        # Basic clarity metrics
        sentences = [s for s in student_answer.split('.') if s.strip()]
        words = student_answer.split()
        
        # Average sentence length (ideally 10-20 words)
        avg_sent_len = len(words) / len(sentences) if sentences else 0
        sentence_score = 1.0 if 10 <= avg_sent_len <= 20 else max(0.5, 1.0 - abs(avg_sent_len - 15) / 30)
        
        # Has proper punctuation
        has_punctuation = bool(re.search(r'[.!?,;:]', student_answer))
        punctuation_score = 1.0 if has_punctuation else 0.5
        
        # Not too short
        length_score = min(len(words) / 20, 1.0)  # At least 20 words for full score
        
        clarity = (sentence_score * 0.4 + punctuation_score * 0.3 + length_score * 0.3)
        
        return {
            "score": float(clarity),
            "avg_sentence_length": float(avg_sent_len),
            "has_punctuation": has_punctuation,
            "word_count": len(words)
        }
    
    def score_with_rubric(
        self,
        model_answer: str,
        student_answer: str,
        rubric_weights: Optional[Dict[str, float]] = None
    ) -> Dict:
        """
        Comprehensive rubric-based scoring
        
        Args:
            model_answer: Reference answer
            student_answer: Student's answer
            rubric_weights: Custom weights for each criterion
                          Default: {"accuracy": 0.5, "completeness": 0.35, "clarity": 0.15}
        
        Returns:
            Detailed scoring breakdown
        """
        if rubric_weights is None:
            rubric_weights = {
                "accuracy": 0.5,      # Most important
                "completeness": 0.35, # Second most important
                "clarity": 0.15       # Nice to have
            }
        
        # Score each component
        accuracy = self.score_accuracy(model_answer, student_answer)
        completeness = self.score_completeness(model_answer, student_answer)
        clarity = self.score_clarity(student_answer)
        
        # Calculate weighted total
        total_score = (
            accuracy["score"] * rubric_weights["accuracy"] +
            completeness["score"] * rubric_weights["completeness"] +
            clarity["score"] * rubric_weights["clarity"]
        )
        
        return {
            "total_score": float(total_score),
            "components": {
                "accuracy": accuracy,
                "completeness": completeness,
                "clarity": clarity
            },
            "rubric_weights": rubric_weights
        }


# ============================================
# Advanced Feedback Generator
# ============================================

class FeedbackGenerator:
    """Generate detailed, actionable feedback"""
    
    def __init__(self):
        self.concept_matcher = ConceptMatcher()
    
    def generate_detailed_feedback(
        self,
        rubric_result: Dict,
        model_answer: str,
        student_answer: str
    ) -> Dict[str, str]:
        """
        Generate comprehensive feedback based on rubric scores
        """
        components = rubric_result["components"]
        total = rubric_result["total_score"]
        
        # Overall feedback
        if total >= 0.9:
            overall = "Excellent work! Your answer demonstrates comprehensive understanding."
        elif total >= 0.8:
            overall = "Very good! Your answer is strong with minor areas for improvement."
        elif total >= 0.7:
            overall = "Good effort! Your answer captures the main ideas but could be enhanced."
        elif total >= 0.6:
            overall = "Fair attempt. Your answer shows some understanding but misses key elements."
        else:
            overall = "Your answer needs significant improvement. Please review the material carefully."
        
        # Accuracy feedback
        accuracy_score = components["accuracy"]["score"]
        if accuracy_score >= 0.85:
            accuracy_fb = "Your answer is semantically accurate and aligns well with the model answer."
        elif accuracy_score >= 0.7:
            accuracy_fb = "Your answer is mostly accurate but contains some imprecise statements."
        else:
            accuracy_fb = "Your answer has significant accuracy issues. Review the core concepts."
        
        # Completeness feedback
        comp = components["completeness"]
        completeness_score = comp["score"]
        concepts_found = comp.get("concepts_found", 0)
        total_concepts = comp.get("total_concepts", 0)
        
        if completeness_score >= 0.85:
            completeness_fb = f"Your answer is comprehensive, covering {concepts_found}/{total_concepts} key concepts."
        elif completeness_score >= 0.6:
            completeness_fb = f"Your answer covers {concepts_found}/{total_concepts} key concepts. Consider expanding on missing points."
        else:
            completeness_fb = f"Your answer is incomplete, covering only {concepts_found}/{total_concepts} key concepts. Add more detail."
        
        # Clarity feedback
        clarity_score = components["clarity"]["score"]
        word_count = components["clarity"].get("word_count", 0)
        
        if clarity_score >= 0.8:
            clarity_fb = "Your answer is well-structured and clearly written."
        elif clarity_score >= 0.6:
            clarity_fb = "Your answer could be clearer. Consider improving sentence structure and punctuation."
        else:
            if word_count < 15:
                clarity_fb = "Your answer is too brief. Provide more detail and explanation."
            else:
                clarity_fb = "Your answer lacks clarity. Break complex ideas into clear sentences."
        
        # Specific improvements
        improvements = []
        
        # Check missing concepts
        key_concepts = self.concept_matcher.identify_key_concepts(model_answer)
        concept_matches = self.concept_matcher.match_concepts(key_concepts, student_answer)
        missing_concepts = [c for c, m in concept_matches.items() if not m["matched"]]
        
        if missing_concepts and len(missing_concepts) <= 3:
            improvements.append(f"Consider including: {', '.join(missing_concepts[:3])}")
        elif len(missing_concepts) > 3:
            improvements.append(f"Several key concepts are missing. Review the material for completeness.")
        
        if word_count < 20:
            improvements.append("Provide more detailed explanations.")
        
        if accuracy_score < 0.7:
            improvements.append("Review the fundamental concepts to improve accuracy.")
        
        return {
            "overall": overall,
            "accuracy": accuracy_fb,
            "completeness": completeness_fb,
            "clarity": clarity_fb,
            "improvements": improvements,
            "strengths": self._identify_strengths(rubric_result)
        }
    
    def _identify_strengths(self, rubric_result: Dict) -> List[str]:
        """Identify what the student did well"""
        strengths = []
        components = rubric_result["components"]
        
        if components["accuracy"]["score"] >= 0.8:
            strengths.append("Strong conceptual accuracy")
        
        if components["completeness"]["score"] >= 0.8:
            strengths.append("Comprehensive coverage of key points")
        
        if components["clarity"]["score"] >= 0.8:
            strengths.append("Clear and well-structured writing")
        
        if not strengths:
            # Find the best component
            best = max(components.items(), key=lambda x: x[1]["score"])
            if best[1]["score"] >= 0.6:
                strengths.append(f"Good {best[0]}")
        
        return strengths
    
# ============================================
# Complete Enhanced Assessment Function
# ============================================

def enhanced_assessment(
    model_answer: str,
    student_answer: str,
    max_score: int = 10,
    rubric_weights: Optional[Dict[str, float]] = None
) -> Dict:
    """
    Perform complete enhanced assessment with detailed feedback
    
    Args:
        model_answer: Reference answer
        student_answer: Student's answer
        max_score: Maximum possible score
        rubric_weights: Optional custom rubric weights
    
    Returns:
        Complete assessment with scores, breakdown, and feedback
    """
    scorer = RubricScorer()
    feedback_gen = FeedbackGenerator()
    
    # Get rubric-based scores
    rubric_result = scorer.score_with_rubric(
        model_answer, 
        student_answer, 
        rubric_weights
    )
    
    # Convert to integer score
    total_score = rubric_result["total_score"]
    awarded_score = int(round(total_score * max_score))
    
    # Generate detailed feedback
    detailed_feedback = feedback_gen.generate_detailed_feedback(
        rubric_result,
        model_answer,
        student_answer
    )
    
    # Get key concepts analysis
    concept_matcher = ConceptMatcher()
    key_concepts = concept_matcher.identify_key_concepts(model_answer)
    concept_matches = concept_matcher.match_concepts(key_concepts, student_answer)
    
    return {
        "awarded_score": awarded_score,
        "max_score": max_score,
        "percentage": round(total_score * 100, 1),
        "rubric_breakdown": {
            "accuracy": {
                "score": rubric_result["components"]["accuracy"]["score"],
                "weight": rubric_result["rubric_weights"]["accuracy"],
                "weighted_contribution": rubric_result["components"]["accuracy"]["score"] * rubric_result["rubric_weights"]["accuracy"]
            },
            "completeness": {
                "score": rubric_result["components"]["completeness"]["score"],
                "weight": rubric_result["rubric_weights"]["completeness"],
                "weighted_contribution": rubric_result["components"]["completeness"]["score"] * rubric_result["rubric_weights"]["completeness"]
            },
            "clarity": {
                "score": rubric_result["components"]["clarity"]["score"],
                "weight": rubric_result["rubric_weights"]["clarity"],
                "weighted_contribution": rubric_result["components"]["clarity"]["score"] * rubric_result["rubric_weights"]["clarity"]
            }
        },
        "concept_analysis": {
            "total_concepts": len(key_concepts),
            "concepts_found": sum(1 for m in concept_matches.values() if m["matched"]),
            "concept_details": [
                {
                    "concept": concept,
                    "found": match["matched"],
                    "confidence": round(match["score"], 3),
                    "matched_phrase": match["matched_phrase"]
                }
                for concept, match in concept_matches.items()
            ]
        },
        "feedback": detailed_feedback
    }