from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

# Create FastAPI app
app = FastAPI(
    title="Medicine Shop SaaS API - Test",
    description="Test version for routing verification",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Test endpoints
@app.get("/")
async def root():
    return {
        "message": "Medicine Shop SaaS API - Test",
        "version": "1.0.0",
        "docs": "/docs"
    }

@app.get("/api/health")
async def health_check():
    return {"status": "OK", "message": "Server is running"}

@app.get("/api/inventory")
@app.get("/api/inventory/")
async def get_inventory():
    """Test inventory endpoint"""
    return {
        "success": True,
        "data": [
            {"id": 1, "name": "Test Medicine 1", "quantity": 10},
            {"id": 2, "name": "Test Medicine 2", "quantity": 5}
        ]
    }

@app.get("/api/categories")
@app.get("/api/categories/")
async def get_categories():
    """Test categories endpoint"""
    return {
        "success": True,
        "data": [
            {"id": 1, "name": "Antibiotics", "description": "Test category 1"},
            {"id": 2, "name": "Pain Relief", "description": "Test category 2"}
        ]
    }

if __name__ == "__main__":
    uvicorn.run(
        "test_main:app",
        host="0.0.0.0",
        port=8080,
        reload=False,
        log_level="info"
    ) 