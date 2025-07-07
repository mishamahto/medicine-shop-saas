import asyncio
import asyncpg
import os
from database import get_db_pool, init_db

async def run_migrations():
    """Run all migration files"""
    try:
        # Initialize database connection
        await init_db()
        pool = await get_db_pool()
        
        async with pool.acquire() as conn:
            # Run customer fields migration
            with open('migrations/add_invoice_customer_fields.sql', 'r') as f:
                customer_migration = f.read()
                await conn.execute(customer_migration)
                print("✅ Added customer fields to invoices table")
            
            # Run invoice items fields migration
            with open('migrations/add_invoice_item_fields.sql', 'r') as f:
                items_migration = f.read()
                await conn.execute(items_migration)
                print("✅ Added fields to invoice_items table")

            # Run invoice date field migration
            with open('migrations/add_invoice_date_field.sql', 'r') as f:
                date_migration = f.read()
                await conn.execute(date_migration)
                print("✅ Added invoice_date field to invoices table")

            # Run invoice additional fields migration
            with open('migrations/add_invoice_fields.sql', 'r') as f:
                fields_migration = f.read()
                await conn.execute(fields_migration)
                print("✅ Added payment_method, status, and notes fields to invoices table")

    except Exception as e:
        print(f"❌ Error running migrations: {str(e)}")
        raise e
    finally:
        await pool.close()

if __name__ == "__main__":
    asyncio.run(run_migrations()) 