"""
API Dependencies

Shared dependencies for API routes (authentication, database sessions, etc.)
"""
from typing import Generator
from sqlalchemy.orm import Session
from app.database import get_db

# Re-export get_db for convenience
__all__ = ["get_db"]

# You can add more shared dependencies here as needed:

# Example: Authentication dependency (for future use)
# async def get_current_user(token: str = Depends(oauth2_scheme)):
#     """Verify JWT token and return current user"""
#     # Add your authentication logic here
#     pass

# Example: Rate limiting dependency (for future use)
# async def rate_limit_check(request: Request):
#     """Check rate limits for API endpoints"""
#     # Add your rate limiting logic here
#     pass

# Example: Pagination dependency (for future use)
# def get_pagination_params(skip: int = 0, limit: int = 100):
#     """Common pagination parameters"""
#     return {"skip": skip, "limit": min(limit, 1000)}