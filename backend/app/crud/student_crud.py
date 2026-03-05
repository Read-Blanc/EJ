"""
Student CRUD Operations
Database operations for student management
"""

from sqlalchemy.orm import Session
from typing import List, Optional
from app.models.student import Student


def create_student(
    db: Session,
    student_id: str,
    name: str,
    email: Optional[str] = None,
    class_name: Optional[str] = None
) -> Student:
    """
    Create a new student
    
    Args:
        db: Database session
        student_id: Unique student identifier
        name: Student name
        email: Student email
        class_name: Class/grade
    
    Returns:
        Created Student object
    """
    student = Student(
        student_id=student_id,
        name=name,
        email=email,
        class_name=class_name
    )
    db.add(student)
    db.commit()
    db.refresh(student)
    return student


def get_student(db: Session, id: int) -> Optional[Student]:
    """
    Get a student by database ID
    
    Args:
        db: Database session
        id: Database ID
    
    Returns:
        Student object or None if not found
    """
    return db.query(Student).filter(Student.id == id).first()


def get_student_by_id(db: Session, student_id: str) -> Optional[Student]:
    """
    Get a student by their student ID
    
    Args:
        db: Database session
        student_id: Student identifier (e.g., "STU001")
    
    Returns:
        Student object or None if not found
    """
    return db.query(Student).filter(Student.student_id == student_id).first()


def get_or_create_student(
    db: Session,
    student_id: str,
    name: str,
    email: Optional[str] = None,
    class_name: Optional[str] = None
) -> Student:
    """
    Get existing student or create new one
    
    Args:
        db: Database session
        student_id: Student identifier
        name: Student name
        email: Student email
        class_name: Class/grade
    
    Returns:
        Student object (existing or newly created)
    """
    student = get_student_by_id(db, student_id)
    if student:
        # Update name if provided and different
        if name and student.name != name:
            student.name = name
            db.commit()
            db.refresh(student)
        return student
    
    return create_student(db, student_id, name, email, class_name)


def get_all_students(
    db: Session,
    class_name: Optional[str] = None,
    skip: int = 0,
    limit: int = 100
) -> List[Student]:
    """
    Get all students with optional filtering
    
    Args:
        db: Database session
        class_name: Filter by class
        skip: Number of records to skip
        limit: Maximum number of records to return
    
    Returns:
        List of Student objects
    """
    query = db.query(Student)
    
    if class_name:
        query = query.filter(Student.class_name == class_name)
    
    return query.offset(skip).limit(limit).all()


def update_student(
    db: Session,
    student_id: str,
    **kwargs
) -> Optional[Student]:
    """
    Update a student
    
    Args:
        db: Database session
        student_id: Student identifier
        **kwargs: Fields to update
    
    Returns:
        Updated Student object or None if not found
    """
    student = get_student_by_id(db, student_id)
    if not student:
        return None
    
    for key, value in kwargs.items():
        if value is not None and hasattr(student, key):
            setattr(student, key, value)
    
    db.commit()
    db.refresh(student)
    return student


def delete_student(db: Session, student_id: str) -> bool:
    """
    Delete a student
    
    Args:
        db: Database session
        student_id: Student identifier
    
    Returns:
        True if deleted, False if not found
    """
    student = get_student_by_id(db, student_id)
    if not student:
        return False
    
    db.delete(student)
    db.commit()
    return True


def search_students(
    db: Session,
    search_term: str,
    skip: int = 0,
    limit: int = 100
) -> List[Student]:
    """
    Search students by name, student_id, or email
    
    Args:
        db: Database session
        search_term: Search term
        skip: Number of records to skip
        limit: Maximum number of records to return
    
    Returns:
        List of matching Student objects
    """
    search_pattern = f"%{search_term}%"
    return (
        db.query(Student)
        .filter(
            (Student.name.ilike(search_pattern)) |
            (Student.student_id.ilike(search_pattern)) |
            (Student.email.ilike(search_pattern))
        )
        .offset(skip)
        .limit(limit)
        .all()
    )


def get_student_count(db: Session, class_name: Optional[str] = None) -> int:
    """
    Get count of students with optional filtering
    
    Args:
        db: Database session
        class_name: Filter by class
    
    Returns:
        Count of students
    """
    query = db.query(Student)
    
    if class_name:
        query = query.filter(Student.class_name == class_name)
    
    return query.count()


def get_students_by_class(
    db: Session,
    class_name: str,
    skip: int = 0,
    limit: int = 100
) -> List[Student]:
    """
    Get all students in a specific class
    
    Args:
        db: Database session
        class_name: Class name
        skip: Number of records to skip
        limit: Maximum number of records to return
    
    Returns:
        List of Student objects
    """
    return (
        db.query(Student)
        .filter(Student.class_name == class_name)
        .offset(skip)
        .limit(limit)
        .all()
    )