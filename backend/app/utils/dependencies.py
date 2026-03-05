"""
Authentication Dependencies
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from typing import Optional

from app.database import get_db
from app.models.user import User, UserRole
from app.utils.auth import verify_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    payload = verify_token(token)
    if payload is None:
        raise credentials_exception

    # ✅ Cast to int — python-jose may return sub as str or int depending on version
    raw_id = payload.get("sub")
    if raw_id is None:
        raise credentials_exception

    try:
        user_id = int(raw_id)
    except (TypeError, ValueError):
        raise credentials_exception

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )

    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user"
        )
    return current_user


async def require_admin(
    current_user: User = Depends(get_current_active_user)
) -> User:
    if not current_user.is_admin():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required"
        )
    return current_user


async def require_teacher(
    current_user: User = Depends(get_current_active_user)
) -> User:
    # ✅ is_lecturer() is the correct check — role enum is 'lecturer' not 'teacher'
    if not current_user.is_lecturer():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Lecturer privileges required"
        )
    return current_user


# Alias
require_lecturer = require_teacher


async def require_student(
    current_user: User = Depends(get_current_active_user)
) -> User:
    if not current_user.is_student():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Student privileges required"
        )
    return current_user


async def get_current_user_optional(
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> Optional[User]:
    if not token:
        return None
    try:
        payload = verify_token(token)
        if payload is None:
            return None
        raw_id = payload.get("sub")
        if raw_id is None:
            return None
        user_id = int(raw_id)
        user = db.query(User).filter(User.id == user_id).first()
        return user if user and user.is_active else None
    except Exception:
        return None


def check_user_can_access_resource(user: User, resource_owner_id: int) -> bool:
    if user.is_admin():
        return True
    return user.id == resource_owner_id