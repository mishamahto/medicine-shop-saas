from fastapi import APIRouter, HTTPException, Depends, status
import asyncpg
from database import get_db

router = APIRouter()

@router.get("/")
@router.get("")
async def get_dashboard_stats(conn: asyncpg.Connection = Depends(get_db)):
    """Get dashboard statistics"""
    try:
        # Get basic stats
        total_inventory = await conn.fetchval('SELECT COUNT(*) FROM inventory')
        total_customers = await conn.fetchval('SELECT COUNT(*) FROM customers')
        total_invoices = await conn.fetchval('SELECT COUNT(*) FROM invoices')
        total_bills = await conn.fetchval('SELECT COUNT(*) FROM bills')
        
        return {
            "success": True,
            "data": {
                "total_inventory": total_inventory,
                "total_customers": total_customers,
                "total_invoices": total_invoices,
                "total_bills": total_bills
            }
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        ) 