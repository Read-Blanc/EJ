"""
API Routes package

Imports all route modules for easy registration
"""
from app.api.routes import assessment
from app.api.routes import enhanced
from app.api.routes import questions
from app.api.routes import students
from app.api.routes import analytics
from app.api.routes import paper
from app.api.routes import auth
from app.api.routes import oauth

__all__ = [
    "assessment",
    "enhanced",
    "questions",
    "students",
    "analytics",
    "paper",
    "auth",
    "lecturer",
    "oauth",
]