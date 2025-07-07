#!/usr/bin/env python3
"""
Script to add cost_price, manufacturer, and batch_number columns to the inventory table
"""

import asyncio
import os
from dotenv import load_dotenv
import asyncpg
import logging

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def add_inventory_fields():
    """Add cost_price, manufacturer, and batch_number columns to inventory table"""
    
    # Get database configuration from .env
    db_host = os.getenv('DB_HOST', 'localhost')
    db_port = int(os.getenv('DB_PORT', '5432'))
    db_name = os.getenv('DB_NAME', 'medicine_shop')
    db_user = os.getenv('DB_USER', 'postgres')
    db_password = os.getenv('DB_PASSWORD', 'postgres')
    
    try:
        # Create connection
        conn = await asyncpg.connect(
            host=db_host,
            port=db_port,
            database=db_name,
            user=db_user,
            password=db_password
        )
        
        # Add cost_price column if it doesn't exist
        try:
            await conn.execute('''
                ALTER TABLE inventory 
                ADD COLUMN IF NOT EXISTS cost_price DECIMAL(10,2) DEFAULT 0.00
            ''')
            logger.info("✅ Added cost_price column")
        except Exception as e:
            logger.info(f"cost_price column already exists or error: {e}")
        
        # Add manufacturer column if it doesn't exist
        try:
            await conn.execute('''
                ALTER TABLE inventory 
                ADD COLUMN IF NOT EXISTS manufacturer VARCHAR(255)
            ''')
            logger.info("✅ Added manufacturer column")
        except Exception as e:
            logger.info(f"manufacturer column already exists or error: {e}")
        
        # Add batch_number column if it doesn't exist
        try:
            await conn.execute('''
                ALTER TABLE inventory 
                ADD COLUMN IF NOT EXISTS batch_number VARCHAR(100)
            ''')
            logger.info("✅ Added batch_number column")
        except Exception as e:
            logger.info(f"batch_number column already exists or error: {e}")
        
        # Show current table structure
        columns = await conn.fetch('''
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns 
            WHERE table_name = 'inventory' 
            ORDER BY ordinal_position
        ''')
        
        logger.info("📊 Current inventory table structure:")
        for col in columns:
            logger.info(f"  - {col['column_name']}: {col['data_type']} (nullable: {col['is_nullable']}, default: {col['column_default']})")
        
        # Close connection
        await conn.close()
        logger.info("✅ Migration completed successfully")
        
    except Exception as e:
        logger.error(f"❌ Migration failed: {e}")
        raise e

if __name__ == "__main__":
    asyncio.run(add_inventory_fields()) 