from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel, validator
from typing import Optional, List, Dict, Any
import json
from datetime import datetime, timedelta
import psycopg2
from psycopg2.extras import RealDictCursor
import os
from decimal import Decimal

router = APIRouter()

# Block 47: Asset Snapshot Store - API Routes
# Time-based portfolio snapshots for metrics and analytics

class AssetSnapshot(BaseModel):
    symbol: str
    asset_name: Optional[str] = None
    asset_class: Optional[str] = None
    sector: Optional[str] = None
    market: str = "NZX"
    quantity: float
    price_per_unit: float
    market_value: Optional[float] = None
    cost_basis: Optional[float] = None
    target_allocation_percent: Optional[float] = 0
    actual_allocation_percent: Optional[float] = 0
    snapshot_type: str = "manual"
    metadata: Optional[Dict[str, Any]] = {}

class PortfolioSnapshot(BaseModel):
    total_market_value: float
    total_positions: int
    portfolio_day_change_percent: Optional[float] = 0
    portfolio_week_change_percent: Optional[float] = 0
    portfolio_month_change_percent: Optional[float] = 0
    diversification_score: Optional[float] = 0
    concentration_risk: Optional[float] = 0
    asset_class_breakdown: Optional[Dict[str, float]] = {}
    snapshot_type: str = "manual"
    metadata: Optional[Dict[str, Any]] = {}

class SnapshotRetentionPolicy(BaseModel):
    snapshot_type: str
    retention_days: int = 365
    max_snapshots: Optional[int] = 1000
    auto_cleanup: bool = True
    compression_enabled: bool = True

# Database connection
def get_db_connection():
    database_url = os.getenv("DATABASE_URL", "postgresql://postgres:password@localhost:5432/stackmotive")
    return psycopg2.connect(database_url)

# Agent Memory logging
async def log_to_agent_memory(user_id: int, action_type: str, action_summary: str, input_data: str, output_data: str, metadata: Dict[str, Any]):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO AgentMemory 
            (userId, blockId, action, context, userInput, agentResponse, metadata, timestamp, sessionId)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            user_id,
            "block_47",
            action_type,
            action_summary,
            input_data,
            output_data,
            json.dumps(metadata) if metadata else None,
            datetime.now().isoformat(),
            f"session_{user_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        ))
        
        conn.commit()
        conn.close()
        
    except Exception as e:
        print(f"Failed to log to agent memory: {e}")

@router.post("/snapshots/asset/{user_id}")
async def create_asset_snapshot(user_id: int, snapshot: AssetSnapshot):
    """Create a new asset snapshot"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Create asset snapshots table if it doesn't exist
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS AssetSnapshots (
                id SERIAL PRIMARY KEY,
                userId INTEGER NOT NULL,
                symbol TEXT NOT NULL,
                asset_name TEXT,
                asset_class TEXT,
                sector TEXT,
                market TEXT DEFAULT 'NZX',
                quantity REAL NOT NULL,
                price_per_unit REAL NOT NULL,
                market_value REAL NOT NULL,
                cost_basis REAL DEFAULT 0,
                target_allocation_percent REAL DEFAULT 0,
                actual_allocation_percent REAL DEFAULT 0,
                snapshot_type TEXT NOT NULL DEFAULT 'manual',
                snapshot_timestamp TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                metadata TEXT DEFAULT '{}',
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Calculate market value if not provided
        market_value = snapshot.market_value or (snapshot.quantity * snapshot.price_per_unit)
        
        cursor.execute("""
            INSERT INTO AssetSnapshots 
            (userId, symbol, asset_name, asset_class, sector, market, quantity, 
             price_per_unit, market_value, cost_basis, target_allocation_percent, 
             actual_allocation_percent, snapshot_type, metadata)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            user_id,
            snapshot.symbol,
            snapshot.asset_name,
            snapshot.asset_class,
            snapshot.sector,
            snapshot.market,
            snapshot.quantity,
            snapshot.price_per_unit,
            market_value,
            snapshot.cost_basis or 0,
            snapshot.target_allocation_percent or 0,
            snapshot.actual_allocation_percent or 0,
            snapshot.snapshot_type,
            json.dumps(snapshot.metadata or {})
        ))
        
        snapshot_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        await log_to_agent_memory(
            user_id,
            "asset_snapshot_created",
            f"Created asset snapshot for {snapshot.symbol}",
            snapshot.json(),
            f"Snapshot created with ID {snapshot_id}",
            {
                "snapshot_id": snapshot_id,
                "symbol": snapshot.symbol,
                "market_value": market_value,
                "snapshot_type": snapshot.snapshot_type
            }
        )
        
        return {
            "success": True,
            "snapshot_id": snapshot_id,
            "message": f"Asset snapshot created for {snapshot.symbol}",
            "market_value": market_value
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/snapshots/asset/{user_id}")
async def get_asset_snapshots(
    user_id: int,
    symbol: Optional[str] = Query(None),
    snapshot_type: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    limit: int = Query(100, le=1000)
):
    """Get asset snapshots with optional filtering"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Build query with filters
        query = "SELECT * FROM AssetSnapshots WHERE userId = %s"
        params = [user_id]
        
        if symbol:
            query += " AND symbol = %s"
            params.append(symbol)
        
        if snapshot_type:
            query += " AND snapshot_type = %s"
            params.append(snapshot_type)
        
        if start_date:
            query += " AND snapshot_timestamp >= %s"
            params.append(start_date)
        
        if end_date:
            query += " AND snapshot_timestamp <= %s"
            params.append(end_date)
        
        query += " ORDER BY snapshot_timestamp DESC LIMIT %s"
        params.append(limit)
        
        cursor.execute(query, params)
        
        columns = [description[0] for description in cursor.description]
        snapshots = []
        
        for row in cursor.fetchall():
            snapshot_data = dict(zip(columns, row))
            # Parse metadata JSON
            try:
                snapshot_data['metadata'] = json.loads(snapshot_data['metadata'] or '{}')
            except:
                snapshot_data['metadata'] = {}
            snapshots.append(snapshot_data)
        
        conn.close()
        
        await log_to_agent_memory(
            user_id,
            "asset_snapshots_retrieved",
            f"Retrieved {len(snapshots)} asset snapshots",
            json.dumps({"symbol": symbol, "type": snapshot_type, "limit": limit}),
            f"Found {len(snapshots)} snapshots",
            {"count": len(snapshots), "symbol": symbol, "snapshot_type": snapshot_type}
        )
        
        return {
            "snapshots": snapshots,
            "count": len(snapshots),
            "user_id": user_id,
            "filters": {
                "symbol": symbol,
                "snapshot_type": snapshot_type,
                "start_date": start_date,
                "end_date": end_date
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/snapshots/portfolio/{user_id}")
async def create_portfolio_snapshot(user_id: int, snapshot: PortfolioSnapshot):
    """Create a portfolio-level snapshot"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Create portfolio snapshots table if it doesn't exist
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS PortfolioSnapshots (
                id SERIAL PRIMARY KEY,
                userId INTEGER NOT NULL,
                total_market_value REAL NOT NULL,
                total_positions INTEGER NOT NULL,
                portfolio_day_change_percent REAL DEFAULT 0,
                portfolio_week_change_percent REAL DEFAULT 0,
                portfolio_month_change_percent REAL DEFAULT 0,
                diversification_score REAL DEFAULT 0,
                concentration_risk REAL DEFAULT 0,
                asset_class_breakdown TEXT DEFAULT '{}',
                snapshot_type TEXT NOT NULL DEFAULT 'manual',
                snapshot_timestamp TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                metadata TEXT DEFAULT '{}',
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        cursor.execute("""
            INSERT INTO PortfolioSnapshots 
            (userId, total_market_value, total_positions, portfolio_day_change_percent,
             portfolio_week_change_percent, portfolio_month_change_percent, 
             diversification_score, concentration_risk, asset_class_breakdown, 
             snapshot_type, metadata)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            user_id,
            snapshot.total_market_value,
            snapshot.total_positions,
            snapshot.portfolio_day_change_percent or 0,
            snapshot.portfolio_week_change_percent or 0,
            snapshot.portfolio_month_change_percent or 0,
            snapshot.diversification_score or 0,
            snapshot.concentration_risk or 0,
            json.dumps(snapshot.asset_class_breakdown or {}),
            snapshot.snapshot_type,
            json.dumps(snapshot.metadata or {})
        ))
        
        snapshot_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        await log_to_agent_memory(
            user_id,
            "portfolio_snapshot_created",
            f"Created portfolio snapshot",
            snapshot.json(),
            f"Portfolio snapshot created with ID {snapshot_id}",
            {
                "snapshot_id": snapshot_id,
                "total_value": snapshot.total_market_value,
                "positions": snapshot.total_positions,
                "snapshot_type": snapshot.snapshot_type
            }
        )
        
        return {
            "success": True,
            "snapshot_id": snapshot_id,
            "message": "Portfolio snapshot created successfully",
            "total_value": snapshot.total_market_value,
            "positions": snapshot.total_positions
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/snapshots/portfolio/{user_id}")
async def get_portfolio_snapshots(
    user_id: int,
    snapshot_type: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    limit: int = Query(50, le=500)
):
    """Get portfolio snapshots with optional filtering"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Build query with filters
        query = "SELECT * FROM PortfolioSnapshots WHERE userId = %s"
        params = [user_id]
        
        if snapshot_type:
            query += " AND snapshot_type = %s"
            params.append(snapshot_type)
        
        if start_date:
            query += " AND snapshot_timestamp >= %s"
            params.append(start_date)
        
        if end_date:
            query += " AND snapshot_timestamp <= %s"
            params.append(end_date)
        
        query += " ORDER BY snapshot_timestamp DESC LIMIT %s"
        params.append(limit)
        
        cursor.execute(query, params)
        
        columns = [description[0] for description in cursor.description]
        snapshots = []
        
        for row in cursor.fetchall():
            snapshot_data = dict(zip(columns, row))
            # Parse JSON fields
            try:
                snapshot_data['asset_class_breakdown'] = json.loads(snapshot_data['asset_class_breakdown'] or '{}')
                snapshot_data['metadata'] = json.loads(snapshot_data['metadata'] or '{}')
            except:
                snapshot_data['asset_class_breakdown'] = {}
                snapshot_data['metadata'] = {}
            snapshots.append(snapshot_data)
        
        conn.close()
        
        return {
            "snapshots": snapshots,
            "count": len(snapshots),
            "user_id": user_id
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/snapshots/analytics/{user_id}")
async def get_snapshot_analytics(
    user_id: int,
    period: str = Query("30d", regex="^(7d|30d|90d|1y)$"),
    symbol: Optional[str] = Query(None)
):
    """Get analytics from snapshot data"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Calculate period start date
        period_map = {
            "7d": 7,
            "30d": 30,
            "90d": 90,
            "1y": 365
        }
        
        days = period_map.get(period, 30)
        start_date = (datetime.now() - timedelta(days=days)).isoformat()
        
        if symbol:
            # Asset-specific analytics
            cursor.execute("""
                SELECT 
                    symbol,
                    COUNT(*) as snapshot_count,
                    AVG(market_value) as avg_value,
                    MIN(market_value) as min_value,
                    MAX(market_value) as max_value,
                    AVG(quantity) as avg_quantity,
                    MIN(snapshot_timestamp) as first_snapshot,
                    MAX(snapshot_timestamp) as last_snapshot
                FROM AssetSnapshots 
                WHERE userId = %s AND symbol = %s AND snapshot_timestamp >= %s
                GROUP BY symbol
            """, (user_id, symbol, start_date))
        else:
            # Portfolio-wide analytics
            cursor.execute("""
                SELECT 
                    COUNT(DISTINCT symbol) as unique_assets,
                    COUNT(*) as total_snapshots,
                    AVG(market_value) as avg_asset_value,
                    SUM(market_value) as total_portfolio_value,
                    MIN(snapshot_timestamp) as first_snapshot,
                    MAX(snapshot_timestamp) as last_snapshot
                FROM AssetSnapshots 
                WHERE userId = %s AND snapshot_timestamp >= %s
            """, (user_id, start_date))
        
        result = cursor.fetchone()
        columns = [description[0] for description in cursor.description]
        analytics = dict(zip(columns, result)) if result else {}
        
        # Get asset class breakdown
        cursor.execute("""
            SELECT 
                asset_class,
                COUNT(*) as count,
                SUM(market_value) as total_value,
                AVG(market_value) as avg_value
            FROM AssetSnapshots 
            WHERE userId = %s AND snapshot_timestamp >= %s
            GROUP BY asset_class
            ORDER BY total_value DESC
        """, (user_id, start_date))
        
        asset_classes = []
        for row in cursor.fetchall():
            asset_classes.append({
                "asset_class": row[0] or "Unknown",
                "count": row[1],
                "total_value": row[2],
                "avg_value": row[3]
            })
        
        conn.close()
        
        await log_to_agent_memory(
            user_id,
            "snapshot_analytics_retrieved",
            f"Retrieved snapshot analytics for {period}",
            json.dumps({"period": period, "symbol": symbol}),
            f"Analytics generated for {period} period",
            {"period": period, "symbol": symbol, "analytics_keys": list(analytics.keys())}
        )
        
        return {
            "analytics": analytics,
            "asset_class_breakdown": asset_classes,
            "period": period,
            "symbol": symbol,
            "user_id": user_id
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/snapshots/{user_id}")
async def cleanup_snapshots(
    user_id: int,
    snapshot_type: Optional[str] = Query(None),
    older_than_days: int = Query(90, ge=1, le=3650)
):
    """Clean up old snapshots based on retention policy"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cutoff_date = (datetime.now() - timedelta(days=older_than_days)).isoformat()
        
        # Build cleanup query
        asset_query = "DELETE FROM AssetSnapshots WHERE userId = %s AND snapshot_timestamp < %s"
        portfolio_query = "DELETE FROM PortfolioSnapshots WHERE userId = %s AND snapshot_timestamp < %s"
        params = [user_id, cutoff_date]
        
        if snapshot_type:
            asset_query += " AND snapshot_type = %s"
            portfolio_query += " AND snapshot_type = %s"
            params.append(snapshot_type)
        
        # Execute cleanup
        cursor.execute(asset_query, params)
        asset_deleted = cursor.rowcount
        
        cursor.execute(portfolio_query, params)
        portfolio_deleted = cursor.rowcount
        
        conn.commit()
        conn.close()
        
        await log_to_agent_memory(
            user_id,
            "snapshots_cleaned",
            f"Cleaned up old snapshots older than {older_than_days} days",
            json.dumps({"older_than_days": older_than_days, "snapshot_type": snapshot_type}),
            f"Deleted {asset_deleted + portfolio_deleted} snapshots",
            {
                "asset_deleted": asset_deleted,
                "portfolio_deleted": portfolio_deleted,
                "total_deleted": asset_deleted + portfolio_deleted,
                "older_than_days": older_than_days
            }
        )
        
        return {
            "success": True,
            "asset_snapshots_deleted": asset_deleted,
            "portfolio_snapshots_deleted": portfolio_deleted,
            "total_deleted": asset_deleted + portfolio_deleted,
            "cutoff_date": cutoff_date
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))          