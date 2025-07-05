from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel
import asyncpg
from database import get_db

router = APIRouter()

@router.get("/")
async def get_inventory(conn: asyncpg.Connection = Depends(get_db)):
    """Get all inventory items"""
    try:
        items = await conn.fetch('SELECT * FROM inventory ORDER BY created_at DESC')
        return {
            "success": True,
            "data": [dict(item) for item in items]
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.get("/{item_id}")
async def get_inventory_item(item_id: int, conn: asyncpg.Connection = Depends(get_db)):
    """Get specific inventory item"""
    try:
        item = await conn.fetchrow('SELECT * FROM inventory WHERE id = $1', item_id)
        if not item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Item not found"
            )
        return {
            "success": True,
            "data": dict(item)
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        ) 