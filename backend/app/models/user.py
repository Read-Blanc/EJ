"""
User Model - Authentication and Authorization
"""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum
from datetime import datetime
import enum
from app.database import Base


class UserRole(str, enum.Enum):
    """User role enumeration"""
    lecturer = "lecturer"
    student = "student"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=True)  # nullable for OAuth users
    full_name = Column(String(200))

    role = Column(Enum(UserRole), default=UserRole.student, nullable=False)

    # OAuth fields
    oauth_provider = Column(String, nullable=True)
    oauth_provider_id = Column(String, nullable=True)

    # Account status
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login = Column(DateTime)

    student_id = Column(String(50), unique=True, nullable=True)

    def __repr__(self):
        return f"<User(id={self.id}, email='{self.email}', role='{self.role}')>"

    def has_role(self, role: UserRole) -> bool:
        return self.role == role

    def is_lecturer(self) -> bool:
        return self.role == UserRole.lecturer

    # Alias so existing code using is_teacher() still works
    def is_teacher(self) -> bool:
        return self.role == UserRole.lecturer

    def is_student(self) -> bool:
        return self.role == UserRole.student

    # No admin role exists — always False so require_admin rejects correctly
    def is_admin(self) -> bool:
        return False


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    token = Column(String(500), unique=True, nullable=False, index=True)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    revoked = Column(Boolean, default=False)

    def __repr__(self):
        return f"<RefreshToken(id={self.id}, user_id={self.user_id})>"

    def is_valid(self) -> bool:
        return not self.revoked and self.expires_at > datetime.utcnow()