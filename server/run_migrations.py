import os
import asyncio
import asyncpg
import logging
from pathlib import Path

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def run_migrations():
    """Run all migration scripts in order"""
    # Database configuration
    db_host = os.getenv('DB_HOST', 'localhost')
    db_port = int(os.getenv('DB_PORT', '5432'))
    db_name = os.getenv('DB_NAME', 'medicine_shop')
    db_user = os.getenv('DB_USER', 'postgres')
    db_password = os.getenv('DB_PASSWORD', '')

    logger.info(f"Connecting to database: {db_host}:{db_port}/{db_name}")

    try:
        # Create connection
        conn = await asyncpg.connect(
            host=db_host,
            port=db_port,
            database=db_name,
            user=db_user,
            password=db_password
        )

        # Create migrations table if it doesn't exist
        await conn.execute('''
            CREATE TABLE IF NOT EXISTS migrations (
                id SERIAL PRIMARY KEY,
                filename VARCHAR(255) NOT NULL UNIQUE,
                applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        # Get list of applied migrations
        applied_migrations = await conn.fetch('SELECT filename FROM migrations')
        applied_filenames = {row['filename'] for row in applied_migrations}

        # Get all migration files
        migrations_dir = Path(__file__).parent / 'migrations'
        migration_files = sorted([f for f in migrations_dir.glob('*.sql')])

        # Run each migration that hasn't been applied
        for migration_file in migration_files:
            filename = migration_file.name
            if filename not in applied_filenames:
                logger.info(f"Applying migration: {filename}")
                
                # Read and execute migration
                sql = migration_file.read_text()
                async with conn.transaction():
                    await conn.execute(sql)
                    await conn.execute(
                        'INSERT INTO migrations (filename) VALUES ($1)',
                        filename
                    )
                logger.info(f"✅ Successfully applied migration: {filename}")
            else:
                logger.info(f"Skipping already applied migration: {filename}")

        await conn.close()
        logger.info("✅ All migrations completed successfully")

    except Exception as e:
        logger.error(f"❌ Migration failed: {str(e)}")
        raise

if __name__ == '__main__':
    asyncio.run(run_migrations()) 