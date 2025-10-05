from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import json
from datetime import datetime, timedelta
import sqlite3
from pathlib import Path

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
            "block_10",
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

@router.get("/rules/user/{user_id}")
async def get_user_trade_rules(user_id: int):
    """Get all trade rules for a user"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Create UserTradeRules table if it doesn't exist
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS UserTradeRule (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                userId INTEGER NOT NULL,
                symbol TEXT NOT NULL,
                ruleType TEXT NOT NULL,
                threshold REAL NOT NULL,
                frequency TEXT,
                amount REAL,
                enabled BOOLEAN NOT NULL DEFAULT 1,
                lastTriggered TEXT,
                createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (userId) REFERENCES User (id)
            )
        """)
        
        cursor.execute("""
            SELECT * FROM UserTradeRule 
            WHERE userId = ?
            ORDER BY createdAt DESC
        """, (user_id,))
        
        columns = [description[0] for description in cursor.description]
        rules = [dict(zip(columns, row)) for row in cursor.fetchall()]
        
        conn.close()
        
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
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO UserTradeRule 
            (userId, symbol, ruleType, threshold, frequency, amount, enabled, lastTriggered)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            rule.userId, rule.symbol, rule.ruleType, rule.threshold,
            rule.frequency, rule.amount, rule.enabled, rule.lastTriggered
        ))
        
        rule_id = cursor.lastrowid
        
        conn.commit()
        conn.close()
        
        await log_to_agent_memory(
            rule.userId,
            "trade_rule_created",
            f"Created {rule.ruleType} rule for {rule.symbol}",
            rule.json(),
            f"Rule created successfully with ID {rule_id}",
            {
                "ruleId": rule_id,
                "symbol": rule.symbol,
                "ruleType": rule.ruleType,
                "threshold": rule.threshold
            }
        )
        
        return {
            "success": True,
            "ruleId": rule_id,
            "message": f"{rule.ruleType} rule created for {rule.symbol}"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/rules/{rule_id}")
async def update_trade_rule(rule_id: int, rule: UserTradeRule):
    """Update an existing trade rule"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            UPDATE UserTradeRule 
            SET threshold = ?, frequency = ?, amount = ?, enabled = ?, updatedAt = ?
            WHERE id = ? AND userId = ?
        """, (
            rule.threshold, rule.frequency, rule.amount, rule.enabled,
            datetime.now().isoformat(), rule_id, rule.userId
        ))
        
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Rule not found or access denied")
        
        conn.commit()
        conn.close()
        
        await log_to_agent_memory(
            rule.userId,
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
async def delete_trade_rule(rule_id: int, user_id: int):
    """Delete a trade rule"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get rule info for logging
        cursor.execute("""
            SELECT symbol, ruleType FROM UserTradeRule 
            WHERE id = ? AND userId = ?
        """, (rule_id, user_id))
        
        rule_info = cursor.fetchone()
        if not rule_info:
            raise HTTPException(status_code=404, detail="Rule not found or access denied")
        
        # Delete rule
        cursor.execute("""
            DELETE FROM UserTradeRule 
            WHERE id = ? AND userId = ?
        """, (rule_id, user_id))
        
        conn.commit()
        conn.close()
        
        await log_to_agent_memory(
            user_id,
            "trade_rule_deleted",
            f"Deleted {rule_info[1]} rule for {rule_info[0]}",
            f"rule_id: {rule_id}",
            f"Rule {rule_id} deleted successfully",
            {
                "ruleId": rule_id,
                "symbol": rule_info[0],
                "ruleType": rule_info[1]
            }
        )
        
        return {"success": True, "message": f"Rule {rule_id} deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/rules/execute/{rule_id}")
async def execute_trade_rule(rule_id: int, execution: RuleExecution):
    """Execute a trade rule (simulate execution)"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Create RuleExecution table if it doesn't exist
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS RuleExecution (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ruleId INTEGER NOT NULL,
                executionType TEXT NOT NULL,
                quantity REAL NOT NULL,
                price REAL NOT NULL,
                success BOOLEAN NOT NULL,
                errorMessage TEXT,
                executedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (ruleId) REFERENCES UserTradeRule (id)
            )
        """)
        
        # Get rule details
        cursor.execute("""
            SELECT userId, symbol, ruleType, threshold FROM UserTradeRule 
            WHERE id = ?
        """, (rule_id,))
        
        rule_data = cursor.fetchone()
        if not rule_data:
            raise HTTPException(status_code=404, detail="Rule not found")
        
        user_id, symbol, rule_type, threshold = rule_data
        
        # Record execution
        cursor.execute("""
            INSERT INTO RuleExecution 
            (ruleId, executionType, quantity, price, success, errorMessage)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (
            rule_id, execution.executionType, execution.quantity, 
            execution.price, execution.success, execution.errorMessage
        ))
        
        execution_id = cursor.lastrowid
        
        # Update rule's last triggered time if successful
        if execution.success:
            cursor.execute("""
                UPDATE UserTradeRule 
                SET lastTriggered = ?, updatedAt = ?
                WHERE id = ?
            """, (datetime.now().isoformat(), datetime.now().isoformat(), rule_id))
        
        conn.commit()
        conn.close()
        
        await log_to_agent_memory(
            user_id,
            "trade_rule_executed",
            f"Executed {rule_type} rule for {symbol}",
            execution.json(),
            f"Rule execution {'successful' if execution.success else 'failed'}",
            {
                "executionId": execution_id,
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
            "executionId": execution_id,
            "message": f"Rule execution {'completed' if execution.success else 'failed'}"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/rules/history/{user_id}")
async def get_rule_execution_history(user_id: int, limit: int = 20):
    """Get execution history for user's rules"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT 
                re.*,
                utr.symbol,
                utr.ruleType,
                utr.threshold
            FROM RuleExecution re
            JOIN UserTradeRule utr ON re.ruleId = utr.id
            WHERE utr.userId = ?
            ORDER BY re.executedAt DESC
            LIMIT ?
        """, (user_id, limit))
        
        columns = [description[0] for description in cursor.description]
        history = [dict(zip(columns, row)) for row in cursor.fetchall()]
        
        conn.close()
        
        return {"history": history}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/rules/check-triggers/{user_id}")
async def check_rule_triggers(user_id: int):
    """Check if any rules should be triggered based on current market conditions"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get enabled rules
        cursor.execute("""
            SELECT * FROM UserTradeRule 
            WHERE userId = ? AND enabled = 1
        """, (user_id,))
        
        columns = [description[0] for description in cursor.description]
        rules = [dict(zip(columns, row)) for row in cursor.fetchall()]
        
        triggered_rules = []
        
        for rule in rules:
            symbol = rule['symbol']
            rule_type = rule['ruleType']
            threshold = rule['threshold']
            
            # Get current price for the symbol
            cursor.execute("""
                SELECT currentPrice FROM PortfolioPosition 
                WHERE symbol = ? AND userId = ?
                ORDER BY lastUpdated DESC
                LIMIT 1
            """, (symbol, user_id))
            
            price_result = cursor.fetchone()
            if not price_result:
                continue
                
            current_price = price_result[0]
            
            # Check if rule should trigger
            should_trigger = False
            trigger_reason = ""
            
            if rule_type == "DCA":
                # DCA triggers based on frequency or price target
                last_triggered = rule.get('lastTriggered')
                frequency = rule.get('frequency', 'monthly')
                
                if last_triggered:
                    last_date = datetime.fromisoformat(last_triggered)
                    days_since = (datetime.now() - last_date).days
                    
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
                # Stop-loss triggers when price drops below threshold
                if current_price <= threshold:
                    should_trigger = True
                    trigger_reason = f"Price ${current_price} dropped below stop-loss threshold ${threshold}"
            
            if should_trigger:
                triggered_rules.append({
                    "ruleId": rule['id'],
                    "symbol": symbol,
                    "ruleType": rule_type,
                    "threshold": threshold,
                    "currentPrice": current_price,
                    "triggerReason": trigger_reason,
                    "suggestedAction": "BUY" if rule_type == "DCA" else "SELL",
                    "suggestedQuantity": rule.get('amount', 100) / current_price if rule_type == "DCA" else 1.0
                })
        
        conn.close()
        
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
async def get_rule_analytics(user_id: int):
    """Get analytics for user's trade rules"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Rule summary
        cursor.execute("""
            SELECT 
                ruleType,
                COUNT(*) as count,
                AVG(threshold) as avgThreshold,
                SUM(CASE WHEN enabled = 1 THEN 1 ELSE 0 END) as enabledCount
            FROM UserTradeRule 
            WHERE userId = ?
            GROUP BY ruleType
        """, (user_id,))
        
        rule_summary = [
            {
                "ruleType": row[0],
                "count": row[1],
                "avgThreshold": row[2],
                "enabledCount": row[3]
            }
            for row in cursor.fetchall()
        ]
        
        # Execution summary
        cursor.execute("""
            SELECT 
                utr.ruleType,
                COUNT(re.id) as totalExecutions,
                SUM(CASE WHEN re.success = 1 THEN 1 ELSE 0 END) as successfulExecutions,
                AVG(re.quantity) as avgQuantity,
                AVG(re.price) as avgPrice
            FROM UserTradeRule utr
            LEFT JOIN RuleExecution re ON utr.id = re.ruleId
            WHERE utr.userId = ?
            GROUP BY utr.ruleType
        """, (user_id,))
        
        execution_summary = [
            {
                "ruleType": row[0],
                "totalExecutions": row[1] or 0,
                "successfulExecutions": row[2] or 0,
                "successRate": (row[2] / row[1] * 100) if row[1] and row[1] > 0 else 0,
                "avgQuantity": row[3] or 0,
                "avgPrice": row[4] or 0
            }
            for row in cursor.fetchall()
        ]
        
        conn.close()
        
        return {
            "ruleSummary": rule_summary,
            "executionSummary": execution_summary,
            "generatedAt": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 