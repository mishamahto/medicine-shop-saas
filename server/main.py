from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from contextlib import asynccontextmanager
import os
import logging
from typing import Optional
import uvicorn
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Import routers
from routers import auth, inventory, customers, invoices, bills, purchase_orders, categories, staff, wholesalers, dashboard
from database import init_db, get_db

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Security
security = HTTPBearer()

# CORS origins
allowed_origins = [
    "https://medicine-shop-frontend-538104438280.us-central1.run.app",
    "http://localhost:3000",
    "http://localhost:8080"
]

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting Medicine Shop SaaS Backend...")
    logger.info(f"NODE_ENV: {os.getenv('NODE_ENV', 'development')}")
    logger.info(f"PORT: {os.getenv('PORT', '8080')}")
    logger.info(f"DB_HOST: {os.getenv('DB_HOST', 'localhost')}")
    
    # Initialize database
    try:
        await init_db()
        logger.info("✅ Database initialized successfully")
    except Exception as e:
        logger.error(f"❌ Database initialization failed: {e}")
        raise e
    
    logger.info("🚀 Server ready to accept requests")
    yield
    
    # Shutdown
    logger.info("Shutting down Medicine Shop SaaS Backend...")

# Create FastAPI app
app = FastAPI(
    title="Medicine Shop SaaS API",
    description="Backend API for Medicine Shop SaaS application",
    version="1.0.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Health check endpoint
@app.get("/api/health")
async def health_check():
    logger.info("Health check endpoint hit")
    return {"status": "OK", "message": "Server is running"}

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(inventory.router, prefix="/api/inventory", tags=["Inventory"])
app.include_router(customers.router, prefix="/api/customers", tags=["Customers"])
app.include_router(invoices.router, prefix="/api/invoices", tags=["Invoices"])
app.include_router(bills.router, prefix="/api/bills", tags=["Bills"])
app.include_router(purchase_orders.router, prefix="/api/purchase-orders", tags=["Purchase Orders"])
app.include_router(categories.router, prefix="/api/categories", tags=["Categories"])
app.include_router(staff.router, prefix="/api/staff", tags=["Staff"])
app.include_router(wholesalers.router, prefix="/api/wholesalers", tags=["Wholesalers"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Dashboard"])

# Root endpoint
@app.get("/")
async def root():
    return {
        "message": "Medicine Shop SaaS API",
        "version": "1.0.0",
        "docs": "/docs"
    }

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8080))
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=False,
        log_level="info"
    ) 