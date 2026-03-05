"""
Schemas package

Centralized export of all Pydantic models
"""
from app.schemas.assessment import (
    AnswerRequest,
    AssessmentResponse,
    BatchAnswerItem,
    BatchAnswerRequest,
    BatchAssessmentResult,
    BatchAssessmentResponse,
    SingleModelBatchRequest,
    AssessWithStorageRequest,
    EnhancedAssessmentRequest,
    EnhancedAssessmentResponse,
)

from app.schemas.question import (
    QuestionBase,
    QuestionCreate,
    QuestionUpdate,
    QuestionResponse,
)

from app.schemas.student import (
    StudentBase,
    StudentCreate,
    StudentResponse,
    StudentStatistics,
)

from app.schemas.analytics import (
    QuestionStatistics,
    OverallAnalytics,
    ComparisonAnalytics,
)

from app.schemas.paper import (
    PaperCreate,
    PaperResponse,
    PaperUpdate,
    PaperQuestionAdd,
    QuestionInPaper,
    PaperWithQuestions,
    PaperSubmitRequest,
    PaperGradingResult,
    AnswerSubmission,
    QuestionPerformance,
    QuestionResult,
    SubmissionSummary,
    SubmissionDetail,
    StudentPaperHistory,
    PaperStatistics,
)

from app.schemas.auth import (
    UserLogin,
    UserSignup,
    Token,
    TokenRefresh,
    PasswordChange,
    PasswordReset,
    PasswordResetConfirm,
    UserProfile,
    TokenPayload,
    UserResponse,
    UserUpdate,
    UserRole,
)

__all__ = [
    # Assessment schemas
    "AnswerRequest",
    "AssessmentResponse",
    "BatchAnswerItem",
    "BatchAnswerRequest",
    "BatchAssessmentResult",
    "BatchAssessmentResponse",
    "SingleModelBatchRequest",
    "AssessWithStorageRequest",
    "EnhancedAssessmentRequest",
    "EnhancedAssessmentResponse",
    
    # Question schemas
    "QuestionBase",
    "QuestionCreate",
    "QuestionUpdate",
    "QuestionResponse",
    
    # Student schemas
    "StudentBase",
    "StudentCreate",
    "StudentResponse",
    "StudentStatistics",
    
    # Analytics schemas
    "QuestionStatistics",
    "OverallAnalytics",
    "ComparisonAnalytics",

    # Paper schemas
    "PaperCreate",
    "PaperResponse",
    "PaperUpdate",
    "PaperQuestionAdd",
    "QuestionInPaper",
    "PaperWithQuestions",
    "PaperSubmitRequest",
    "PaperGradingResult",
    "AnswerSubmission",
    "QuestionPerformance",
    "QuestionResult",
    "SubmissionSummary",
    "SubmissionDetail",
    "StudentPaperHistory",
    "PaperStatistics",

    # Auth schemas
    "UserLogin",
    "UserSignup",
    "Token",
    "TokenRefresh",
    "PasswordChange",
    "PasswordReset",
    "PasswordResetConfirm",
    "UserProfile",
    "TokenPayload",
    "UserResponse",
    "UserUpdate",
    "UserRole",
]