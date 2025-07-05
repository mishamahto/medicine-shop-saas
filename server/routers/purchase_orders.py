from fastapi import APIRouter, HTTPException, Depends, status
import asyncpg
from database import get_db

router = APIRouter()

@router.get("/")
@router.get("")
async def get_purchase_orders(conn: asyncpg.Connection = Depends(get_db)):
    """Get all purchase orders"""
    try:
        orders = await conn.fetch('SELECT * FROM purchase_orders ORDER BY created_at DESC')
        return {
            "success": True,
            "data": [dict(order) for order in orders]
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        ) 