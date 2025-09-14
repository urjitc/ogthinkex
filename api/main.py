import asyncio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

from config import CORS_ORIGINS, CORS_ORIGIN_REGEX
from database import create_db_and_tables
from services import AblyManager
from routes import cluster_router, ably_router
from routes.cluster_routes import set_ably_manager as set_cluster_ably_manager
from routes.ably_routes import set_ably_manager as set_ably_ably_manager

# -----------------------------
# FastAPI App Setup
# -----------------------------
app = FastAPI(
    title="ThinkEx Clusters API",
    description="PostgreSQL-backed clusters API with real-time updates via Ably.",
    version="2.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_origin_regex=CORS_ORIGIN_REGEX,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(cluster_router)
app.include_router(ably_router)

# Global manager instance
manager = None


@app.on_event("startup")
async def startup_event():
    """Initialize database and Ably clients on startup"""
    global manager
    print("Starting up FastAPI application...")
    
    # Create database tables
    print("Creating database tables...")
    create_db_and_tables()
    print("Database tables created successfully.")
    
    # Initialize Ably manager
    manager = AblyManager()
    if manager.ably_rest:
        print("Ably REST client initialized for token requests.")
    else:
        print("ABLY_API_KEY not found. Ably REST client not initialized.")

    # Set the manager in route modules
    set_cluster_ably_manager(manager)
    set_ably_ably_manager(manager)

    # Start Ably Realtime connection as a background task
    asyncio.create_task(manager.initialize_realtime())
    
    # Give it a moment to establish connection
    await asyncio.sleep(2)
    
    if manager.is_ready():
        print("Ably Realtime connection ready for broadcasting.")
    else:
        print("Ably Realtime connection not yet available, will be ready in background.")


@app.on_event("shutdown")
async def shutdown_event():
    """Clean up Ably connection on shutdown"""
    global manager
    print("Shutting down FastAPI application...")
    
    if manager:
        await manager.close()
    
    print("Ably connection cleanup completed")


# Health check endpoint
@app.get("/", tags=["meta"])
def root():
    """Health check endpoint"""
    return {"status": "ok", "message": "ThinkEx API is running with PostgreSQL backend"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
