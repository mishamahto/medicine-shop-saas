#!/usr/bin/env python3
"""
Test script to verify database connection and table creation using .env credentials
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

async def test_database_connection():
    """Test database connection and table creation"""
    
    # Get database configuration from .env
    db_host = os.getenv('DB_HOST', 'localhost')
    db_port = int(os.getenv('DB_PORT', '5432'))
    db_name = os.getenv('DB_NAME', 'medicine_shop')
    db_user = os.getenv('DB_USER', 'postgres')
    db_password = os.getenv('DB_PASSWORD', 'postgres')
    
    logger.info(f"Testing connection to: {db_host}:{db_port}/{db_name}")
    logger.info(f"User: {db_user}")
    
    try:
        # Create connection
        conn = await asyncpg.connect(
            host=db_host,
            port=db_port,
            database=db_name,
            user=db_user,
            password=db_password
        )
        
        logger.info("✅ Database connection successful!")
        
        # Test query
        result = await conn.fetchval('SELECT 1')
        logger.info(f"✅ Test query result: {result}")
        
        # List existing tables
        tables = await conn.fetch("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name
        """)
        
        logger.info("📊 Existing tables:")
        for table in tables:
            logger.info(f"  - {table['table_name']}")
        
        # Close connection
        await conn.close()
        logger.info("✅ Database connection closed")
        
    except Exception as e:
        logger.error(f"❌ Database connection failed: {e}")
        raise e

if __name__ == "__main__":
    asyncio.run(test_database_connection()) 