"""
EvalAI - Main Application Entry Point

Minimal FastAPI app setup with router registration
"""
from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.logging import setup_logging
from app.database import init_db
from app.model import get_model

# Import routers
from app.api.routes import assessment, enhanced, questions, students, analytics, paper, auth, lecturer, oauth

# Setup logging
logger = setup_logging()

# Create FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="AI-powered automated assessment system for theory questions"
)


# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080", "http://localhost:3000", "http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

#  Create API router with /api prefix
api_router = APIRouter(prefix="/api")

# Register routers
app.include_router(assessment.router, prefix="/assess", tags=["Assessment"])
app.include_router(enhanced.router, prefix="/assess/enhanced", tags=["Enhanced Assessment"])
app.include_router(questions.router, prefix="/questions", tags=["Questions"])
app.include_router(students.router, prefix="/students", tags=["Students"])
app.include_router(analytics.router, prefix="/analytics", tags=["Analytics"])
app.include_router(paper.router, prefix="/paper", tags=["Paper Management"])
app.include_router(auth.router, prefix="/auth", tags=["Authentication"])
app.include_router(oauth.router, prefix="/auth", tags=["OAuth"])
app.include_router(lecturer.router, prefix="/lecturer", tags=["Lecturer"])
# app.include_router(api_router)


@app.on_event("startup")
async def startup_event():
    """Initialize application on startup"""
    logger.info("🚀 Starting up EvalAI backend...")
    
    # Initialize database
    init_db()
    logger.info("✓ Database initialized")
    
    # Load ML model
    get_model()
    logger.info("✓ ML model loaded")
    
    logger.info("✅ EvalAI backend ready!")


@app.get("/", tags=["Health"])
def root():
    """Health check endpoint"""
    return {
        "message": "EvalAI backend is running",
        "status": "OK",
        "version": settings.APP_VERSION
    }


@app.get("/health", tags=["Health"])
def health_check():
    """Detailed health check"""
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION
    }