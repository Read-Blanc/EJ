"""
Authentication Routes
API endpoints for user signup, login, token refresh, and password management
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import List
import logging

from app.database import get_db
from app.schemas.auth import (
    UserSignup, UserLogin, Token, TokenRefresh,
    UserResponse, UserProfile, UserUpdate,
    PasswordChange, PasswordReset, PasswordResetConfirm
)
from app.crud import auth_crud
from app.utils.auth import create_tokens_for_user, verify_token
from app.utils.dependencies import get_current_user, get_current_active_user, require_admin
from app.models.user import User

logger = logging.getLogger("evalai")
router = APIRouter()


# ============================================
# Signup & Login
# ============================================

@router.options("/{path:path}")
async def auth_preflight_handler():
    return {}

@router.post("/signup", status_code=status.HTTP_201_CREATED)
def signup(user_data: UserSignup, db: Session = Depends(get_db)):
    """Register a new user account and return tokens for immediate login."""

    # Check if email already exists
    if auth_crud.get_user_by_email(db, user_data.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # Check if username already exists
    if auth_crud.get_user_by_username(db, user_data.username):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken"
        )

    # Create the user
    try:
        db_user = auth_crud.create_user(
            db=db,
            email=user_data.email,
            username=user_data.username,
            password=user_data.password,
            full_name=user_data.full_name,
            role=user_data.role.value,
            student_id=user_data.student_id or None,
        )
    except Exception as e:
        logger.error(f"Signup failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create user account"
        )

    # Auto-login: create tokens so frontend can navigate immediately
    tokens = create_tokens_for_user(db_user.id, db_user.username, db_user.role.value)

    auth_crud.create_refresh_token(
        db=db,
        user_id=db_user.id,
        token=tokens["refresh_token"]
    )

    logger.info(f"New user registered: {db_user.username} ({db_user.email})")

    return {
        **tokens,
        "user": {
            "id": db_user.id,
            "email": db_user.email,
            "username": db_user.username,
            "full_name": db_user.full_name,
            "role": db_user.role.value,
            "is_active": db_user.is_active,
            "student_id": db_user.student_id,
        }
    }

@router.post("/login")
def login(user_data: UserLogin, db: Session = Depends(get_db)):
    """
    Login with username/email and password

    Returns access token, refresh token, and user data.
    """
    # Authenticate user — result is a User INSTANCE, not the class
    db_user = auth_crud.authenticate_user(db, user_data.username, user_data.password)

    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not db_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )

    # Create tokens using the INSTANCE's attributes (db_user.id, not User.id)
    tokens = create_tokens_for_user(db_user.id, db_user.username, db_user.role.value)

    # Store refresh token in database
    auth_crud.create_refresh_token(
        db=db,
        user_id=db_user.id,
        token=tokens["refresh_token"]
    )

    logger.info(f"User logged in: {db_user.username}")

    # Return tokens + user data so frontend can navigate correctly
    return {
        **tokens,
        "user": {
            "id": db_user.id,
            "email": db_user.email,
            "username": db_user.username,
            "full_name": db_user.full_name,
            "role": db_user.role.value,
            "is_active": db_user.is_active,
            "student_id": db_user.student_id,
        }
    }



@router.post("/login/form", response_model=Token)
def login_form(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """
    Login using OAuth2 password flow (for Swagger UI)
    
    This endpoint is specifically for the Swagger UI's "Authorize" button
    """
    user = auth_crud.authenticate_user(db, form_data.username, form_data.password)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )
    
    tokens = create_tokens_for_user(user.id, user.username, user.role.value)
    
    auth_crud.create_refresh_token(
        db=db,
        user_id=user.id,
        token=tokens["refresh_token"]
    )
    
    return tokens


# ============================================
# Token Management
# ============================================
@router.post("/refresh")
def refresh_token(token_data: TokenRefresh, db: Session = Depends(get_db)):
    """Refresh access token using refresh token."""

    payload = verify_token(token_data.refresh_token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )

    db_token = auth_crud.get_refresh_token(db, token_data.refresh_token)
    if not db_token or not db_token.is_valid():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token expired or revoked"
        )

    # ✅ Cast sub to int — same fix as get_current_user
    try:
        user_id = int(payload.get("sub"))
    except (TypeError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload"
        )

    user = auth_crud.get_user_by_id(db, user_id)
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive"
        )

    tokens = create_tokens_for_user(user.id, user.username, user.role.value)

    auth_crud.create_refresh_token(
        db=db,
        user_id=user.id,
        token=tokens["refresh_token"]
    )

    logger.info(f"Token refreshed for user: {user.username}")
    return tokens


@router.post("/logout")
def logout(
    token_data: TokenRefresh,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Logout (revoke refresh token)
    
    **Revokes:**
    - The provided refresh token
    """
    auth_crud.revoke_refresh_token(db, token_data.refresh_token)
    
    logger.info(f"User logged out: {current_user.username}")
    return {"message": "Successfully logged out"}


@router.post("/logout-all")
def logout_all(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Logout from all devices (revoke all refresh tokens)
    
    **Use when:**
    - User wants to logout from all devices
    - Security concern (e.g., lost device)
    """
    auth_crud.revoke_all_user_tokens(db, current_user.id)
    
    logger.info(f"User logged out from all devices: {current_user.username}")
    return {"message": "Logged out from all devices"}


# ============================================
# User Profile
# ============================================

@router.get("/me", response_model=UserProfile)
def get_current_user_profile(current_user: User = Depends(get_current_active_user)):
    """
    Get current user's profile
    
    **Requires:** Valid access token
    
    **Returns:** Complete user profile
    """
    return current_user


@router.patch("/me", response_model=UserProfile)
def update_current_user_profile(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Update current user's profile
    
    **Can update:**
    - Full name
    - Email (must be unique)
    - Student ID
    """
    # Check if email is being changed and already exists
    if user_update.email:
        existing = auth_crud.get_user_by_email(db, user_update.email)
        if existing and existing.id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already in use"
            )
    
    updated_user = auth_crud.update_user(
        db=db,
        user_id=current_user.id,
        **user_update.model_dump(exclude_unset=True)
    )
    
    if not updated_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    logger.info(f"User profile updated: {current_user.username}")
    return updated_user


# ============================================
# Password Management
# ============================================

@router.post("/change-password")
def change_password(
    password_data: PasswordChange,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Change password
    
    **Requires:**
    - Current password (for verification)
    - New password (must meet strength requirements)
    """
    success = auth_crud.change_password(
        db=db,
        user_id=current_user.id,
        current_password=password_data.current_password,
        new_password=password_data.new_password
    )
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )
    
    # Revoke all tokens for security
    auth_crud.revoke_all_user_tokens(db, current_user.id)
    
    logger.info(f"Password changed for user: {current_user.username}")
    return {"message": "Password changed successfully. Please login again."}


# ============================================
# Admin Routes
# ============================================

@router.get("/users", response_model=List[UserResponse])
def get_all_users(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Get all users (Admin only)
    
    **Requires:** Admin role
    """
    users = auth_crud.get_all_users(db, skip=skip, limit=limit)
    return users


@router.post("/users/{user_id}/deactivate")
def deactivate_user(
    user_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Deactivate user account (Admin only)
    
    **Requires:** Admin role
    """
    success = auth_crud.deactivate_user(db, user_id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    logger.info(f"User {user_id} deactivated by admin: {current_user.username}")
    return {"message": "User deactivated successfully"}


@router.post("/users/{user_id}/activate")
def activate_user(
    user_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Activate user account (Admin only)
    
    **Requires:** Admin role
    """
    success = auth_crud.activate_user(db, user_id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    logger.info(f"User {user_id} activated by admin: {current_user.username}")
    return {"message": "User activated successfully"}