# app/utils/exceptions.py
class EvalAIException(Exception):
    """Base exception for EvalAI"""
    pass

class AuthenticationError(EvalAIException):
    """Authentication failed"""
    pass

class AuthorizationError(EvalAIException):
    """User not authorized"""
    pass

class ResourceNotFound(EvalAIException):
    """Resource not found"""
    pass

# app/middleware/error_handler.py
from fastapi import Request, status
from fastapi.responses import JSONResponse
from backend import app

@app.exception_handler(EvalAIException)
async def evalai_exception_handler(request: Request, exc: EvalAIException):
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={"detail": str(exc)}
    )