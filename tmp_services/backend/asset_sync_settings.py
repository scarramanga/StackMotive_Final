from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import json
from datetime import datetime, timedelta
import psycopg2
from psycopg2.extras import RealDictCursor
import os

router = APIRouter()

# Block 6: Asset Sync Settings
# Panel to manage external sync settings (Sharesies, IBKR, CoinStats, CSV)

class SyncConfig(BaseModel):
    userId: int
    syncSource: str  # "sharesies", "ibkr", "coinstats", "csv"
    enabled: bool
    autoSync: bool
    frequency: str  # "hourly", "daily", "weekly", "manual"
    credentials: Optional[Dict[str, str]] = None  # encrypted credentials
    lastSyncTime: Optional[str] = None
    syncStatus: str = "idle"  # idle, syncing, success, error
    errorMessage: Optional[str] = None

class SyncTrigger(BaseModel):
    userId: int
    syncSource: str
    forceSync: bool = False

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
            "block_6",
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

@router.get("/sync/config/{user_id}")
async def get_sync_configurations(user_id: int):
    """Get all sync configurations for a user"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Create SyncConfig table if it doesn't exist
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS SyncConfig (
                id SERIAL PRIMARY KEY,
                userId INTEGER NOT NULL,
                syncSource TEXT NOT NULL,
                enabled BOOLEAN NOT NULL DEFAULT true,
                autoSync BOOLEAN NOT NULL DEFAULT false,
                frequency TEXT NOT NULL DEFAULT 'manual',
                credentials TEXT,
                lastSyncTime TIMESTAMPTZ,
                syncStatus TEXT NOT NULL DEFAULT 'idle',
                errorMessage TEXT,
                createdAt TIMESTAMPTZ DEFAULT NOW(),
                updatedAt TIMESTAMPTZ DEFAULT NOW(),
                FOREIGN KEY (userId) REFERENCES User (id),
                UNIQUE(userId, syncSource)
            )
        """)
        
        cursor.execute("""
            SELECT * FROM SyncConfig 
            WHERE userId = %s
            ORDER BY syncSource
        """, (user_id,))
        
        columns = [description[0] for description in cursor.description]
        configs = [dict(zip(columns, row)) for row in cursor.fetchall()]
        
        # Parse JSON credentials (but don't expose them)
        for config in configs:
            config['hasCredentials'] = bool(config.get('credentials'))
            config.pop('credentials', None)  # Never expose credentials
        
        conn.close()
        
        await log_to_agent_memory(
            user_id,
            "sync_configs_retrieved",
            f"Retrieved {len(configs)} sync configurations",
            None,
            f"Found {len(configs)} sync sources",
            {"configCount": len(configs)}
        )
        
        return {"configs": configs}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/sync/config")
async def save_sync_configuration(config: SyncConfig):
    """Save or update sync configuration"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Check if config exists
        cursor.execute("""
            SELECT id FROM SyncConfig 
            WHERE userId = %s AND syncSource = %s
        """, (config.userId, config.syncSource))
        
        existing = cursor.fetchone()
        
        if existing:
            # Update existing
            cursor.execute("""
                UPDATE SyncConfig 
                SET enabled = %s, autoSync = %s, frequency = %s, 
                    credentials = %s, syncStatus = %s, errorMessage = %s, 
                    updatedAt = %s
                WHERE userId = %s AND syncSource = %s
            """, (
                config.enabled,
                config.autoSync,
                config.frequency,
                json.dumps(config.credentials) if config.credentials else None,
                config.syncStatus,
                config.errorMessage,
                datetime.now().isoformat(),
                config.userId,
                config.syncSource
            ))
            action = "updated"
        else:
            # Create new
            cursor.execute("""
                INSERT INTO SyncConfig 
                (userId, syncSource, enabled, autoSync, frequency, 
                 credentials, lastSyncTime, syncStatus, errorMessage)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                config.userId,
                config.syncSource,
                config.enabled,
                config.autoSync,
                config.frequency,
                json.dumps(config.credentials) if config.credentials else None,
                config.lastSyncTime,
                config.syncStatus,
                config.errorMessage
            ))
            action = "created"
        
        conn.commit()
        conn.close()
        
        await log_to_agent_memory(
            config.userId,
            f"sync_config_{action}",
            f"Sync config {action} for {config.syncSource}",
            config.json(exclude={'credentials'}),
            f"Sync configuration {action} successfully",
            {
                "syncSource": config.syncSource,
                "enabled": config.enabled,
                "autoSync": config.autoSync,
                "frequency": config.frequency
            }
        )
        
        return {"success": True, "message": f"Sync configuration {action} successfully"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/sync/trigger")
async def trigger_sync(trigger: SyncTrigger):
    """Trigger a manual sync for a specific source"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get sync config
        cursor.execute("""
            SELECT * FROM SyncConfig 
            WHERE userId = %s AND syncSource = %s
        """, (trigger.userId, trigger.syncSource))
        
        config = cursor.fetchone()
        if not config:
            raise HTTPException(status_code=404, detail="Sync configuration not found")
        
        if not config[2]:  # enabled column
            raise HTTPException(status_code=400, detail="Sync source is disabled")
        
        # Update sync status to "syncing"
        cursor.execute("""
            UPDATE SyncConfig 
            SET syncStatus = 'syncing', errorMessage = NULL, updatedAt = %s
            WHERE userId = %s AND syncSource = %s
        """, (datetime.now().isoformat(), trigger.userId, trigger.syncSource))
        
        # Simulate sync process (in real implementation, call actual sync services)
        import random
        import time
        
        # Simulate processing time
        sync_success = random.random() > 0.1  # 90% success rate for demo
        
        if sync_success:
            # Create some test sync data
            cursor.execute("""
                SELECT COUNT(*) FROM PortfolioPosition WHERE userId = %s AND syncSource = %s
            """, (trigger.userId, trigger.syncSource))
            
            existing_count = cursor.fetchone()[0]
            
            # Add test positions if none exist for this sync source
            if existing_count == 0:
                test_positions = [
                    ("AAPL", "Apple Inc", 10, 150.0, 155.0, "equity"),
                    ("GOOGL", "Alphabet Inc", 5, 2800.0, 2850.0, "equity"),
                    ("BTC", "Bitcoin", 0.1, 45000.0, 47000.0, "crypto")
                ] if trigger.syncSource == "ibkr" else [
                    ("VTI", "Vanguard Total Stock", 20, 220.0, 225.0, "equity"),
                    ("VXUS", "Vanguard Intl Stock", 15, 65.0, 66.0, "equity"),
                    ("BND", "Vanguard Total Bond", 30, 85.0, 84.5, "bond")
                ] if trigger.syncSource == "sharesies" else []
                
                for symbol, name, qty, avg_price, current_price, asset_class in test_positions:
                    cursor.execute("""
                        INSERT INTO PortfolioPosition 
                        (userId, symbol, name, quantity, avgPrice, currentPrice, 
                         assetClass, account, syncSource)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """, (trigger.userId, symbol, name, qty, avg_price, current_price,
                          asset_class, f"{trigger.syncSource}_account", trigger.syncSource))
            
            # Update sync status to success
            cursor.execute("""
                UPDATE SyncConfig 
                SET syncStatus = 'success', lastSyncTime = %s, updatedAt = %s
                WHERE userId = %s AND syncSource = %s
            """, (datetime.now().isoformat(), datetime.now().isoformat(),
                  trigger.userId, trigger.syncSource))
            
            sync_result = "success"
            message = f"Successfully synced data from {trigger.syncSource}"
            
        else:
            # Simulate error
            error_msg = f"Failed to connect to {trigger.syncSource} API"
            cursor.execute("""
                UPDATE SyncConfig 
                SET syncStatus = 'error', errorMessage = %s, updatedAt = %s
                WHERE userId = %s AND syncSource = %s
            """, (error_msg, datetime.now().isoformat(),
                  trigger.userId, trigger.syncSource))
            
            sync_result = "error"
            message = error_msg
        
        conn.commit()
        conn.close()
        
        await log_to_agent_memory(
            trigger.userId,
            "sync_triggered",
            f"Manual sync triggered for {trigger.syncSource}",
            trigger.json(),
            message,
            {
                "syncSource": trigger.syncSource,
                "result": sync_result,
                "forceSync": trigger.forceSync
            }
        )
        
        return {
            "success": sync_success,
            "message": message,
            "syncSource": trigger.syncSource,
            "timestamp": datetime.now().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/sync/history/{user_id}")
async def get_sync_history(user_id: int, limit: int = 20):
    """Get sync history for a user"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Create SyncHistory table if it doesn't exist
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS SyncHistory (
                id SERIAL PRIMARY KEY,
                userId INTEGER NOT NULL,
                syncSource TEXT NOT NULL,
                status TEXT NOT NULL,
                recordsAdded INTEGER DEFAULT 0,
                recordsUpdated INTEGER DEFAULT 0,
                errorMessage TEXT,
                syncDuration REAL,
                timestamp TIMESTAMPTZ NOT NULL,
                FOREIGN KEY (userId) REFERENCES User (id)
            )
        """)
        
        cursor.execute("""
            SELECT * FROM SyncHistory 
            WHERE userId = %s
            ORDER BY timestamp DESC
            LIMIT %s
        """, (user_id, limit))
        
        columns = [description[0] for description in cursor.description]
        history = [dict(zip(columns, row)) for row in cursor.fetchall()]
        
        conn.close()
        
        return {"history": history}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/sync/config/{user_id}/{sync_source}")
async def delete_sync_configuration(user_id: int, sync_source: str):
    """Delete a sync configuration"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            DELETE FROM SyncConfig 
            WHERE userId = %s AND syncSource = %s
        """, (user_id, sync_source))
        
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Sync configuration not found")
        
        conn.commit()
        conn.close()
        
        await log_to_agent_memory(
            user_id,
            "sync_config_deleted",
            f"Deleted sync config for {sync_source}",
            f"user_id: {user_id}, sync_source: {sync_source}",
            "Sync configuration deleted successfully",
            {"syncSource": sync_source}
        )
        
        return {"success": True, "message": f"Sync configuration for {sync_source} deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))  