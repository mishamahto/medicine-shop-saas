from fastapi import APIRouter, HTTPException, Depends, status
import asyncpg
from database import get_db

router = APIRouter()

@router.get("/")
@router.get("")
async def get_customers(conn: asyncpg.Connection = Depends(get_db)):
    """Get all customers"""
    try:
        customers = await conn.fetch('SELECT * FROM customers ORDER BY created_at DESC')
        return {
            "success": True,
            "data": [dict(customer) for customer in customers]
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        ) 