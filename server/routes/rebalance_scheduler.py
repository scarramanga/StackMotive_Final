from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import json
from datetime import datetime, timedelta
import sqlite3
from pathlib import Path

router = APIRouter()

# Block 9: Rebalance Scheduler
# UI for scheduling rebalances: Daily, Weekly, Monthly with threshold controls

class RebalanceSchedule(BaseModel):
    userId: int
    enabled: bool = True
    frequency: str  # "daily", "weekly", "monthly", "quarterly", "manual"
    threshold: float = 5.0  # Only rebalance if allocation drifts more than this %
    onlyIfThresholdsExceeded: bool = True
    dayOfWeek: Optional[int] = None  # For weekly: 0-6 (Monday=0)
    dayOfMonth: Optional[int] = None  # For monthly: 1-31
    excludeWeekends: bool = True
    allowPartialRebalancing: bool = False
    maxTradesPerSession: int = 10
    timeOfDay: str = "09:30"  # HH:MM format
    lastRebalanceTime: Optional[str] = None
    nextScheduledTime: Optional[str] = None

class RebalanceExecution(BaseModel):
    userId: int
    scheduleId: int
    executionType: str  # "scheduled", "manual", "threshold_triggered"
    portfolioValueBefore: float
    totalDriftPercent: float
    tradesExecuted: int
    completedSuccessfully: bool
    errorMessage: Optional[str] = None

# Database connection
def get_db_connection():
    db_path = Path(__file__).parent.parent.parent / "prisma" / "dev.db"
    return sqlite3.connect(str(db_path))

# Agent Memory logging
async def log_to_agent_memory(user_id: int, action_type: str, action_summary: str, input_data: str, output_data: str, metadata: Dict[str, Any]):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO AgentMemory 
            (userId, blockId, action, context, userInput, agentResponse, metadata, timestamp, sessionId)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            user_id,
            "block_9",
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

def calculate_next_scheduled_time(schedule: RebalanceSchedule) -> str:
    """Calculate next scheduled rebalance time"""
    now = datetime.now()
    
    if schedule.frequency == "daily":
        next_time = now.replace(hour=int(schedule.timeOfDay.split(':')[0]), 
                               minute=int(schedule.timeOfDay.split(':')[1]), 
                               second=0, microsecond=0)
        if next_time <= now:
            next_time += timedelta(days=1)
        
        # Skip weekends if requested
        if schedule.excludeWeekends and next_time.weekday() >= 5:
            days_to_add = 7 - next_time.weekday()
            next_time += timedelta(days=days_to_add)
            
    elif schedule.frequency == "weekly":
        target_weekday = schedule.dayOfWeek or 0
        days_ahead = target_weekday - now.weekday()
        if days_ahead <= 0:
            days_ahead += 7
        next_time = now + timedelta(days=days_ahead)
        next_time = next_time.replace(hour=int(schedule.timeOfDay.split(':')[0]), 
                                     minute=int(schedule.timeOfDay.split(':')[1]),
                                     second=0, microsecond=0)
                                     
    elif schedule.frequency == "monthly":
        target_day = schedule.dayOfMonth or 1
        if now.day < target_day:
            next_time = now.replace(day=target_day)
        else:
            # Next month
            if now.month == 12:
                next_time = now.replace(year=now.year + 1, month=1, day=target_day)
            else:
                next_time = now.replace(month=now.month + 1, day=target_day)
        next_time = next_time.replace(hour=int(schedule.timeOfDay.split(':')[0]), 
                                     minute=int(schedule.timeOfDay.split(':')[1]),
                                     second=0, microsecond=0)
                                     
    elif schedule.frequency == "quarterly":
        # Find next quarter end month (March, June, September, December)
        quarter_months = [3, 6, 9, 12]
        current_month = now.month
        next_quarter_month = next((m for m in quarter_months if m > current_month), quarter_months[0])
        
        if next_quarter_month <= current_month:
            year = now.year + 1
        else:
            year = now.year
            
        next_time = datetime(year, next_quarter_month, schedule.dayOfMonth or 1,
                           int(schedule.timeOfDay.split(':')[0]), 
                           int(schedule.timeOfDay.split(':')[1]))
    else:
        # Manual - no scheduled time
        return None
    
    return next_time.isoformat()

@router.get("/rebalance/schedule/{user_id}")
async def get_rebalance_schedule(user_id: int):
    """Get rebalance schedule for a user"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Create RebalanceSchedule table if it doesn't exist
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS RebalanceSchedule (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                userId INTEGER NOT NULL,
                enabled BOOLEAN NOT NULL DEFAULT 1,
                frequency TEXT NOT NULL DEFAULT 'manual',
                threshold REAL NOT NULL DEFAULT 5.0,
                onlyIfThresholdsExceeded BOOLEAN NOT NULL DEFAULT 1,
                dayOfWeek INTEGER,
                dayOfMonth INTEGER,
                excludeWeekends BOOLEAN NOT NULL DEFAULT 1,
                allowPartialRebalancing BOOLEAN NOT NULL DEFAULT 0,
                maxTradesPerSession INTEGER NOT NULL DEFAULT 10,
                timeOfDay TEXT NOT NULL DEFAULT '09:30',
                lastRebalanceTime TEXT,
                nextScheduledTime TEXT,
                createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (userId) REFERENCES User (id)
            )
        """)
        
        cursor.execute("""
            SELECT * FROM RebalanceSchedule 
            WHERE userId = ?
            ORDER BY createdAt DESC
            LIMIT 1
        """, (user_id,))
        
        result = cursor.fetchone()
        
        if result:
            columns = [description[0] for description in cursor.description]
            schedule = dict(zip(columns, result))
        else:
            # Create default schedule
            schedule = {
                "userId": user_id,
                "enabled": False,
                "frequency": "manual",
                "threshold": 5.0,
                "onlyIfThresholdsExceeded": True,
                "dayOfWeek": None,
                "dayOfMonth": None,
                "excludeWeekends": True,
                "allowPartialRebalancing": False,
                "maxTradesPerSession": 10,
                "timeOfDay": "09:30",
                "lastRebalanceTime": None,
                "nextScheduledTime": None
            }
        
        conn.close()
        
        await log_to_agent_memory(
            user_id,
            "rebalance_schedule_retrieved",
            f"Retrieved rebalance schedule for user",
            None,
            f"Schedule found: {schedule.get('frequency', 'manual')} frequency",
            {"frequency": schedule.get("frequency"), "enabled": schedule.get("enabled")}
        )
        
        return {"schedule": schedule}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/rebalance/schedule")
async def save_rebalance_schedule(schedule: RebalanceSchedule):
    """Save or update rebalance schedule"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Calculate next scheduled time
        next_scheduled = calculate_next_scheduled_time(schedule)
        
        # Check if schedule exists
        cursor.execute("""
            SELECT id FROM RebalanceSchedule 
            WHERE userId = ?
        """, (schedule.userId,))
        
        existing = cursor.fetchone()
        
        if existing:
            # Update existing
            cursor.execute("""
                UPDATE RebalanceSchedule 
                SET enabled = ?, frequency = ?, threshold = ?, 
                    onlyIfThresholdsExceeded = ?, dayOfWeek = ?, dayOfMonth = ?,
                    excludeWeekends = ?, allowPartialRebalancing = ?, 
                    maxTradesPerSession = ?, timeOfDay = ?, nextScheduledTime = ?,
                    updatedAt = ?
                WHERE userId = ?
            """, (
                schedule.enabled, schedule.frequency, schedule.threshold,
                schedule.onlyIfThresholdsExceeded, schedule.dayOfWeek, schedule.dayOfMonth,
                schedule.excludeWeekends, schedule.allowPartialRebalancing,
                schedule.maxTradesPerSession, schedule.timeOfDay, next_scheduled,
                datetime.now().isoformat(), schedule.userId
            ))
            action = "updated"
            schedule_id = existing[0]
        else:
            # Create new
            cursor.execute("""
                INSERT INTO RebalanceSchedule 
                (userId, enabled, frequency, threshold, onlyIfThresholdsExceeded,
                 dayOfWeek, dayOfMonth, excludeWeekends, allowPartialRebalancing,
                 maxTradesPerSession, timeOfDay, nextScheduledTime)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                schedule.userId, schedule.enabled, schedule.frequency, schedule.threshold,
                schedule.onlyIfThresholdsExceeded, schedule.dayOfWeek, schedule.dayOfMonth,
                schedule.excludeWeekends, schedule.allowPartialRebalancing,
                schedule.maxTradesPerSession, schedule.timeOfDay, next_scheduled
            ))
            action = "created"
            schedule_id = cursor.lastrowid
        
        conn.commit()
        conn.close()
        
        await log_to_agent_memory(
            schedule.userId,
            f"rebalance_schedule_{action}",
            f"Rebalance schedule {action}: {schedule.frequency} frequency",
            schedule.json(),
            f"Schedule {action} successfully",
            {
                "scheduleId": schedule_id,
                "frequency": schedule.frequency,
                "enabled": schedule.enabled,
                "threshold": schedule.threshold,
                "nextScheduled": next_scheduled
            }
        )
        
        return {
            "success": True,
            "scheduleId": schedule_id,
            "message": f"Rebalance schedule {action} successfully",
            "nextScheduledTime": next_scheduled
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/rebalance/trigger/{user_id}")
async def trigger_rebalance(user_id: int, execution_type: str = "manual"):
    """Trigger a manual rebalance"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Create RebalanceExecution table if it doesn't exist
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS RebalanceExecution (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                userId INTEGER NOT NULL,
                scheduleId INTEGER,
                executionType TEXT NOT NULL,
                portfolioValueBefore REAL NOT NULL,
                totalDriftPercent REAL NOT NULL,
                tradesExecuted INTEGER NOT NULL DEFAULT 0,
                completedSuccessfully BOOLEAN NOT NULL DEFAULT 0,
                errorMessage TEXT,
                executedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (userId) REFERENCES User (id),
                FOREIGN KEY (scheduleId) REFERENCES RebalanceSchedule (id)
            )
        """)
        
        # Get current portfolio positions to calculate drift
        cursor.execute("""
            SELECT 
                assetClass,
                SUM(quantity * currentPrice) as totalValue
            FROM PortfolioPosition 
            WHERE userId = ?
            GROUP BY assetClass
        """, (user_id,))
        
        positions = cursor.fetchall()
        if not positions:
            raise HTTPException(status_code=400, detail="No positions found for rebalancing")
        
        # Calculate total portfolio value
        total_value = sum(pos[1] for pos in positions)
        
        # Get target allocations (simplified - using equal weighting for demo)
        target_allocation = 1.0 / len(positions)  # Equal weight
        
        # Calculate drift
        max_drift = 0.0
        for asset_class, value in positions:
            current_allocation = value / total_value
            drift = abs(current_allocation - target_allocation)
            max_drift = max(max_drift, drift * 100)  # Convert to percentage
        
        # Get schedule to check thresholds
        cursor.execute("""
            SELECT threshold, onlyIfThresholdsExceeded, id FROM RebalanceSchedule 
            WHERE userId = ?
        """, (user_id,))
        
        schedule_data = cursor.fetchone()
        threshold = schedule_data[0] if schedule_data else 5.0
        only_if_exceeded = schedule_data[1] if schedule_data else True
        schedule_id = schedule_data[2] if schedule_data else None
        
        # Check if rebalancing is needed
        rebalance_needed = not only_if_exceeded or max_drift > threshold
        
        if not rebalance_needed:
            return {
                "success": False,
                "message": f"Rebalancing not needed. Max drift {max_drift:.2f}% is below threshold {threshold}%",
                "portfolioValue": total_value,
                "maxDrift": max_drift,
                "threshold": threshold
            }
        
        # Simulate rebalancing trades
        import random
        trades_executed = random.randint(1, len(positions))
        success = random.random() > 0.1  # 90% success rate
        
        error_message = None if success else "Simulated trade execution error"
        
        # Record execution
        cursor.execute("""
            INSERT INTO RebalanceExecution 
            (userId, scheduleId, executionType, portfolioValueBefore, 
             totalDriftPercent, tradesExecuted, completedSuccessfully, errorMessage)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (user_id, schedule_id, execution_type, total_value, max_drift,
              trades_executed, success, error_message))
        
        execution_id = cursor.lastrowid
        
        # Update last rebalance time if successful
        if success and schedule_id:
            cursor.execute("""
                UPDATE RebalanceSchedule 
                SET lastRebalanceTime = ?, updatedAt = ?
                WHERE id = ?
            """, (datetime.now().isoformat(), datetime.now().isoformat(), schedule_id))
        
        conn.commit()
        conn.close()
        
        await log_to_agent_memory(
            user_id,
            "rebalance_triggered",
            f"Manual rebalance triggered with {trades_executed} trades",
            f"execution_type: {execution_type}",
            f"Rebalance {'completed successfully' if success else 'failed'} with {trades_executed} trades",
            {
                "executionId": execution_id,
                "executionType": execution_type,
                "portfolioValue": total_value,
                "maxDrift": max_drift,
                "tradesExecuted": trades_executed,
                "success": success
            }
        )
        
        return {
            "success": success,
            "executionId": execution_id,
            "message": f"Rebalancing {'completed successfully' if success else 'failed'}",
            "portfolioValue": total_value,
            "maxDrift": max_drift,
            "tradesExecuted": trades_executed,
            "errorMessage": error_message
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/rebalance/history/{user_id}")
async def get_rebalance_history(user_id: int, limit: int = 20):
    """Get rebalance execution history"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT 
                re.*,
                rs.frequency as scheduleFrequency
            FROM RebalanceExecution re
            LEFT JOIN RebalanceSchedule rs ON re.scheduleId = rs.id
            WHERE re.userId = ?
            ORDER BY re.executedAt DESC
            LIMIT ?
        """, (user_id, limit))
        
        columns = [description[0] for description in cursor.description]
        history = [dict(zip(columns, row)) for row in cursor.fetchall()]
        
        # Calculate summary statistics
        total_executions = len(history)
        successful_executions = len([h for h in history if h['completedSuccessfully']])
        avg_trades = sum(h['tradesExecuted'] for h in history) / total_executions if total_executions > 0 else 0
        
        conn.close()
        
        return {
            "history": history,
            "summary": {
                "totalExecutions": total_executions,
                "successfulExecutions": successful_executions,
                "successRate": (successful_executions / total_executions * 100) if total_executions > 0 else 0,
                "averageTradesPerRebalance": avg_trades
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/rebalance/status/{user_id}")
async def get_rebalance_status(user_id: int):
    """Get current rebalance status and drift analysis"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get current positions
        cursor.execute("""
            SELECT 
                symbol, assetClass, quantity, currentPrice,
                (quantity * currentPrice) as marketValue
            FROM PortfolioPosition 
            WHERE userId = ?
        """, (user_id,))
        
        positions = cursor.fetchall()
        if not positions:
            return {"needsRebalancing": False, "message": "No positions found"}
        
        # Calculate current allocations
        total_value = sum(pos[4] for pos in positions)
        asset_classes = {}
        
        for symbol, asset_class, quantity, price, market_value in positions:
            if asset_class not in asset_classes:
                asset_classes[asset_class] = {"value": 0, "symbols": []}
            asset_classes[asset_class]["value"] += market_value
            asset_classes[asset_class]["symbols"].append(symbol)
        
        # Calculate allocations and drift (using equal weight target for demo)
        target_allocation = 1.0 / len(asset_classes)
        max_drift = 0.0
        allocation_analysis = []
        
        for asset_class, data in asset_classes.items():
            current_allocation = data["value"] / total_value
            drift = abs(current_allocation - target_allocation)
            max_drift = max(max_drift, drift)
            
            allocation_analysis.append({
                "assetClass": asset_class,
                "currentAllocation": current_allocation * 100,
                "targetAllocation": target_allocation * 100,
                "drift": drift * 100,
                "value": data["value"],
                "symbols": data["symbols"]
            })
        
        # Get threshold from schedule
        cursor.execute("""
            SELECT threshold, nextScheduledTime FROM RebalanceSchedule 
            WHERE userId = ?
        """, (user_id,))
        
        schedule_data = cursor.fetchone()
        threshold = schedule_data[0] if schedule_data else 5.0
        next_scheduled = schedule_data[1] if schedule_data else None
        
        needs_rebalancing = (max_drift * 100) > threshold
        
        conn.close()
        
        return {
            "needsRebalancing": needs_rebalancing,
            "maxDrift": max_drift * 100,
            "threshold": threshold,
            "totalPortfolioValue": total_value,
            "allocationAnalysis": allocation_analysis,
            "nextScheduledRebalance": next_scheduled,
            "lastAnalyzed": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 