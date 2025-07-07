from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel
import asyncpg
from database import get_db
from typing import Optional

router = APIRouter()

# Pydantic models
class Customer(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None

class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None

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

@router.post("/")
@router.post("")
async def create_customer(customer: Customer, conn: asyncpg.Connection = Depends(get_db)):
    """Create new customer"""
    try:
        result = await conn.fetchrow('''
            INSERT INTO customers (name, email, phone, address)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        ''', customer.name, customer.email, customer.phone, customer.address)
        
        return {
            "success": True,
            "data": dict(result),
            "message": "Customer created successfully"
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.get("/{customer_id}")
async def get_customer(customer_id: int, conn: asyncpg.Connection = Depends(get_db)):
    """Get specific customer"""
    try:
        customer = await conn.fetchrow('SELECT * FROM customers WHERE id = $1', customer_id)
        if not customer:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Customer not found"
            )
        return {
            "success": True,
            "data": dict(customer)
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.put("/{customer_id}")
async def update_customer(customer_id: int, customer: CustomerUpdate, conn: asyncpg.Connection = Depends(get_db)):
    """Update customer"""
    try:
        # Build dynamic update query
        update_fields = []
        values = []
        param_count = 1
        
        if customer.name is not None:
            update_fields.append(f"name = ${param_count}")
            values.append(customer.name)
            param_count += 1
        
        if customer.email is not None:
            update_fields.append(f"email = ${param_count}")
            values.append(customer.email)
            param_count += 1
        
        if customer.phone is not None:
            update_fields.append(f"phone = ${param_count}")
            values.append(customer.phone)
            param_count += 1
        
        if customer.address is not None:
            update_fields.append(f"address = ${param_count}")
            values.append(customer.address)
            param_count += 1
        
        if not update_fields:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No fields to update"
            )
        
        update_fields.append(f"updated_at = CURRENT_TIMESTAMP")
        values.append(customer_id)
        
        query = f'''
            UPDATE customers 
            SET {', '.join(update_fields)}
            WHERE id = ${param_count}
            RETURNING *
        '''
        
        result = await conn.fetchrow(query, *values)
        
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Customer not found"
            )
        
        return {
            "success": True,
            "data": dict(result),
            "message": "Customer updated successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.delete("/{customer_id}")
async def delete_customer(customer_id: int, conn: asyncpg.Connection = Depends(get_db)):
    """Delete customer"""
    try:
        result = await conn.execute('DELETE FROM customers WHERE id = $1', customer_id)
        
        if result == "DELETE 0":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Customer not found"
            )
        
        return {
            "success": True,
            "message": "Customer deleted successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        ) 