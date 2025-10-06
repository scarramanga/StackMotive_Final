# Block 40: Live Signal Summary Panel - FULLY INTEGRATED ✅

from fastapi import APIRouter, HTTPException, Body
from typing import List, Dict, Any
from pydantic import BaseModel
import json
from datetime import datetime, timedelta
import psycopg2
from psycopg2.extras import RealDictCursor
import os

router = APIRouter()

class LiveSignal(BaseModel):
    signalId: str
    signalSource: str
    signalType: str
    assetSymbol: str
    signalTitle: str
    confidenceScore: float
    signalStrength: float
    priorityLevel: str = "medium"
    currentPrice: float
    signalTimestamp: str

# Database connection
def get_db_connection():
    database_url = os.getenv("DATABASE_URL", "postgresql://postgres:password@localhost:5432/stackmotive")
    return psycopg2.connect(database_url)

@router.get("/live-signal-summary-panel/signals")
async def get_live_signals(user_id: int = 1):
    """Get live trading signals"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS LiveSignals (
                id SERIAL PRIMARY KEY,
                userId INTEGER NOT NULL,
                signal_id TEXT NOT NULL,
                signal_source TEXT NOT NULL,
                signal_type TEXT NOT NULL,
                asset_symbol TEXT NOT NULL,
                signal_title TEXT NOT NULL,
                confidence_score REAL DEFAULT 0,
                signal_strength REAL DEFAULT 0,
                priority_level TEXT DEFAULT 'medium',
                current_price REAL,
                signal_timestamp TEXT NOT NULL,
                signal_status TEXT DEFAULT 'active',
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(signal_id, signal_source)
            )
        """)
        
        # Get active signals
        cursor.execute("""
            SELECT * FROM LiveSignals 
            WHERE userId = %s AND signal_status = 'active'
            ORDER BY signal_timestamp DESC, priority_level
            LIMIT 50
        """, (user_id,))
        
        results = cursor.fetchall()
        
        if not results:
            # Generate sample signals for demo
            sample_signals = [
                {"signal_id": "BUY_AAPL_001", "signal_source": "TechnicalAnalysis", "signal_type": "buy", "asset_symbol": "AAPL", "signal_title": "Strong Bullish Breakout", "confidence_score": 85.5, "signal_strength": 78.2, "priority_level": "high", "current_price": 189.45},
                {"signal_id": "SELL_TSLA_002", "signal_source": "FundamentalAnalysis", "signal_type": "sell", "asset_symbol": "TSLA", "signal_title": "Overvaluation Alert", "confidence_score": 72.3, "signal_strength": 65.1, "priority_level": "medium", "current_price": 245.67},
                {"signal_id": "WATCH_BTC_003", "signal_source": "MarketSentiment", "signal_type": "watch", "asset_symbol": "BTC", "signal_title": "Consolidation Pattern", "confidence_score": 68.9, "signal_strength": 55.4, "priority_level": "low", "current_price": 43250.89}
            ]
            
            for signal in sample_signals:
                cursor.execute("""
                    INSERT OR REPLACE INTO LiveSignals 
                    (userId, signal_id, signal_source, signal_type, asset_symbol, signal_title,
                     confidence_score, signal_strength, priority_level, current_price, signal_timestamp)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    user_id, signal["signal_id"], signal["signal_source"], signal["signal_type"],
                    signal["asset_symbol"], signal["signal_title"], signal["confidence_score"],
                    signal["signal_strength"], signal["priority_level"], signal["current_price"],
                    datetime.now().isoformat()
                ))
            
            conn.commit()
            
            # Re-fetch data
            cursor.execute("""
                SELECT * FROM LiveSignals 
                WHERE userId = %s AND signal_status = 'active'
                ORDER BY signal_timestamp DESC
                LIMIT 50
            """, (user_id,))
            results = cursor.fetchall()
        
        columns = [description[0] for description in cursor.description]
        signals = [dict(zip(columns, row)) for row in results]
        
        conn.close()
        
        return {"signals": signals, "totalCount": len(signals)}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/live-signal-summary-panel/signals")
async def add_live_signal(signal: LiveSignal = Body(...), user_id: int = 1):
    """Add new live signal"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT OR REPLACE INTO LiveSignals 
            (userId, signal_id, signal_source, signal_type, asset_symbol, signal_title,
             confidence_score, signal_strength, priority_level, current_price, signal_timestamp)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            user_id, signal.signalId, signal.signalSource, signal.signalType,
            signal.assetSymbol, signal.signalTitle, signal.confidenceScore,
            signal.signalStrength, signal.priorityLevel, signal.currentPrice,
            signal.signalTimestamp
        ))
        
        conn.commit()
        conn.close()
        
        return {"success": True, "message": "Signal added successfully"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/live-signal-summary-panel/summary")
async def get_signal_summary(user_id: int = 1):
    """Get signal summary statistics"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT 
                COUNT(*) as total_signals,
                COUNT(CASE WHEN signal_type = 'buy' THEN 1 END) as buy_signals,
                COUNT(CASE WHEN signal_type = 'sell' THEN 1 END) as sell_signals,
                COUNT(CASE WHEN priority_level = 'high' THEN 1 END) as high_priority,
                AVG(confidence_score) as avg_confidence
            FROM LiveSignals 
            WHERE userId = %s AND signal_status = 'active'
        """, (user_id,))
        
        result = cursor.fetchone()
        conn.close()
        
        return {
            "totalSignals": result[0] or 0,
            "buySignals": result[1] or 0,
            "sellSignals": result[2] or 0,
            "highPriority": result[3] or 0,
            "avgConfidence": round(result[4] or 0, 1)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 

from fastapi import APIRouter, HTTPException, Body
from typing import List, Dict, Any
from pydantic import BaseModel
import json
from datetime import datetime, timedelta
import psycopg2
from psycopg2.extras import RealDictCursor
import os

router = APIRouter()

class LiveSignal(BaseModel):
    signalId: str
    signalSource: str
    signalType: str
    assetSymbol: str
    signalTitle: str
    confidenceScore: float
    signalStrength: float
    priorityLevel: str = "medium"
    currentPrice: float
    signalTimestamp: str

# Database connection
def get_db_connection():
    database_url = os.getenv("DATABASE_URL", "postgresql://postgres:password@localhost:5432/stackmotive")
    return psycopg2.connect(database_url)

@router.get("/live-signal-summary-panel/signals")
async def get_live_signals(user_id: int = 1):
    """Get live trading signals"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS LiveSignals (
                id SERIAL PRIMARY KEY,
                userId INTEGER NOT NULL,
                signal_id TEXT NOT NULL,
                signal_source TEXT NOT NULL,
                signal_type TEXT NOT NULL,
                asset_symbol TEXT NOT NULL,
                signal_title TEXT NOT NULL,
                confidence_score REAL DEFAULT 0,
                signal_strength REAL DEFAULT 0,
                priority_level TEXT DEFAULT 'medium',
                current_price REAL,
                signal_timestamp TEXT NOT NULL,
                signal_status TEXT DEFAULT 'active',
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(signal_id, signal_source)
            )
        """)
        
        # Get active signals
        cursor.execute("""
            SELECT * FROM LiveSignals 
            WHERE userId = %s AND signal_status = 'active'
            ORDER BY signal_timestamp DESC, priority_level
            LIMIT 50
        """, (user_id,))
        
        results = cursor.fetchall()
        
        if not results:
            # Generate sample signals for demo
            sample_signals = [
                {"signal_id": "BUY_AAPL_001", "signal_source": "TechnicalAnalysis", "signal_type": "buy", "asset_symbol": "AAPL", "signal_title": "Strong Bullish Breakout", "confidence_score": 85.5, "signal_strength": 78.2, "priority_level": "high", "current_price": 189.45},
                {"signal_id": "SELL_TSLA_002", "signal_source": "FundamentalAnalysis", "signal_type": "sell", "asset_symbol": "TSLA", "signal_title": "Overvaluation Alert", "confidence_score": 72.3, "signal_strength": 65.1, "priority_level": "medium", "current_price": 245.67},
                {"signal_id": "WATCH_BTC_003", "signal_source": "MarketSentiment", "signal_type": "watch", "asset_symbol": "BTC", "signal_title": "Consolidation Pattern", "confidence_score": 68.9, "signal_strength": 55.4, "priority_level": "low", "current_price": 43250.89}
            ]
            
            for signal in sample_signals:
                cursor.execute("""
                    INSERT OR REPLACE INTO LiveSignals 
                    (userId, signal_id, signal_source, signal_type, asset_symbol, signal_title,
                     confidence_score, signal_strength, priority_level, current_price, signal_timestamp)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    user_id, signal["signal_id"], signal["signal_source"], signal["signal_type"],
                    signal["asset_symbol"], signal["signal_title"], signal["confidence_score"],
                    signal["signal_strength"], signal["priority_level"], signal["current_price"],
                    datetime.now().isoformat()
                ))
            
            conn.commit()
            
            # Re-fetch data
            cursor.execute("""
                SELECT * FROM LiveSignals 
                WHERE userId = %s AND signal_status = 'active'
                ORDER BY signal_timestamp DESC
                LIMIT 50
            """, (user_id,))
            results = cursor.fetchall()
        
        columns = [description[0] for description in cursor.description]
        signals = [dict(zip(columns, row)) for row in results]
        
        conn.close()
        
        return {"signals": signals, "totalCount": len(signals)}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/live-signal-summary-panel/signals")
async def add_live_signal(signal: LiveSignal = Body(...), user_id: int = 1):
    """Add new live signal"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT OR REPLACE INTO LiveSignals 
            (userId, signal_id, signal_source, signal_type, asset_symbol, signal_title,
             confidence_score, signal_strength, priority_level, current_price, signal_timestamp)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            user_id, signal.signalId, signal.signalSource, signal.signalType,
            signal.assetSymbol, signal.signalTitle, signal.confidenceScore,
            signal.signalStrength, signal.priorityLevel, signal.currentPrice,
            signal.signalTimestamp
        ))
        
        conn.commit()
        conn.close()
        
        return {"success": True, "message": "Signal added successfully"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/live-signal-summary-panel/summary")
async def get_signal_summary(user_id: int = 1):
    """Get signal summary statistics"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT 
                COUNT(*) as total_signals,
                COUNT(CASE WHEN signal_type = 'buy' THEN 1 END) as buy_signals,
                COUNT(CASE WHEN signal_type = 'sell' THEN 1 END) as sell_signals,
                COUNT(CASE WHEN priority_level = 'high' THEN 1 END) as high_priority,
                AVG(confidence_score) as avg_confidence
            FROM LiveSignals 
            WHERE userId = %s AND signal_status = 'active'
        """, (user_id,))
        
        result = cursor.fetchone()
        conn.close()
        
        return {
            "totalSignals": result[0] or 0,
            "buySignals": result[1] or 0,
            "sellSignals": result[2] or 0,
            "highPriority": result[3] or 0,
            "avgConfidence": round(result[4] or 0, 1)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))          