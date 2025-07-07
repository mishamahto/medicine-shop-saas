from fastapi import APIRouter, HTTPException, Depends, status
import asyncpg
from database import get_db
from pydantic import BaseModel, validator
from typing import Optional, List
from datetime import datetime, date
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

class InvoiceItem(BaseModel):
    inventory_id: Optional[int] = None
    item_text: Optional[str] = None
    quantity: int
    unit_price: float
    discount_percentage: Optional[float] = 0
    discount_amount: Optional[float] = 0
    gst_percentage: Optional[float] = 0
    gst_amount: Optional[float] = 0
    total_amount: Optional[float] = None  # Added to match frontend payload

    @validator('quantity')
    def validate_quantity(cls, v):
        if v <= 0:
            raise ValueError('Quantity must be greater than 0')
        return v

    @validator('unit_price')
    def validate_unit_price(cls, v):
        if v < 0:
            raise ValueError('Unit price cannot be negative')
        return v

class CustomerInfo(BaseModel):
    customer_id: Optional[int] = None
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_address: Optional[str] = None
    customer_email: Optional[str] = None

    @validator('customer_id', pre=True)
    def validate_customer_id(cls, v):
        if v == '':
            return None
        try:
            return int(v) if v is not None else None
        except (ValueError, TypeError):
            return None

class Invoice(BaseModel):
    customer: CustomerInfo
    items: List[InvoiceItem]
    invoice_date: Optional[str] = None
    due_date: Optional[str] = None
    payment_method: Optional[str] = None
    notes: Optional[str] = None

    @validator('invoice_date', 'due_date')
    def validate_dates(cls, v):
        if not v:
            return None
        try:
            # Try parsing as date
            datetime.strptime(v, '%Y-%m-%d')
            return v
        except (ValueError, AttributeError) as e:
            raise ValueError(f'Invalid date format. Expected YYYY-MM-DD, got: {v}')

@router.get("/")
@router.get("")
async def get_invoices(conn: asyncpg.Connection = Depends(get_db)):
    """Get all invoices with their items"""
    try:
        # Fetch all invoices
        invoices = await conn.fetch('''
            SELECT 
                i.*,
                c.name as customer_name,
                c.email as customer_email,
                c.phone as customer_phone,
                c.address as customer_address
            FROM invoices i
            LEFT JOIN customers c ON i.customer_id = c.id
            ORDER BY i.created_at DESC
        ''')
        
        # Convert invoices to list of dictionaries
        invoice_list = [dict(invoice) for invoice in invoices]
        
        # Fetch items for each invoice
        for invoice in invoice_list:
            items = await conn.fetch('''
                SELECT 
                    ii.*,
                    inv.name as inventory_name,
                    inv.description as inventory_description
                FROM invoice_items ii
                LEFT JOIN inventory inv ON ii.inventory_id = inv.id
                WHERE ii.invoice_id = $1
            ''', invoice['id'])
            invoice['items'] = [dict(item) for item in items]
        
        return {
            "success": True,
            "data": invoice_list
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        )

@router.post("/")
@router.post("")
async def create_invoice(invoice: Invoice, conn: asyncpg.Connection = Depends(get_db)):
    """Create a new invoice with automatic customer creation if needed"""
    try:
        # Verify invoice_items table exists
        try:
            await conn.fetchval("SELECT COUNT(*) FROM invoice_items LIMIT 1")
            logger.info("invoice_items table exists and is accessible")
        except Exception as e:
            logger.error(f"Error accessing invoice_items table: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error accessing invoice_items table: {str(e)}"
            )

        # Log incoming request
        logger.info(f"Creating invoice with {len(invoice.items)} items")
        logger.info(f"Customer info: {invoice.customer}")
        
        # Start transaction
        async with conn.transaction():
            customer_id = invoice.customer.customer_id

            # If no customer_id is provided but we have customer details, try to find or create the customer
            if not customer_id and invoice.customer.customer_name:
                # First try to find the customer by phone number if provided
                if invoice.customer.customer_phone:
                    existing_customer = await conn.fetchrow(
                        'SELECT id FROM customers WHERE phone = $1',
                        invoice.customer.customer_phone
                    )
                    if existing_customer:
                        customer_id = existing_customer['id']
                        logger.info(f"Found existing customer with ID: {customer_id}")

                # If customer not found, create a new one
                if not customer_id:
                    try:
                        new_customer = await conn.fetchrow('''
                            INSERT INTO customers (name, email, phone, address)
                            VALUES ($1, $2, $3, $4)
                            RETURNING id
                        ''', 
                        invoice.customer.customer_name,
                        invoice.customer.customer_email,
                        invoice.customer.customer_phone,
                        invoice.customer.customer_address
                        )
                        customer_id = new_customer['id']
                        logger.info(f"Created new customer with ID: {customer_id}")
                    except Exception as e:
                        logger.error(f"Error creating customer: {str(e)}")
                        raise HTTPException(
                            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail=f"Error creating customer: {str(e)}"
                        )

            # Calculate total amount
            total_amount = 0
            for item in invoice.items:
                # Calculate amounts if not provided
                if item.discount_percentage and not item.discount_amount:
                    item.discount_amount = (item.quantity * item.unit_price) * (item.discount_percentage / 100)
                
                if item.gst_percentage and not item.gst_amount:
                    subtotal = (item.quantity * item.unit_price) - (item.discount_amount or 0)
                    item.gst_amount = subtotal * (item.gst_percentage / 100)

                # Calculate item total
                item_total = (
                    item.quantity * item.unit_price 
                    - (item.discount_amount or 0) 
                    + (item.gst_amount or 0)
                )
                total_amount += item_total

            # Parse dates
            invoice_date = datetime.strptime(invoice.invoice_date, '%Y-%m-%d') if invoice.invoice_date else datetime.now()
            due_date = datetime.strptime(invoice.due_date, '%Y-%m-%d').date() if invoice.due_date else None
            logger.info(f"Using dates - invoice_date: {invoice_date}, due_date: {due_date}")

            # Insert invoice
            try:
                invoice_query = """
                    INSERT INTO invoices (
                        customer_id, customer_name, customer_phone, customer_address,
                        invoice_date, total_amount, status, payment_method, notes,
                        due_date
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                    RETURNING id
                """
                invoice_id = await conn.fetchval(
                    invoice_query,
                    customer_id,  # Now using the found or created customer_id
                    invoice.customer.customer_name,
                    invoice.customer.customer_phone,
                    invoice.customer.customer_address,
                    invoice_date,
                    total_amount,
                    'pending',  # Default status
                    invoice.payment_method,
                    invoice.notes,
                    due_date  # Now using the properly parsed date
                )
                logger.info(f"Created invoice with ID: {invoice_id}")
            except Exception as e:
                logger.error(f"Error creating invoice record: {str(e)}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Error creating invoice record: {str(e)}"
                )

            # Insert invoice items
            logger.info(f"Starting to insert {len(invoice.items)} items for invoice {invoice_id}")
            for idx, item in enumerate(invoice.items):
                try:
                    # Log the item data before insertion
                    logger.info(f"Attempting to insert item {idx + 1}: {item.dict()}")
                    
                    item_query = """
                        INSERT INTO invoice_items (
                            invoice_id, inventory_id, item_text,
                            quantity, unit_price,
                            discount_percentage, discount_amount,
                            gst_percentage, gst_amount
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                        RETURNING id
                    """
                    
                    # Log the actual values being inserted
                    values = [
                        invoice_id,
                        item.inventory_id,
                        item.item_text,
                        item.quantity,
                        item.unit_price,
                        item.discount_percentage,
                        item.discount_amount,
                        item.gst_percentage,
                        item.gst_amount
                    ]
                    logger.info(f"Item {idx + 1} values: {values}")
                    
                    item_id = await conn.fetchval(
                        item_query,
                        *values
                    )
                    logger.info(f"Successfully created invoice item {idx + 1} with ID: {item_id}")

                    # Verify the item was inserted
                    verification = await conn.fetchrow(
                        "SELECT * FROM invoice_items WHERE id = $1",
                        item_id
                    )
                    if verification:
                        logger.info(f"Verified item {idx + 1} insertion: {dict(verification)}")
                    else:
                        logger.error(f"Item {idx + 1} not found after insertion!")

                    # Update inventory quantity if inventory_id is provided
                    if item.inventory_id:
                        await conn.execute(
                            "UPDATE inventory SET quantity = quantity - $1 WHERE id = $2",
                            item.quantity,
                            item.inventory_id
                        )
                        logger.info(f"Updated inventory quantity for item {item.inventory_id}")
                except Exception as e:
                    logger.error(f"Error inserting invoice item {idx + 1}: {str(e)}")
                    logger.error(f"Failed item data: {item.dict()}")
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail=f"Error inserting invoice item {idx + 1}: {str(e)}"
                    )

            # Verify all items were inserted
            final_count = await conn.fetchval(
                "SELECT COUNT(*) FROM invoice_items WHERE invoice_id = $1",
                invoice_id
            )
            logger.info(f"Final invoice items count: {final_count}")

            return {
                "success": True,
                "message": "Invoice created successfully with " + 
                          ("new customer" if not invoice.customer.customer_id else "existing customer"),
                "data": {
                    "invoice_id": invoice_id,
                    "customer_id": customer_id,
                    "items_count": final_count
                }
            }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating invoice: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal server error: {str(e)}"
        ) 