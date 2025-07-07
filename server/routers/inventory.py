from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel
import asyncpg
from database import get_db
from typing import Optional

router = APIRouter()

# Pydantic models
class InventoryItem(BaseModel):
    name: str
    description: Optional[str] = None
    quantity: int = 0
    unit_price: float
    cost_price: Optional[float] = 0.0
    category_id: Optional[int] = None
    expiry_date: Optional[str] = None
    reorder_level: int = 10
    manufacturer: Optional[str] = None
    batch_number: Optional[str] = None

class InventoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    quantity: Optional[int] = None
    unit_price: Optional[float] = None
    cost_price: Optional[float] = None
    category_id: Optional[int] = None
    expiry_date: Optional[str] = None
    reorder_level: Optional[int] = None
    manufacturer: Optional[str] = None
    batch_number: Optional[str] = None

@router.get("/")
@router.get("")
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

@router.post("/")
@router.post("")
async def create_inventory_item(item: InventoryItem, conn: asyncpg.Connection = Depends(get_db)):
    """Create new inventory item"""
    try:
        print("[DEBUG] Incoming item:", item)
        
        # Convert empty strings to None for optional fields
        description = item.description if item.description else None
        category_id = item.category_id if item.category_id else None
        manufacturer = item.manufacturer if item.manufacturer else None
        batch_number = item.batch_number if item.batch_number else None
        
        # Convert date string to date object
        expiry_date = None
        if item.expiry_date:
            from datetime import datetime
            try:
                expiry_date = datetime.strptime(item.expiry_date, '%Y-%m-%d').date()
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid date format. Use YYYY-MM-DD"
                )
        
        result = await conn.fetchrow('''
            INSERT INTO inventory (name, description, quantity, unit_price, cost_price, category_id, expiry_date, reorder_level, manufacturer, batch_number)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *
        ''', item.name, description, item.quantity, item.unit_price, item.cost_price, category_id, expiry_date, item.reorder_level, manufacturer, batch_number)
        
        return {
            "success": True,
            "data": dict(result),
            "message": "Inventory item created successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        print("[ERROR] Exception in create_inventory_item:", str(e))
        import traceback
        print("[ERROR] Full traceback:", traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
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

@router.put("/{item_id}")
async def update_inventory_item(item_id: int, item: InventoryUpdate, conn: asyncpg.Connection = Depends(get_db)):
    """Update inventory item"""
    try:
        # Build dynamic update query
        update_fields = []
        values = []
        param_count = 1
        
        if item.name is not None:
            update_fields.append(f"name = ${param_count}")
            values.append(item.name)
            param_count += 1
        
        if item.description is not None:
            update_fields.append(f"description = ${param_count}")
            values.append(item.description)
            param_count += 1
        
        if item.quantity is not None:
            update_fields.append(f"quantity = ${param_count}")
            values.append(item.quantity)
            param_count += 1
        
        if item.unit_price is not None:
            update_fields.append(f"unit_price = ${param_count}")
            values.append(item.unit_price)
            param_count += 1
        
        if item.cost_price is not None:
            update_fields.append(f"cost_price = ${param_count}")
            values.append(item.cost_price)
            param_count += 1
        
        if item.category_id is not None:
            update_fields.append(f"category_id = ${param_count}")
            values.append(item.category_id)
            param_count += 1
        
        if item.expiry_date is not None:
            # Convert date string to date object
            from datetime import datetime
            try:
                expiry_date = datetime.strptime(item.expiry_date, '%Y-%m-%d').date()
                update_fields.append(f"expiry_date = ${param_count}")
                values.append(expiry_date)
                param_count += 1
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid date format. Use YYYY-MM-DD"
                )
        
        if item.reorder_level is not None:
            update_fields.append(f"reorder_level = ${param_count}")
            values.append(item.reorder_level)
            param_count += 1
        
        if item.manufacturer is not None:
            update_fields.append(f"manufacturer = ${param_count}")
            values.append(item.manufacturer)
            param_count += 1
        
        if item.batch_number is not None:
            update_fields.append(f"batch_number = ${param_count}")
            values.append(item.batch_number)
            param_count += 1
        
        if not update_fields:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No fields to update"
            )
        
        update_fields.append(f"updated_at = CURRENT_TIMESTAMP")
        values.append(item_id)
        
        query = f'''
            UPDATE inventory 
            SET {', '.join(update_fields)}
            WHERE id = ${param_count}
            RETURNING *
        '''
        
        result = await conn.fetchrow(query, *values)
        
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Item not found"
            )
        
        return {
            "success": True,
            "data": dict(result),
            "message": "Inventory item updated successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        print("[ERROR] Exception in update_inventory_item:", str(e))
        import traceback
        print("[ERROR] Full traceback:", traceback.format_exc())
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )

@router.delete("/{item_id}")
async def delete_inventory_item(item_id: int, conn: asyncpg.Connection = Depends(get_db)):
    """Delete inventory item"""
    try:
        result = await conn.execute('DELETE FROM inventory WHERE id = $1', item_id)
        
        if result == "DELETE 0":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Item not found"
            )
        
        return {
            "success": True,
            "message": "Inventory item deleted successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.patch("/{item_id}/stock")
async def update_stock(item_id: int, data: dict, conn: asyncpg.Connection = Depends(get_db)):
    """Update inventory stock"""
    try:
        quantity = data.get('quantity')
        if quantity is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Quantity is required"
            )
        
        result = await conn.fetchrow('''
            UPDATE inventory 
            SET quantity = $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
            RETURNING *
        ''', quantity, item_id)
        
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Item not found"
            )
        
        return {
            "success": True,
            "data": dict(result),
            "message": "Stock updated successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        ) 

@router.get("/low-stock/items")
async def get_low_stock_items(conn: asyncpg.Connection = Depends(get_db)):
    """Get items that are low on stock (below reorder level)"""
    try:
        items = await conn.fetch('''
            SELECT * FROM inventory 
            WHERE quantity <= reorder_level 
            ORDER BY (quantity::float / reorder_level::float) ASC
        ''')
        return {
            "success": True,
            "data": [dict(item) for item in items]
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.get("/expiring/items")
async def get_expiring_items(days: int = 30, conn: asyncpg.Connection = Depends(get_db)):
    """Get items that are expiring within the specified number of days"""
    try:
        items = await conn.fetch('''
            SELECT * FROM inventory 
            WHERE expiry_date IS NOT NULL 
            AND expiry_date <= CURRENT_DATE + $1
            AND expiry_date >= CURRENT_DATE
            ORDER BY expiry_date ASC
        ''', days)
        return {
            "success": True,
            "data": [dict(item) for item in items]
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        ) 