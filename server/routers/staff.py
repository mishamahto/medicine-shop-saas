from fastapi import APIRouter, HTTPException, Depends, status
import asyncpg
from database import get_db

router = APIRouter()

@router.get("/")
async def get_staff(conn: asyncpg.Connection = Depends(get_db)):
    """Get all staff"""
    try:
        staff = await conn.fetch('SELECT * FROM users WHERE role = $1 ORDER BY created_at DESC', 'staff')
        return {
            "success": True,
            "data": [dict(member) for member in staff]
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        ) 