from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import json
from datetime import datetime, timedelta
from database import get_db_connection

router = APIRouter()

# Block 10: DCA & Stop-Loss Assistant
# Tool for setting DCA rules or Stop-loss rules on specific assets

class UserTradeRule(BaseModel):
    userId: int
    symbol: str
    ruleType: str  # "DCA", "Stop-Loss"
    threshold: float  # For DCA: target price, For Stop-Loss: stop price %
    frequency: Optional[str] = None  # For DCA: "daily", "weekly", "monthly"
    amount: Optional[float] = None  # For DCA: $ amount to invest
    enabled: bool = True
    lastTriggered: Optional[str] = None

class RuleExecution(BaseModel):
    ruleId: int
    executionType: str  # "DCA_BUY", "STOP_LOSS_SELL"
    quantity: float
    price: float
    success: bool
    errorMessage: Optional[str] = None

# Agent Memory logging
async def log_to_agent_memory(user_id: str, action_type: str, action_summary: str, input_data: Optional[str], output_data: str, metadata: Dict[str, Any]):
    try:
        async with get_db_connection() as conn:
            await conn.execute("""
                INSERT INTO agent_memory 
                (user_id, block_id, action, context, user_input, agent_response, metadata, timestamp, session_id)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            """,
                user_id,
                "block_10",
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

@router.get("/rules/user/{user_id}")
async def get_user_trade_rules(user_id: str):
    """Get all trade rules for a user"""
    try:
        async with get_db_connection() as conn:
            rows = await conn.fetch("""
                SELECT * FROM user_trade_rules 
                WHERE user_id = $1
                ORDER BY created_at DESC
            """, user_id)
            
            rules = [dict(row) for row in rows]
            
            await log_to_agent_memory(
                user_id,
                "trade_rules_retrieved",
                f"Retrieved {len(rules)} trade rules",
                None,
                f"Found {len(rules)} active trade rules",
                {"ruleCount": len(rules)}
            )
            
            return {"rules": rules}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/rules/save")
async def save_trade_rule(rule: UserTradeRule):
    """Save or update a trade rule"""
    try:
        async with get_db_connection() as conn:
            rule_id = await conn.fetchval("""
                INSERT INTO user_trade_rules 
                (user_id, symbol, rule_type, threshold, frequency, amount, enabled, last_triggered)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING id
            """,
                str(rule.userId), rule.symbol, rule.ruleType, rule.threshold,
                rule.frequency, rule.amount, rule.enabled, rule.lastTriggered
            )
            
            await log_to_agent_memory(
                str(rule.userId),
                "trade_rule_created",
                f"Created {rule.ruleType} rule for {rule.symbol}",
                rule.json(),
                f"Rule created successfully with ID {rule_id}",
                {
                    "ruleId": str(rule_id),
                    "symbol": rule.symbol,
                    "ruleType": rule.ruleType,
                    "threshold": rule.threshold
                }
            )
            
            return {
                "success": True,
                "ruleId": str(rule_id),
                "message": f"{rule.ruleType} rule created for {rule.symbol}"
            }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/rules/{rule_id}")
async def update_trade_rule(rule_id: str, rule: UserTradeRule):
    """Update an existing trade rule"""
    try:
        async with get_db_connection() as conn:
            result = await conn.execute("""
                UPDATE user_trade_rules 
                SET threshold = $1, frequency = $2, amount = $3, enabled = $4, updated_at = $5
                WHERE id = $6 AND user_id = $7
            """,
                rule.threshold, rule.frequency, rule.amount, rule.enabled,
                datetime.now(), rule_id, str(rule.userId)
            )
            
            if result == "UPDATE 0":
                raise HTTPException(status_code=404, detail="Rule not found or access denied")
            
            await log_to_agent_memory(
                str(rule.userId),
                "trade_rule_updated",
                f"Updated {rule.ruleType} rule for {rule.symbol}",
                rule.json(),
                f"Rule {rule_id} updated successfully",
                {
                    "ruleId": rule_id,
                    "symbol": rule.symbol,
                    "ruleType": rule.ruleType,
                    "enabled": rule.enabled
                }
            )
            
            return {"success": True, "message": f"Rule {rule_id} updated successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/rules/{rule_id}/{user_id}")
async def delete_trade_rule(rule_id: str, user_id: str):
    """Delete a trade rule"""
    try:
        async with get_db_connection() as conn:
            rule_info = await conn.fetchrow("""
                SELECT symbol, rule_type FROM user_trade_rules 
                WHERE id = $1 AND user_id = $2
            """, rule_id, user_id)
            
            if not rule_info:
                raise HTTPException(status_code=404, detail="Rule not found or access denied")
            
            await conn.execute("""
                DELETE FROM user_trade_rules 
                WHERE id = $1 AND user_id = $2
            """, rule_id, user_id)
            
            await log_to_agent_memory(
                user_id,
                "trade_rule_deleted",
                f"Deleted {rule_info['rule_type']} rule for {rule_info['symbol']}",
                f"rule_id: {rule_id}",
                f"Rule {rule_id} deleted successfully",
                {
                    "ruleId": rule_id,
                    "symbol": rule_info['symbol'],
                    "ruleType": rule_info['rule_type']
                }
            )
            
            return {"success": True, "message": f"Rule {rule_id} deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/rules/execute/{rule_id}")
async def execute_trade_rule(rule_id: str, execution: RuleExecution):
    """Execute a trade rule (simulate execution)"""
    try:
        async with get_db_connection() as conn:
            rule_data = await conn.fetchrow("""
                SELECT user_id, symbol, rule_type, threshold FROM user_trade_rules 
                WHERE id = $1
            """, rule_id)
            
            if not rule_data:
                raise HTTPException(status_code=404, detail="Rule not found")
            
            user_id = rule_data['user_id']
            symbol = rule_data['symbol']
            rule_type = rule_data['rule_type']
            threshold = rule_data['threshold']
            
            execution_id = await conn.fetchval("""
                INSERT INTO rule_executions 
                (rule_id, execution_type, quantity, price, success, error_message)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING id
            """,
                rule_id, execution.executionType, execution.quantity, 
                execution.price, execution.success, execution.errorMessage
            )
            
            if execution.success:
                await conn.execute("""
                    UPDATE user_trade_rules 
                    SET last_triggered = $1, updated_at = $2
                    WHERE id = $3
                """, datetime.now(), datetime.now(), rule_id)
            
            await log_to_agent_memory(
                str(user_id),
                "trade_rule_executed",
                f"Executed {rule_type} rule for {symbol}",
                execution.json(),
                f"Rule execution {'successful' if execution.success else 'failed'}",
                {
                    "executionId": str(execution_id),
                    "ruleId": rule_id,
                    "symbol": symbol,
                    "ruleType": rule_type,
                    "quantity": execution.quantity,
                    "price": execution.price,
                    "success": execution.success
                }
            )
            
            return {
                "success": execution.success,
                "executionId": str(execution_id),
                "message": f"Rule execution {'completed' if execution.success else 'failed'}"
            }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/rules/history/{user_id}")
async def get_rule_execution_history(user_id: str, limit: int = 20):
    """Get execution history for user's rules"""
    try:
        async with get_db_connection() as conn:
            rows = await conn.fetch("""
                SELECT 
                    re.*,
                    utr.symbol,
                    utr.rule_type,
                    utr.threshold
                FROM rule_executions re
                JOIN user_trade_rules utr ON re.rule_id = utr.id
                WHERE utr.user_id = $1
                ORDER BY re.executed_at DESC
                LIMIT $2
            """, user_id, limit)
            
            history = [dict(row) for row in rows]
            
            return {"history": history}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/rules/check-triggers/{user_id}")
async def check_rule_triggers(user_id: str):
    """Check if any rules should be triggered based on current market conditions"""
    try:
        async with get_db_connection() as conn:
            rows = await conn.fetch("""
                SELECT * FROM user_trade_rules 
                WHERE user_id = $1 AND enabled = true
            """, user_id)
            
            rules = [dict(row) for row in rows]
            triggered_rules = []
            
            for rule in rules:
                symbol = rule['symbol']
                rule_type = rule['rule_type']
                threshold = rule['threshold']
                
                price_row = await conn.fetchrow("""
                    SELECT current_price FROM portfolio_holdings 
                    WHERE symbol = $1 AND user_id = $2
                    ORDER BY last_updated DESC
                    LIMIT 1
                """, symbol, user_id)
                
                if not price_row:
                    continue
                    
                current_price = price_row['current_price']
                
                should_trigger = False
                trigger_reason = ""
                
                if rule_type == "DCA":
                    last_triggered = rule.get('last_triggered')
                    frequency = rule.get('frequency', 'monthly')
                    
                    if last_triggered:
                        days_since = (datetime.now() - last_triggered).days
                        
                        if frequency == "daily" and days_since >= 1:
                            should_trigger = True
                            trigger_reason = "Daily DCA schedule"
                        elif frequency == "weekly" and days_since >= 7:
                            should_trigger = True
                            trigger_reason = "Weekly DCA schedule"
                        elif frequency == "monthly" and days_since >= 30:
                            should_trigger = True
                            trigger_reason = "Monthly DCA schedule"
                    else:
                        should_trigger = True
                        trigger_reason = "First DCA execution"
                        
                elif rule_type == "Stop-Loss":
                    if current_price <= threshold:
                        should_trigger = True
                        trigger_reason = f"Price ${current_price} dropped below stop-loss threshold ${threshold}"
                
                if should_trigger:
                    triggered_rules.append({
                        "ruleId": str(rule['id']),
                        "symbol": symbol,
                        "ruleType": rule_type,
                        "threshold": threshold,
                        "currentPrice": current_price,
                        "triggerReason": trigger_reason,
                        "suggestedAction": "BUY" if rule_type == "DCA" else "SELL",
                        "suggestedQuantity": rule.get('amount', 100) / current_price if rule_type == "DCA" else 1.0
                    })
            
            await log_to_agent_memory(
                user_id,
                "rule_triggers_checked",
                f"Checked {len(rules)} rules, {len(triggered_rules)} triggers found",
                f"user_id: {user_id}",
                f"Found {len(triggered_rules)} triggered rules",
                {
                    "totalRules": len(rules),
                    "triggeredRules": len(triggered_rules),
                    "triggers": [r['ruleId'] for r in triggered_rules]
                }
            )
            
            return {
                "triggeredRules": triggered_rules,
                "totalRulesChecked": len(rules),
                "lastChecked": datetime.now().isoformat()
            }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/rules/analytics/{user_id}")
async def get_rule_analytics(user_id: str):
    """Get analytics for user's trade rules"""
    try:
        async with get_db_connection() as conn:
            rule_rows = await conn.fetch("""
                SELECT 
                    rule_type,
                    COUNT(*) as count,
                    AVG(threshold) as avg_threshold,
                    COUNT(*) FILTER (WHERE enabled = true) as enabled_count
                FROM user_trade_rules 
                WHERE user_id = $1
                GROUP BY rule_type
            """, user_id)
            
            rule_summary = [
                {
                    "ruleType": row['rule_type'],
                    "count": row['count'],
                    "avgThreshold": float(row['avg_threshold']) if row['avg_threshold'] else 0,
                    "enabledCount": row['enabled_count']
                }
                for row in rule_rows
            ]
            
            exec_rows = await conn.fetch("""
                SELECT 
                    utr.rule_type,
                    COUNT(re.id) as total_executions,
                    COUNT(*) FILTER (WHERE re.success = true) as successful_executions,
                    AVG(re.quantity) as avg_quantity,
                    AVG(re.price) as avg_price
                FROM user_trade_rules utr
                LEFT JOIN rule_executions re ON utr.id = re.rule_id
                WHERE utr.user_id = $1
                GROUP BY utr.rule_type
            """, user_id)
            
            execution_summary = [
                {
                    "ruleType": row['rule_type'],
                    "totalExecutions": row['total_executions'] or 0,
                    "successfulExecutions": row['successful_executions'] or 0,
                    "successRate": (row['successful_executions'] / row['total_executions'] * 100) if row['total_executions'] and row['total_executions'] > 0 else 0,
                    "avgQuantity": float(row['avg_quantity']) if row['avg_quantity'] else 0,
                    "avgPrice": float(row['avg_price']) if row['avg_price'] else 0
                }
                for row in exec_rows
            ]
            
            return {
                "ruleSummary": rule_summary,
                "executionSummary": execution_summary,
                "generatedAt": datetime.now().isoformat()
            }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 