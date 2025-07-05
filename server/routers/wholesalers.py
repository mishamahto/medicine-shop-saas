from fastapi import APIRouter, HTTPException, Depends, status
import asyncpg
from database import get_db

router = APIRouter()

@router.get("/")
@router.get("")
async def get_wholesalers(conn: asyncpg.Connection = Depends(get_db)):
    """Get all wholesalers"""
    try:
        # Placeholder - would need a wholesalers table
        return {
            "success": True,
            "data": []
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        ) 