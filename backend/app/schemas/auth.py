"""
Authentication Schemas - Request/Response models for auth endpoints
"""

from pydantic import BaseModel, EmailStr, Field, ConfigDict, field_validator
from typing import Optional
from datetime import datetime
from enum import Enum


class UserRole(str, Enum):
    """User role enumeration"""
    ADMIN = "admin"
    LECTURER = "lecturer"
    STUDENT = "student"


# ============================================
# Authentication Schemas
# ============================================

class UserSignup(BaseModel):
    """User signup/registration request"""
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=50, pattern="^[a-zA-Z0-9_-]+$")
    password: str = Field(..., min_length=8, max_length=100)
    full_name: str = Field(..., min_length=1, max_length=200)
    role: UserRole = UserRole.STUDENT
    student_id: Optional[str] = Field(None, max_length=50)
    
    @field_validator('password')
    @classmethod
    def validate_password(cls, v):
        """Validate password strength"""
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        if not any(c.isupper() for c in v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not any(c.islower() for c in v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not any(c.isdigit() for c in v):
            raise ValueError('Password must contain at least one digit')
        return v


class UserLogin(BaseModel):
    """User login request"""
    username: str = Field(..., min_length=3)
    password: str = Field(..., min_length=8)


class Token(BaseModel):
    """JWT token response"""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds


class TokenRefresh(BaseModel):
    """Token refresh request"""
    refresh_token: str


class PasswordChange(BaseModel):
    """Password change request"""
    current_password: str = Field(..., min_length=8)
    new_password: str = Field(..., min_length=8, max_length=100)
    
    @field_validator('new_password')
    @classmethod
    def validate_new_password(cls, v, info):
        """Validate new password strength"""
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        if not any(c.isupper() for c in v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not any(c.islower() for c in v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not any(c.isdigit() for c in v):
            raise ValueError('Password must contain at least one digit')
        
        # Check if new password is different from current
        current = info.data.get('current_password')
        if current and v == current:
            raise ValueError('New password must be different from current password')
        
        return v


class PasswordReset(BaseModel):
    """Password reset request"""
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    """Password reset confirmation"""
    token: str
    new_password: str = Field(..., min_length=8, max_length=100)


# ============================================
# User Response Schemas
# ============================================

class UserResponse(BaseModel):
    """User response model (without sensitive data)"""
    id: int
    email: str
    username: str
    full_name: Optional[str]
    role: UserRole
    student_id: Optional[str]
    is_active: bool
    is_verified: bool
    created_at: datetime
    last_login: Optional[datetime]
    
    model_config = ConfigDict(from_attributes=True)


class UserProfile(BaseModel):
    """Detailed user profile"""
    id: int
    email: str
    username: str
    full_name: Optional[str]
    role: UserRole
    student_id: Optional[str]
    is_active: bool
    is_verified: bool
    created_at: datetime
    updated_at: datetime
    last_login: Optional[datetime]
    
    model_config = ConfigDict(from_attributes=True)


class UserUpdate(BaseModel):
    """User profile update request"""
    full_name: Optional[str] = Field(None, min_length=1, max_length=200)
    email: Optional[EmailStr] = None
    student_id: Optional[str] = Field(None, max_length=50)


# ============================================
# Token Payload
# ============================================

class TokenPayload(BaseModel):
    """JWT token payload"""
    sub: int  # user_id
    username: str
    role: str
    exp: int  # expiration timestamp
    iat: int  # issued at timestamp