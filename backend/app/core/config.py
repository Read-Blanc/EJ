"""
Core Configuration

Application settings and environment variables
"""
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    # App Info
    APP_NAME: str = "EvalAI - SERT Automated Theory Assessment"
    APP_VERSION: str = "2.0.0"
    DEBUG: bool = False

    BACKEND_URL: str = "http://localhost:8000"
    FRONTEND_URL: str = "http://localhost:3000"
    
    # CORS
    ALLOWED_ORIGINS: List[str] = ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:8000"]  # Backend server
     # Change in production to specific domains
    
    # Database
    DATABASE_URL: str = "postgresql://postgres:Samuel&David12@localhost:5432/evalai_db"  # Override with env var for production
    
    # ML Model
    MODEL_NAME: str = "all-MiniLM-L6-v2"  # Or whatever model you're using

    # OAuth Settings
    GOOGLE_CLIENT_ID: str = "976161066183-qtq9tqufehdvgnit0lui52pt7i9fmok9.apps.googleusercontent.com"
    GOOGLE_CLIENT_SECRET: str = ""
    MICROSOFT_CLIENT_ID: str = ""
    MICROSOFT_CLIENT_SECRET: str = ""
    GITHUB_CLIENT_ID: str = ""
    GITHUB_CLIENT_SECRET: str = ""
    
    # Assessment Settings
    DEFAULT_MAX_SCORE: int = 10
    SIMILARITY_THRESHOLD_EXCELLENT: float = 0.85
    SIMILARITY_THRESHOLD_GOOD: float = 0.70
    SIMILARITY_THRESHOLD_FAIR: float = 0.50

   
    
    class Config:
        env_file = ".env"
        case_sensitive = True


# Create global settings instance
settings = Settings()