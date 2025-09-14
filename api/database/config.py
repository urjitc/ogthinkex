import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Database URL configuration
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable not set")

# SQLAlchemy engine configuration
ENGINE_CONFIG = {
    "echo": True,  # Set to False in production
    "pool_size": 10,
    "max_overflow": 20,
    "pool_pre_ping": True,
    "pool_recycle": 300
}
