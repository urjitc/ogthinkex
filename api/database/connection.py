from sqlmodel import SQLModel, create_engine, Session
from typing import Generator
from .config import DATABASE_URL, ENGINE_CONFIG

# Create engine
engine = create_engine(DATABASE_URL, **ENGINE_CONFIG)


def create_db_and_tables():
    """Create database tables"""
    SQLModel.metadata.create_all(engine)


def get_session() -> Generator[Session, None, None]:
    """Get database session"""
    with Session(engine) as session:
        yield session
