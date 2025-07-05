from fastapi import APIRouter, HTTPException, Depends, status
import asyncpg
from database import get_db

router = APIRouter()

@router.get("/")
async def get_bills(conn: asyncpg.Connection = Depends(get_db)):
    """Get all bills"""
    try:
        bills = await conn.fetch('SELECT * FROM bills ORDER BY created_at DESC')
        return {
            "success": True,
            "data": [dict(bill) for bill in bills]
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        ) 