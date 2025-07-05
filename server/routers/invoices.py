from fastapi import APIRouter, HTTPException, Depends, status
import asyncpg
from database import get_db

router = APIRouter()

@router.get("/")
async def get_invoices(conn: asyncpg.Connection = Depends(get_db)):
    """Get all invoices"""
    try:
        invoices = await conn.fetch('SELECT * FROM invoices ORDER BY created_at DESC')
        return {
            "success": True,
            "data": [dict(invoice) for invoice in invoices]
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        ) 