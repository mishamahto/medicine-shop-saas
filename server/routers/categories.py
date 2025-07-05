from fastapi import APIRouter, HTTPException, Depends, status
import asyncpg
from database import get_db

router = APIRouter()

@router.get("/")
@router.get("")
async def get_categories(conn: asyncpg.Connection = Depends(get_db)):
    """Get all categories"""
    try:
        categories = await conn.fetch('SELECT * FROM categories ORDER BY created_at DESC')
        return {
            "success": True,
            "data": [dict(category) for category in categories]
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        ) 