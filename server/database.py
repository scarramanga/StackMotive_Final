from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.ext.declarative import declarative_base
import asyncpg
import os
from contextlib import asynccontextmanager

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://stackmotive:stackmotive@localhost:5432/stackmotive"
)

engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False
)

Base = declarative_base()

_db_pool = None

async def init_db_pool():
    global _db_pool
    db_url = os.getenv("DATABASE_URL", "postgresql://stackmotive:stackmotive@localhost:5432/stackmotive")
    if db_url.startswith("postgresql+asyncpg://"):
        db_url = db_url.replace("postgresql+asyncpg://", "postgresql://")
    
    _db_pool = await asyncpg.create_pool(
        db_url,
        min_size=5,
        max_size=20,
        command_timeout=60
    )

async def close_db_pool():
    global _db_pool
    if _db_pool:
        await _db_pool.close()

async def get_db_pool():
    return _db_pool

async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()

@asynccontextmanager
async def get_db_connection():
    pool = await get_db_pool()
    if pool is None:
        raise RuntimeError("Database pool not initialized. Call init_db_pool() first.")
    async with pool.acquire() as conn:
        yield conn
