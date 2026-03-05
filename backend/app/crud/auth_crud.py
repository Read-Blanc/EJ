"""
Authentication CRUD Operations
Database operations for user management and authentication
"""

from sqlalchemy.orm import Session
from typing import Optional, List, Union
from datetime import datetime, timedelta

from app.models.user import User, RefreshToken, UserRole
from app.utils.auth import hash_password, verify_password


# ============================================
# User CRUD Operations
# ============================================

def create_user(
    db: Session,
    email: str,
    username: str,
    password: str,
    full_name: str,
    role: Union[str, UserRole],  
    student_id: Optional[str] = None
) -> User:
    """Create new user with hashed password"""
    
    # Truncate password if needed
    if len(password) > 72:
        password = password[:72]
    
    hashed_password = hash_password(password)

    # x
    if isinstance(role, str):
        role_str = role.lower()
        if role_str == 'student':
            role_enum = UserRole.student
        elif role_str == 'lecturer':
            role_enum = UserRole.lecturer
        else:
            raise ValueError(f"Invalid role: {role}")
    elif isinstance(role, UserRole):
        role_enum = role
    else:
        raise ValueError(f"Invalid role type: {type(role)}")
    
    db_user = User(
        email=email,
        username=username,
        hashed_password=hashed_password,
        full_name=full_name,
        role=role_enum,  # Pass enum object
        student_id=student_id,
        is_active=True
    )
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    return db_user

def create_oauth_user(
    db: Session,
    email: str,
    username: str,
    full_name: str,
    oauth_provider: str,
    oauth_provider_id: str,
    role: str = "student"
) -> User:
    """
    Create a new user via OAuth (no password required)
    """
    db_user = User(
        email=email,
        username=username,
        full_name=full_name,
        role=UserRole[role],
        oauth_provider=oauth_provider,
        oauth_provider_id=oauth_provider_id,
        is_verified=True,  # OAuth emails are pre-verified
        hashed_password=None  # No password for OAuth users
    )
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    return db_user




def get_user_by_email(db: Session, email: str) -> Optional[User]:
    """Get user by email"""
    return db.query(User).filter(User.email == email).first()


def get_user_by_username(db: Session, username: str) -> Optional[User]:
    """Get user by username"""
    return db.query(User).filter(User.username == username).first()


def get_user_by_id(db: Session, user_id: int) -> Optional[User]:
    """Get user by ID"""
    return db.query(User).filter(User.id == user_id).first()


def get_user_by_student_id(db: Session, student_id: str) -> Optional[User]:
    """Get user by student ID"""
    return db.query(User).filter(User.student_id == student_id).first()


def authenticate_user(db: Session, username: str, password: str) -> Optional[User]:
    """
    Authenticate user with username and password
    
    Args:
        db: Database session
        username: Username or email
        password: Plain text password
    
    Returns:
        User object if authentication successful, None otherwise
    """
    # Try to find user by username or email
    user = get_user_by_username(db, username)
    if not user:
        user = get_user_by_email(db, username)
    
    if not user:
        return None
    
    # Verify password
    if not verify_password(password, user.hashed_password):
        return None
    
    # Update last login
    user.last_login = datetime.utcnow()
    db.commit()
    
    return user


def update_user(
    db: Session,
    user_id: int,
    **kwargs
) -> Optional[User]:
    """
    Update user details
    
    Args:
        db: Database session
        user_id: User ID
        **kwargs: Fields to update
    
    Returns:
        Updated User object or None if not found
    """
    user = get_user_by_id(db, user_id)
    if not user:
        return None
    
    # Update allowed fields
    allowed_fields = ['email', 'full_name', 'student_id']
    for key, value in kwargs.items():
        if key in allowed_fields and value is not None:
            setattr(user, key, value)
    
    user.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(user)
    return user


def change_password(
    db: Session,
    user_id: int,
    current_password: str,
    new_password: str
) -> bool:
    """
    Change user password
    
    Args:
        db: Database session
        user_id: User ID
        current_password: Current password for verification
        new_password: New password (will be hashed)
    
    Returns:
        True if successful, False otherwise
    """
    user = get_user_by_id(db, user_id)
    if not user:
        return False
    
    # Verify current password
    if not verify_password(current_password, user.hashed_password):
        return False
    
    # Hash and set new password
    user.hashed_password = hash_password(new_password)
    user.updated_at = datetime.utcnow()
    db.commit()
    
    return True


def deactivate_user(db: Session, user_id: int) -> bool:
    """Deactivate user account"""
    user = get_user_by_id(db, user_id)
    if not user:
        return False
    
    user.is_active = False
    user.updated_at = datetime.utcnow()
    db.commit()
    return True


def activate_user(db: Session, user_id: int) -> bool:
    """Activate user account"""
    user = get_user_by_id(db, user_id)
    if not user:
        return False
    
    user.is_active = True
    user.updated_at = datetime.utcnow()
    db.commit()
    return True


def verify_user_email(db: Session, user_id: int) -> bool:
    """Mark user email as verified"""
    user = get_user_by_id(db, user_id)
    if not user:
        return False
    
    user.is_verified = True
    user.updated_at = datetime.utcnow()
    db.commit()
    return True


def get_all_users(
    db: Session,
    role: Optional[UserRole] = None,
    skip: int = 0,
    limit: int = 100
) -> List[User]:
    """
    Get all users with optional filtering
    
    Args:
        db: Database session
        role: Filter by role
        skip: Pagination skip
        limit: Pagination limit
    
    Returns:
        List of User objects
    """
    query = db.query(User)
    
    if role:
        query = query.filter(User.role == role)
    
    return query.offset(skip).limit(limit).all()


# ============================================
# Refresh Token CRUD Operations
# ============================================

def create_refresh_token(
    db: Session,
    user_id: int,
    token: str,
    expires_delta: timedelta = timedelta(days=7)
) -> RefreshToken:
    """
    Store refresh token in database
    
    Args:
        db: Database session
        user_id: User ID
        token: Refresh token string
        expires_delta: Token expiration time
    
    Returns:
        Created RefreshToken object
    """
    refresh_token = RefreshToken(
        user_id=user_id,
        token=token,
        expires_at=datetime.utcnow() + expires_delta
    )
    
    db.add(refresh_token)
    db.commit()
    db.refresh(refresh_token)
    return refresh_token


def get_refresh_token(db: Session, token: str) -> Optional[RefreshToken]:
    """Get refresh token by token string"""
    return db.query(RefreshToken).filter(RefreshToken.token == token).first()


def revoke_refresh_token(db: Session, token: str) -> bool:
    """
    Revoke a refresh token
    
    Args:
        db: Database session
        token: Token string to revoke
    
    Returns:
        True if successful, False otherwise
    """
    refresh_token = get_refresh_token(db, token)
    if not refresh_token:
        return False
    
    refresh_token.revoked = True
    db.commit()
    return True


def revoke_all_user_tokens(db: Session, user_id: int) -> bool:
    """
    Revoke all refresh tokens for a user (logout from all devices)
    
    Args:
        db: Database session
        user_id: User ID
    
    Returns:
        True if successful
    """
    db.query(RefreshToken)\
        .filter(RefreshToken.user_id == user_id)\
        .update({"revoked": True})
    
    db.commit()
    return True


def cleanup_expired_tokens(db: Session) -> int:
    """
    Delete expired refresh tokens from database
    
    Args:
        db: Database session
    
    Returns:
        Number of tokens deleted
    """
    count = db.query(RefreshToken)\
        .filter(RefreshToken.expires_at < datetime.utcnow())\
        .delete()
    
    db.commit()
    return count