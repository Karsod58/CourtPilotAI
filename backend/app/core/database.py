"""
Database connection and session management
"""
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from typing import AsyncGenerator
from loguru import logger

from app.core.config import settings

# Try to import motor, but make it optional
try:
    from motor.motor_asyncio import AsyncIOMotorClient
    MONGODB_AVAILABLE = True
except ImportError:
    logger.warning("MongoDB (motor) not available - MongoDB features will be disabled")
    MONGODB_AVAILABLE = False
    AsyncIOMotorClient = None

# PostgreSQL/SQLite/MySQL Setup
ASYNC_DATABASE_URL = settings.DATABASE_URL

# Debug: Print the database URL (without password)
import re
safe_url = re.sub(r'://([^:]+):([^@]+)@', r'://\1:****@', ASYNC_DATABASE_URL)
logger.info(f"Database URL: {safe_url}")

# Ensure URL has correct driver
if ASYNC_DATABASE_URL.startswith("mysql://"):
    ASYNC_DATABASE_URL = ASYNC_DATABASE_URL.replace("mysql://", "mysql+aiomysql://", 1)
    logger.info("Converted mysql:// to mysql+aiomysql://")
elif ASYNC_DATABASE_URL.startswith("postgres://"):
    ASYNC_DATABASE_URL = ASYNC_DATABASE_URL.replace("postgres://", "postgresql+asyncpg://", 1)
    logger.info("Converted postgres:// to postgresql+asyncpg://")

engine = create_async_engine(
    ASYNC_DATABASE_URL,
    echo=settings.DEBUG,
    future=True,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
    connect_args={"check_same_thread": False} if "sqlite" in ASYNC_DATABASE_URL else {}
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

Base = declarative_base()


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency for getting async database sessions"""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


# MongoDB Setup
class MongoDB:
    client: AsyncIOMotorClient = None
    db = None


mongodb = MongoDB()


async def get_mongodb():
    """Dependency for getting MongoDB database"""
    return mongodb.db


async def connect_to_mongo():
    """Connect to MongoDB"""
    if not MONGODB_AVAILABLE:
        logger.warning("MongoDB not available - skipping MongoDB connection")
        return
    
    try:
        mongodb.client = AsyncIOMotorClient(settings.MONGODB_URL)
        mongodb.db = mongodb.client[settings.MONGODB_DB]
        logger.info("Connected to MongoDB")
    except Exception as e:
        logger.error(f"Failed to connect to MongoDB: {e}")
        # Don't raise - make MongoDB optional


async def close_mongo_connection():
    """Close MongoDB connection"""
    if mongodb.client:
        mongodb.client.close()
        logger.info("Closed MongoDB connection")


async def init_db():
    """Initialize all database connections"""
    try:
        # Test MySQL/SQLite connection
        async with engine.begin() as conn:
            # Create tables if they don't exist
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Connected to MySQL database")
        
        # Connect to MongoDB
        await connect_to_mongo()
        
        logger.info("All database connections initialized")
    except Exception as e:
        logger.error(f"Failed to initialize databases: {e}")
        raise
