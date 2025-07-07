import os
import logging
import asyncpg
from typing import Optional, Dict, Any
import asyncio
from contextlib import asynccontextmanager
from google.cloud import secretmanager

logger = logging.getLogger(__name__)

# Database connection pool
pool: Optional[asyncpg.Pool] = None

def get_secret(secret_id: str) -> str:
    """Get secret from Google Cloud Secret Manager"""
    try:
        client = secretmanager.SecretManagerServiceClient()
        name = f"projects/galvanic-vim-464504-n5/secrets/{secret_id}/versions/latest"
        response = client.access_secret_version(request={"name": name})
        return response.payload.data.decode("UTF-8")
    except Exception as e:
        logger.error(f"Failed to get secret {secret_id}: {e}")
        return None

async def get_db_pool() -> asyncpg.Pool:
    """Get the database connection pool"""
    global pool
    if pool is None:
        raise RuntimeError("Database pool not initialized")
    return pool

async def get_db():
    """Dependency to get database connection"""
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        yield conn

async def init_db():
    """Initialize database connection and create tables"""
    global pool
    
    # Database configuration
    db_host = os.getenv('DB_HOST', '/cloudsql/galvanic-vim-464504-n5:us-central1:medicine-shop-db')
    db_port = int(os.getenv('DB_PORT', '5432'))
    db_name = os.getenv('DB_NAME', 'medicine_shop')
    db_user = os.getenv('DB_USER', 'medicine-shop-user')
    
    # Get password from Secret Manager
    db_password = get_secret('db-password')
    if not db_password:
        raise ValueError("Could not retrieve database password from Secret Manager")
    
    logger.info(f"Connecting to database: {db_host}:{db_port}/{db_name}")
    
    try:
        # Create connection pool
        if db_host.startswith('/cloudsql/'):
            # Cloud SQL with Unix domain socket
            socket_path = db_host
            pool = await asyncpg.create_pool(
                user=db_user,
                password=db_password,
                database=db_name,
                host=socket_path,
                port=db_port,
                min_size=1,
                max_size=20,
                command_timeout=60
            )
        else:
            # Standard TCP connection
            pool = await asyncpg.create_pool(
                host=db_host,
                port=db_port,
                database=db_name,
                user=db_user,
                password=db_password,
                min_size=1,
                max_size=20,
                command_timeout=60
            )
        
        # Test connection
        async with pool.acquire() as conn:
            await conn.execute('SELECT 1')
        
        logger.info("✅ Database connection established")
        
        # Create tables
        await create_tables()
        logger.info("✅ Database tables created successfully")
        
        # Create default admin user
        await create_default_admin()
        logger.info("✅ Default admin user created")
        
    except Exception as e:
        logger.error(f"❌ Database initialization failed: {e}")
        raise e

async def create_tables():
    """Create all database tables"""
    pool = await get_db_pool()
    
    async with pool.acquire() as conn:
        # Create users table
        await conn.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(255) UNIQUE NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                role VARCHAR(50) DEFAULT 'admin',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Create categories table
        await conn.execute('''
            CREATE TABLE IF NOT EXISTS categories (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Create inventory table
        await conn.execute('''
            CREATE TABLE IF NOT EXISTS inventory (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                quantity INTEGER NOT NULL DEFAULT 0,
                unit_price DECIMAL(10,2) NOT NULL,
                category_id INTEGER REFERENCES categories(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Create customers table
        await conn.execute('''
            CREATE TABLE IF NOT EXISTS customers (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255),
                phone VARCHAR(20),
                address TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Create invoices table
        await conn.execute('''
            CREATE TABLE IF NOT EXISTS invoices (
                id SERIAL PRIMARY KEY,
                customer_id INTEGER REFERENCES customers(id),
                total_amount DECIMAL(10,2) NOT NULL,
                status VARCHAR(50) DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Create invoice_items table
        await conn.execute('''
            CREATE TABLE IF NOT EXISTS invoice_items (
                id SERIAL PRIMARY KEY,
                invoice_id INTEGER REFERENCES invoices(id),
                item_id INTEGER REFERENCES inventory(id),
                quantity INTEGER NOT NULL,
                unit_price DECIMAL(10,2) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Create purchase_orders table
        await conn.execute('''
            CREATE TABLE IF NOT EXISTS purchase_orders (
                id SERIAL PRIMARY KEY,
                supplier_id INTEGER,
                total_amount DECIMAL(10,2) NOT NULL,
                status VARCHAR(50) DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Create purchase_order_items table
        await conn.execute('''
            CREATE TABLE IF NOT EXISTS purchase_order_items (
                id SERIAL PRIMARY KEY,
                purchase_order_id INTEGER REFERENCES purchase_orders(id),
                item_id INTEGER REFERENCES inventory(id),
                quantity INTEGER NOT NULL,
                unit_price DECIMAL(10,2) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Create bills table
        await conn.execute('''
            CREATE TABLE IF NOT EXISTS bills (
                id SERIAL PRIMARY KEY,
                supplier_id INTEGER,
                amount DECIMAL(10,2) NOT NULL,
                due_date DATE,
                status VARCHAR(50) DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')

async def create_default_admin():
    """Create default admin user if it doesn't exist"""
    import bcrypt
    
    pool = await get_db_pool()
    
    async with pool.acquire() as conn:
        # Check if admin user exists
        admin_user = await conn.fetchrow(
            'SELECT id FROM users WHERE username = $1',
            'admin'
        )
        
        if not admin_user:
            # Create default admin user
            admin_password = os.getenv('ADMIN_PASSWORD', 'admin123')
            hashed_password = bcrypt.hashpw(admin_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            
            await conn.execute('''
                INSERT INTO users (username, email, password, role)
                VALUES ($1, $2, $3, $4)
            ''', 'admin', 'admin@example.com', hashed_password, 'admin')
            
            logger.info("✅ Default admin user created")

async def close_db():
    """Close database connection pool"""
    global pool
    if pool:
        await pool.close()
        logger.info("Database connection pool closed")