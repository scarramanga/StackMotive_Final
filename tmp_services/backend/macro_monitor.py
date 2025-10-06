from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import json
from datetime import datetime, timedelta
import psycopg2
from psycopg2.extras import RealDictCursor
import os
import random

router = APIRouter()

# Block 8: Macro Monitor Agent
# Live macro environment reader (Fed policy, CPI, yield curve, M2, etc.)

class MacroSignal(BaseModel):
    indicator: str  # "fed_rate", "cpi", "yield_curve", "m2_supply", "vix", etc.
    value: float
    previousValue: Optional[float] = None
    change: Optional[float] = None
    changePercentage: Optional[float] = None
    timestamp: str
    source: str  # "fed", "bls", "treasury", "cboe"
    aiInsight: Optional[str] = None
    impactScore: float  # 0-1 impact on markets

class MacroAlert(BaseModel):
    userId: int
    indicator: str
    threshold: float
    condition: str  # "above", "below", "change_gt", "change_lt"
    enabled: bool = True

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
            "block_8",
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

def generate_ai_insight(indicator: str, value: float, change: float, change_percentage: float) -> str:
    """Generate AI insights based on macro indicator changes"""
    insights = {
        "fed_rate": {
            "increase": f"Fed rate increased to {value}%. This typically signals tighter monetary policy, potentially cooling inflation but increasing borrowing costs.",
            "decrease": f"Fed rate decreased to {value}%. This typically stimulates economic activity but may increase inflation risks.",
            "stable": f"Fed rate remains stable at {value}%. Markets prefer predictable monetary policy."
        },
        "cpi": {
            "increase": f"CPI rose to {value}%, indicating higher inflation. This may pressure the Fed to raise rates.",
            "decrease": f"CPI declined to {value}%, suggesting cooling inflation. This could support more accommodative monetary policy.",
            "stable": f"CPI remains stable at {value}%, indicating controlled inflation levels."
        },
        "yield_curve": {
            "increase": f"Yield curve steepened to {value} basis points. This typically indicates economic growth expectations.",
            "decrease": f"Yield curve flattened to {value} basis points. A flat or inverted curve may signal recession risks.",
            "stable": f"Yield curve remains at {value} basis points, indicating stable growth expectations."
        },
        "vix": {
            "increase": f"VIX spiked to {value}, indicating increased market fear and volatility expectations.",
            "decrease": f"VIX dropped to {value}, suggesting reduced market anxiety and complacency.",
            "stable": f"VIX remains around {value}, indicating stable market sentiment."
        }
    }
    
    # Determine trend
    if abs(change_percentage) < 1:
        trend = "stable"
    elif change > 0:
        trend = "increase"
    else:
        trend = "decrease"
    
    return insights.get(indicator, {}).get(trend, f"{indicator} changed by {change_percentage:.1f}%")

@router.get("/macro/insights/{user_id}")
async def get_macro_insights(user_id: int, limit: int = 10):
    """Get latest macro signals and AI insights"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Create MacroSignal table if it doesn't exist
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS MacroSignal (
                id SERIAL PRIMARY KEY,
                indicator TEXT NOT NULL,
                value REAL NOT NULL,
                previousValue REAL,
                change REAL,
                changePercentage REAL,
                timestamp TEXT NOT NULL,
                source TEXT NOT NULL,
                aiInsight TEXT,
                impactScore REAL NOT NULL,
                createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Generate some sample data if table is empty
        cursor.execute("SELECT COUNT(*) FROM MacroSignal")
        count = cursor.fetchone()[0]
        
        if count == 0:
            # Insert sample macro data
            sample_data = [
                ("fed_rate", 5.25, 5.00, 0.25, 5.0, "fed", 0.9),
                ("cpi", 3.2, 3.4, -0.2, -5.9, "bls", 0.8),
                ("yield_curve", 45, 38, 7, 18.4, "treasury", 0.7),
                ("vix", 18.5, 22.1, -3.6, -16.3, "cboe", 0.6),
                ("m2_supply", 21.2, 21.0, 0.2, 1.0, "fed", 0.5),
                ("unemployment", 3.8, 3.9, -0.1, -2.6, "bls", 0.7),
                ("oil_price", 85.4, 82.1, 3.3, 4.0, "eia", 0.8),
                ("dollar_index", 103.2, 104.1, -0.9, -0.9, "ice", 0.6)
            ]
            
            for indicator, value, prev_val, change, change_pct, source, impact in sample_data:
                ai_insight = generate_ai_insight(indicator, value, change, change_pct)
                timestamp = datetime.now() - timedelta(hours=random.randint(1, 48))
                
                cursor.execute("""
                    INSERT INTO MacroSignal 
                    (indicator, value, previousValue, change, changePercentage, 
                     timestamp, source, aiInsight, impactScore)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (indicator, value, prev_val, change, change_pct,
                      timestamp.isoformat(), source, ai_insight, impact))
        
        # Get latest signals
        cursor.execute("""
            SELECT * FROM MacroSignal 
            ORDER BY timestamp DESC 
            LIMIT %s
        """, (limit,))
        
        columns = [description[0] for description in cursor.description]
        signals = [dict(zip(columns, row)) for row in cursor.fetchall()]
        
        # Get trend analysis
        cursor.execute("""
            SELECT 
                indicator,
                COUNT(*) as data_points,
                AVG(changePercentage) as avg_change,
                MAX(impactScore) as max_impact,
                MIN(timestamp) as earliest,
                MAX(timestamp) as latest
            FROM MacroSignal 
            WHERE timestamp >= datetime('now', '-30 days')
            GROUP BY indicator
        """, ())
        
        trend_data = [
            {
                "indicator": row[0],
                "dataPoints": row[1],
                "avgChange": row[2],
                "maxImpact": row[3],
                "earliest": row[4],
                "latest": row[5]
            }
            for row in cursor.fetchall()
        ]
        
        conn.commit()
        conn.close()
        
        await log_to_agent_memory(
            user_id,
            "macro_insights_retrieved",
            f"Retrieved {len(signals)} macro signals",
            f"limit: {limit}",
            f"Found {len(signals)} recent macro signals",
            {
                "signalCount": len(signals),
                "trendCount": len(trend_data),
                "limit": limit
            }
        )
        
        return {
            "signals": signals,
            "trends": trend_data,
            "summary": {
                "totalIndicators": len(trend_data),
                "highImpactSignals": len([s for s in signals if s['impactScore'] > 0.7]),
                "lastUpdate": max([s['timestamp'] for s in signals]) if signals else None
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/macro/alert")
async def create_macro_alert(alert: MacroAlert):
    """Create a macro alert for a user"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Create MacroAlert table if it doesn't exist
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS MacroAlert (
                id SERIAL PRIMARY KEY,
                userId INTEGER NOT NULL,
                indicator TEXT NOT NULL,
                threshold REAL NOT NULL,
                condition TEXT NOT NULL,
                enabled BOOLEAN NOT NULL DEFAULT 1,
                triggered BOOLEAN NOT NULL DEFAULT 0,
                lastTriggered TEXT,
                createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (userId) REFERENCES User (id)
            )
        """)
        
        cursor.execute("""
            INSERT INTO MacroAlert 
            (userId, indicator, threshold, condition, enabled)
            VALUES (%s, %s, %s, %s, %s)
        """, (alert.userId, alert.indicator, alert.threshold,
              alert.condition, alert.enabled))
        
        alert_id = cursor.lastrowid
        
        conn.commit()
        conn.close()
        
        await log_to_agent_memory(
            alert.userId,
            "macro_alert_created",
            f"Created alert for {alert.indicator} {alert.condition} {alert.threshold}",
            alert.json(),
            f"Macro alert created successfully with ID {alert_id}",
            {
                "alertId": alert_id,
                "indicator": alert.indicator,
                "threshold": alert.threshold,
                "condition": alert.condition
            }
        )
        
        return {
            "success": True,
            "alertId": alert_id,
            "message": f"Alert created for {alert.indicator}"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/macro/alerts/{user_id}")
async def get_macro_alerts(user_id: int):
    """Get all macro alerts for a user"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT * FROM MacroAlert 
            WHERE userId = %s
            ORDER BY createdAt DESC
        """, (user_id,))
        
        columns = [description[0] for description in cursor.description]
        alerts = [dict(zip(columns, row)) for row in cursor.fetchall()]
        
        conn.close()
        
        return {"alerts": alerts}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/macro/refresh")
async def refresh_macro_data():
    """Refresh macro data (simulate fetching from external sources)"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Simulate updating indicators with new data
        indicators = ["fed_rate", "cpi", "yield_curve", "vix", "m2_supply", "unemployment", "oil_price", "dollar_index"]
        
        for indicator in indicators:
            # Get latest value
            cursor.execute("""
                SELECT value FROM MacroSignal 
                WHERE indicator = %s 
                ORDER BY timestamp DESC 
                LIMIT 1
            """, (indicator,))
            
            result = cursor.fetchone()
            current_value = result[0] if result else 50.0
            
            # Generate new value with small random change
            change_factor = random.uniform(-0.05, 0.05)  # ±5% change
            new_value = current_value * (1 + change_factor)
            change = new_value - current_value
            change_percentage = (change / current_value) * 100
            
            # Generate AI insight
            ai_insight = generate_ai_insight(indicator, new_value, change, change_percentage)
            
            # Calculate impact score based on change magnitude
            impact_score = min(abs(change_percentage) / 10, 1.0)  # Cap at 1.0
            
            # Insert new signal
            cursor.execute("""
                INSERT INTO MacroSignal 
                (indicator, value, previousValue, change, changePercentage, 
                 timestamp, source, aiInsight, impactScore)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (indicator, new_value, current_value, change, change_percentage,
                  datetime.now().isoformat(), "simulated", ai_insight, impact_score))
        
        conn.commit()
        conn.close()
        
        return {
            "success": True,
            "message": f"Refreshed data for {len(indicators)} indicators",
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/macro/dashboard/{user_id}")
async def get_macro_dashboard(user_id: int):
    """Get comprehensive macro dashboard data"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get latest value for each indicator
        cursor.execute("""
            SELECT DISTINCT indicator FROM MacroSignal
        """)
        indicators = [row[0] for row in cursor.fetchall()]
        
        dashboard_data = {}
        
        for indicator in indicators:
            cursor.execute("""
                SELECT value, previousValue, change, changePercentage, 
                       timestamp, aiInsight, impactScore
                FROM MacroSignal 
                WHERE indicator = %s
                ORDER BY timestamp DESC 
                LIMIT 1
            """, (indicator,))
            
            result = cursor.fetchone()
            if result:
                dashboard_data[indicator] = {
                    "value": result[0],
                    "previousValue": result[1],
                    "change": result[2],
                    "changePercentage": result[3],
                    "timestamp": result[4],
                    "aiInsight": result[5],
                    "impactScore": result[6]
                }
        
        # Get alert counts
        cursor.execute("""
            SELECT COUNT(*) as total, 
                   SUM(CASE WHEN enabled = 1 THEN 1 ELSE 0 END) as active,
                   SUM(CASE WHEN triggered = 1 THEN 1 ELSE 0 END) as triggered
            FROM MacroAlert 
            WHERE userId = %s
        """, (user_id,))
        
        alert_stats = cursor.fetchone()
        alert_summary = {
            "total": alert_stats[0],
            "active": alert_stats[1],
            "triggered": alert_stats[2]
        } if alert_stats else {"total": 0, "active": 0, "triggered": 0}
        
        conn.close()
        
        await log_to_agent_memory(
            user_id,
            "macro_dashboard_accessed",
            f"Accessed macro dashboard with {len(dashboard_data)} indicators",
            None,
            f"Dashboard loaded with {len(dashboard_data)} macro indicators",
            {
                "indicatorCount": len(dashboard_data),
                "alertStats": alert_summary
            }
        )
        
        return {
            "indicators": dashboard_data,
            "alertSummary": alert_summary,
            "lastUpdate": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))            