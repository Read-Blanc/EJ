
# Database Configuration

# PostgreSQL database connection and session management

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

# Create engine with PostgreSQL optimizations
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,      # Verify connections before using
    pool_size=10,            # Connection pool size
    max_overflow=20,         # Extra connections if pool is exhausted
    pool_recycle=3600,       # Recycle connections after 1 hour
    echo=False               # Set True to see SQL queries (debugging)
)

# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models
Base = declarative_base()


def get_db():
    """
    Database session dependency for FastAPI
    
    Yields a database session and ensures it's properly closed after use.
    Use with FastAPI's Depends() for automatic session management.
    
    Example:
        @app.get("/items")
        def get_items(db: Session = Depends(get_db)):
            return db.query(Item).all()
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """
    Initialize database by creating all tables
    
    Imports all models and creates their corresponding tables in PostgreSQL.
    Safe to call multiple times - won't recreate existing tables.
    """
    # Import all models to register them with Base
    # This ensures SQLAlchemy knows about all tables
    try:
        from app.models import Question, Student, Assessment
    except ImportError:
        # If models folder doesn't exist yet, that's okay
        # Tables will be created when models are defined
        pass
    
    # Create all tables that don't exist yet
    Base.metadata.create_all(bind=engine)
    print("✓ Database tables created/verified")


def test_connection():
    """
    Test database connection
    
    Returns True if connection successful, False otherwise
    """
    try:
        from sqlalchemy import text
        with engine.connect() as conn:
            result = conn.execute(text("SELECT version()"))
            version = result.fetchone()[0]
            print(f"✓ PostgreSQL connection successful!")
            print(f"  Version: {version.split(',')[0]}")
            return True
    except Exception as e:
        print(f"✗ PostgreSQL connection failed: {e}")
        return False