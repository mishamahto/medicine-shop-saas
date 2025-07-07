#!/usr/bin/env python3
"""
Script to check if admin user exists in the database
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

async def check_admin_user():
    """Check if admin user exists"""
    
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
        
        # Check admin user
        admin_user = await conn.fetchrow(
            'SELECT id, username, email, role, created_at FROM users WHERE username = $1',
            'admin'
        )
        
        if admin_user:
            logger.info("✅ Admin user found:")
            logger.info(f"  - ID: {admin_user['id']}")
            logger.info(f"  - Username: {admin_user['username']}")
            logger.info(f"  - Email: {admin_user['email']}")
            logger.info(f"  - Role: {admin_user['role']}")
            logger.info(f"  - Created: {admin_user['created_at']}")
            logger.info("🔐 Login credentials: admin / admin123")
        else:
            logger.warning("⚠️ Admin user not found!")
        
        # List all users
        users = await conn.fetch('SELECT id, username, email, role FROM users ORDER BY id')
        logger.info(f"📊 Total users in database: {len(users)}")
        
        # Close connection
        await conn.close()
        
    except Exception as e:
        logger.error(f"❌ Error: {e}")
        raise e

if __name__ == "__main__":
    asyncio.run(check_admin_user()) 