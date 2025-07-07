#!/usr/bin/env python3
"""
Script to add expiry_date and reorder_level columns to the inventory table
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

async def add_expiry_columns():
    """Add expiry_date and reorder_level columns to inventory table"""
    
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
        
        # Add expiry_date column if it doesn't exist
        try:
            await conn.execute('''
                ALTER TABLE inventory 
                ADD COLUMN IF NOT EXISTS expiry_date DATE
            ''')
            logger.info("✅ Added expiry_date column")
        except Exception as e:
            logger.info(f"expiry_date column already exists or error: {e}")
        
        # Add reorder_level column if it doesn't exist
        try:
            await conn.execute('''
                ALTER TABLE inventory 
                ADD COLUMN IF NOT EXISTS reorder_level INTEGER DEFAULT 10
            ''')
            logger.info("✅ Added reorder_level column")
        except Exception as e:
            logger.info(f"reorder_level column already exists or error: {e}")
        
        # Update existing records to have default reorder_level
        await conn.execute('''
            UPDATE inventory 
            SET reorder_level = 10 
            WHERE reorder_level IS NULL
        ''')
        logger.info("✅ Updated existing records with default reorder_level")
        
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
    asyncio.run(add_expiry_columns()) 