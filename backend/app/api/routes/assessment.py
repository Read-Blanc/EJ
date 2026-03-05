# app/api/routes/assessment.py
from fastapi import APIRouter, HTTPException
from fastapi.params import Depends
from app.schemas.assessment import AnswerRequest, AssessmentResponse
from app.services.assessment_service import assess_single_answer
from app.utils.dependencies import require_student
from app.database import get_db
from sqlalchemy.orm import Session
import logging
from app.models.user import User


logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("", response_model=AssessmentResponse)
def assess_answer_endpoint(data: AnswerRequest, current_user: User = Depends(require_student), db: Session = Depends(get_db)) -> AssessmentResponse:
    try:
        # Validation
        if not data.model_answer.strip():
            raise HTTPException(status_code=400, detail="model_answer cannot be empty")
        
        # Delegate to service layer
        result = assess_single_answer(
            model_answer=data.model_answer,
            student_answer=data.student_answer,
            max_score=data.max_score
        )
        
        return AssessmentResponse(**result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Assessment failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))