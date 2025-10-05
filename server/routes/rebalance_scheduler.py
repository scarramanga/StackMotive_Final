from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import json
from datetime import datetime, timedelta
from database import get_db_connection

router = APIRouter()

# Block 9: Rebalance Scheduler
# UI for scheduling rebalances: Daily, Weekly, Monthly with threshold controls

class RebalanceSchedule(BaseModel):
    userId: str
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
    userId: str
    scheduleId: int
    executionType: str  # "scheduled", "manual", "threshold_triggered"
    portfolioValueBefore: float
    totalDriftPercent: float
    tradesExecuted: int
    completedSuccessfully: bool
    errorMessage: Optional[str] = None

async def log_to_agent_memory(user_id: str, action_type: str, action_summary: str, input_data: str, output_data: str, metadata: Dict[str, Any]):
    try:
        async with get_db_connection() as conn:
            await conn.execute("""
                INSERT INTO agent_memory 
                (user_id, block_id, action, context, user_input, agent_response, metadata, timestamp, session_id)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            """,
                user_id,
                "block_9",
                action_type,
                action_summary,
                input_data,
                output_data,
                json.dumps(metadata) if metadata else None,
                datetime.now(),
                f"session_{user_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            )
    except Exception as e:
        print(f"Failed to log to agent memory: {e}")

def calculate_next_scheduled_time(schedule: RebalanceSchedule) -> Optional[str]:
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
async def get_rebalance_schedule(user_id: str):
    """Get rebalance schedule for a user"""
    try:
        async with get_db_connection() as conn:
            result = await conn.fetchrow("""
                SELECT * FROM rebalance_schedules 
                WHERE user_id = $1
                ORDER BY created_at DESC
                LIMIT 1
            """, user_id)
            
            if result:
                schedule = dict(result)
            else:
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
        
        await log_to_agent_memory(
            user_id,
            "rebalance_schedule_retrieved",
            f"Retrieved rebalance schedule for user",
            "",
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
        next_scheduled = calculate_next_scheduled_time(schedule)
        
        async with get_db_connection() as conn:
            existing = await conn.fetchrow("""
                SELECT id FROM rebalance_schedules 
                WHERE user_id = $1
            """, schedule.userId)
            
            if existing:
                await conn.execute("""
                    UPDATE rebalance_schedules 
                    SET enabled = $1, frequency = $2, threshold = $3, 
                        only_if_thresholds_exceeded = $4, day_of_week = $5, day_of_month = $6,
                        exclude_weekends = $7, allow_partial_rebalancing = $8,
                        max_trades_per_session = $9, time_of_day = $10, next_scheduled_time = $11,
                        updated_at = $12
                    WHERE user_id = $13
                """,
                    schedule.enabled, schedule.frequency, schedule.threshold,
                    schedule.onlyIfThresholdsExceeded, schedule.dayOfWeek, schedule.dayOfMonth,
                    schedule.excludeWeekends, schedule.allowPartialRebalancing,
                    schedule.maxTradesPerSession, schedule.timeOfDay, next_scheduled,
                    datetime.now(), schedule.userId
                )
                action = "updated"
                schedule_id = existing['id']
            else:
                result = await conn.fetchrow("""
                    INSERT INTO rebalance_schedules 
                    (user_id, enabled, frequency, threshold, only_if_thresholds_exceeded,
                     day_of_week, day_of_month, exclude_weekends, allow_partial_rebalancing,
                     max_trades_per_session, time_of_day, next_scheduled_time)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                    RETURNING id
                """,
                    schedule.userId, schedule.enabled, schedule.frequency, schedule.threshold,
                    schedule.onlyIfThresholdsExceeded, schedule.dayOfWeek, schedule.dayOfMonth,
                    schedule.excludeWeekends, schedule.allowPartialRebalancing,
                    schedule.maxTradesPerSession, schedule.timeOfDay, next_scheduled
                )
                action = "created"
                schedule_id = result['id']
        
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
async def trigger_rebalance(user_id: str, execution_type: str = "manual"):
    """Trigger a manual rebalance"""
    try:
        async with get_db_connection() as conn:
            positions = await conn.fetch("""
                SELECT 
                    asset_class,
                    SUM(quantity * current_price) as total_value
                FROM portfolio_positions 
                WHERE user_id = $1
                GROUP BY asset_class
            """, user_id)
            
            if not positions:
                raise HTTPException(status_code=400, detail="No positions found for rebalancing")
            
            total_value = sum(float(pos['total_value']) for pos in positions)
            target_allocation = 1.0 / len(positions)
            
            max_drift = 0.0
            for pos in positions:
                current_allocation = float(pos['total_value']) / total_value
                drift = abs(current_allocation - target_allocation)
                max_drift = max(max_drift, drift * 100)
            
            schedule_data = await conn.fetchrow("""
                SELECT threshold, only_if_thresholds_exceeded, id FROM rebalance_schedules 
                WHERE user_id = $1
            """, user_id)
            
            threshold = float(schedule_data['threshold']) if schedule_data else 5.0
            only_if_exceeded = bool(schedule_data['only_if_thresholds_exceeded']) if schedule_data else True
            schedule_id = schedule_data['id'] if schedule_data else None
            
            rebalance_needed = not only_if_exceeded or max_drift > threshold
            
            if not rebalance_needed:
                return {
                    "success": False,
                    "message": f"Rebalancing not needed. Max drift {max_drift:.2f}% is below threshold {threshold}%",
                    "portfolioValue": total_value,
                    "maxDrift": max_drift,
                    "threshold": threshold
                }
            
            import random
            trades_executed = random.randint(1, len(positions))
            success = random.random() > 0.1
            error_message = None if success else "Simulated trade execution error"
            
            result = await conn.fetchrow("""
                INSERT INTO rebalance_executions 
                (user_id, schedule_id, execution_type, portfolio_value_before, 
                 total_drift_percent, trades_executed, completed_successfully, error_message)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING id
            """, user_id, schedule_id, execution_type, total_value, max_drift,
                trades_executed, success, error_message)
            
            execution_id = result['id']
            
            if success and schedule_id:
                await conn.execute("""
                    UPDATE rebalance_schedules 
                    SET last_rebalance_time = $1, updated_at = $2
                    WHERE id = $3
                """, datetime.now(), datetime.now(), schedule_id)
        
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
async def get_rebalance_history(user_id: str, limit: int = 20):
    """Get rebalance execution history"""
    try:
        async with get_db_connection() as conn:
            rows = await conn.fetch("""
                SELECT 
                    re.*,
                    rs.frequency as schedule_frequency
                FROM rebalance_executions re
                LEFT JOIN rebalance_schedules rs ON re.schedule_id = rs.id
                WHERE re.user_id = $1
                ORDER BY re.executed_at DESC
                LIMIT $2
            """, user_id, limit)
            
            history = [dict(row) for row in rows]
            
            total_executions = len(history)
            successful_executions = len([h for h in history if h.get('completed_successfully')])
            avg_trades = sum(h.get('trades_executed', 0) for h in history) / total_executions if total_executions > 0 else 0
        
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
async def get_rebalance_status(user_id: str):
    """Get current rebalance status and drift analysis"""
    try:
        async with get_db_connection() as conn:
            positions = await conn.fetch("""
                SELECT 
                    symbol, asset_class, quantity, current_price,
                    (quantity * current_price) as market_value
                FROM portfolio_positions 
                WHERE user_id = $1
            """, user_id)
            
            if not positions:
                return {"needsRebalancing": False, "message": "No positions found"}
            
            total_value = sum(float(pos['market_value']) for pos in positions)
            asset_classes = {}
            
            for pos in positions:
                asset_class = pos['asset_class']
                if asset_class not in asset_classes:
                    asset_classes[asset_class] = {"value": 0, "symbols": []}
                asset_classes[asset_class]["value"] += float(pos['market_value'])
                asset_classes[asset_class]["symbols"].append(pos['symbol'])
            
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
            
            schedule_data = await conn.fetchrow("""
                SELECT threshold, next_scheduled_time FROM rebalance_schedules 
                WHERE user_id = $1
            """, user_id)
            
            threshold = float(schedule_data['threshold']) if schedule_data else 5.0
            next_scheduled = schedule_data['next_scheduled_time'] if schedule_data else None
            
            needs_rebalancing = (max_drift * 100) > threshold
        
        return {
            "needsRebalancing": needs_rebalancing,
            "maxDrift": max_drift * 100,
            "threshold": threshold,
            "totalPortfolioValue": total_value,
            "allocationAnalysis": allocation_analysis,
            "nextScheduledRebalance": next_scheduled.isoformat() if hasattr(next_scheduled, 'isoformat') else str(next_scheduled) if next_scheduled else None,
            "lastAnalyzed": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))        