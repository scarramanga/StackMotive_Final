from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, validator
from typing import Optional, List, Dict, Any
import json
from datetime import datetime
import psycopg2
from psycopg2.extras import RealDictCursor
import os

router = APIRouter()

# Block 2: Strategy Assignment Engine
# Auto-assigns strategies to portfolio positions based on rules and user preferences

class StrategyAssignment(BaseModel):
    positionId: int
    strategyId: str
    strategyName: str
    confidence: float
    reason: str
    assignedAt: str
    metadata: Optional[Dict[str, Any]] = None

class AssignmentRule(BaseModel):
    id: str
    name: str
    assetClassRules: Dict[str, str]  # asset_class -> strategy_id mapping
    symbolRules: Dict[str, str]      # specific symbol -> strategy_id mapping
    defaultStrategy: str
    isActive: bool

class StrategyConfig(BaseModel):
    id: str
    name: str
    description: str
    assetClasses: List[str]
    riskLevel: str  # conservative, moderate, aggressive
    expectedReturn: float
    maxDrawdown: float
    rebalanceFrequency: str  # daily, weekly, monthly, quarterly
    isActive: bool

# Database connection
def get_db_connection():
    database_url = os.getenv("DATABASE_URL", "postgresql://postgres:password@localhost:5432/stackmotive")
    return psycopg2.connect(database_url)

# Log to Agent Memory Table
async def log_to_agent_memory(
    user_id: int,
    action: str,
    context: Optional[str] = None,
    user_input: Optional[str] = None,
    agent_response: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None
):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO AgentMemory (userId, blockId, action, context, userInput, agentResponse, metadata, timestamp)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            user_id,
            "2",  # Block 2 - Strategy Assignment Engine
            action,
            context,
            user_input,
            agent_response,
            json.dumps(metadata) if metadata else None,
            datetime.now().isoformat()
        ))
        
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"Failed to log to Agent Memory: {e}")

# Default strategy configurations
DEFAULT_STRATEGIES = [
    {
        "id": "conservative_growth",
        "name": "Conservative Growth",
        "description": "Low-risk strategy focused on capital preservation with modest growth",
        "assetClasses": ["equity", "bond", "fund"],
        "riskLevel": "conservative",
        "expectedReturn": 0.06,
        "maxDrawdown": 0.10,
        "rebalanceFrequency": "quarterly",
        "isActive": True
    },
    {
        "id": "balanced_portfolio",
        "name": "Balanced Portfolio",
        "description": "Moderate risk strategy balancing growth and income",
        "assetClasses": ["equity", "bond", "fund"],
        "riskLevel": "moderate",
        "expectedReturn": 0.08,
        "maxDrawdown": 0.15,
        "rebalanceFrequency": "monthly",
        "isActive": True
    },
    {
        "id": "aggressive_growth",
        "name": "Aggressive Growth",
        "description": "High-risk strategy targeting maximum capital appreciation",
        "assetClasses": ["equity", "crypto"],
        "riskLevel": "aggressive",
        "expectedReturn": 0.12,
        "maxDrawdown": 0.25,
        "rebalanceFrequency": "weekly",
        "isActive": True
    },
    {
        "id": "crypto_focused",
        "name": "Crypto Focused",
        "description": "Cryptocurrency-focused strategy for digital assets",
        "assetClasses": ["crypto"],
        "riskLevel": "aggressive",
        "expectedReturn": 0.20,
        "maxDrawdown": 0.40,
        "rebalanceFrequency": "daily",
        "isActive": True
    },
    {
        "id": "income_generation",
        "name": "Income Generation",
        "description": "Focus on dividend-paying stocks and bonds for regular income",
        "assetClasses": ["equity", "bond"],
        "riskLevel": "conservative",
        "expectedReturn": 0.05,
        "maxDrawdown": 0.08,
        "rebalanceFrequency": "quarterly",
        "isActive": True
    }
]

# Default assignment rules
DEFAULT_ASSIGNMENT_RULES = {
    "id": "default_rules",
    "name": "Default Assignment Rules",
    "assetClassRules": {
        "equity": "balanced_portfolio",
        "crypto": "crypto_focused",
        "bond": "income_generation",
        "fund": "balanced_portfolio",
        "cash": "conservative_growth"
    },
    "symbolRules": {
        "BTC": "crypto_focused",
        "ETH": "crypto_focused",
        "AAPL": "aggressive_growth",
        "MSFT": "balanced_portfolio",
        "GOOGL": "aggressive_growth",
        "TSLA": "aggressive_growth"
    },
    "defaultStrategy": "balanced_portfolio",
    "isActive": True
}

# Get strategy by ID
async def get_strategy_config(strategy_id: str) -> Optional[StrategyConfig]:
    try:
        strategy_data = next((s for s in DEFAULT_STRATEGIES if s["id"] == strategy_id), None)
        if strategy_data:
            return StrategyConfig(**strategy_data)
        return None
    except Exception as e:
        print(f"Error getting strategy config: {e}")
        return None

# Assign strategy to position
async def assign_strategy_to_position(user_id: int, position_id: int, symbol: str, asset_class: str) -> StrategyAssignment:
    try:
        # Get assignment rules
        rules = DEFAULT_ASSIGNMENT_RULES
        
        # Determine strategy based on rules
        strategy_id = None
        reason = ""
        
        # Check symbol-specific rules first
        if symbol.upper() in rules["symbolRules"]:
            strategy_id = rules["symbolRules"][symbol.upper()]
            reason = f"Symbol-specific rule for {symbol}"
        
        # Check asset class rules
        elif asset_class in rules["assetClassRules"]:
            strategy_id = rules["assetClassRules"][asset_class]
            reason = f"Asset class rule for {asset_class}"
        
        # Use default strategy
        else:
            strategy_id = rules["defaultStrategy"]
            reason = "Default strategy assignment"
        
        # Get strategy config
        strategy_config = await get_strategy_config(strategy_id)
        if not strategy_config:
            strategy_id = rules["defaultStrategy"]
            strategy_config = await get_strategy_config(strategy_id)
            reason = "Fallback to default strategy"
        
        # Calculate confidence based on rule type
        confidence = 0.9 if symbol.upper() in rules["symbolRules"] else 0.7
        
        # Create assignment
        assignment = StrategyAssignment(
            positionId=position_id,
            strategyId=strategy_id,
            strategyName=strategy_config.name,
            confidence=confidence,
            reason=reason,
            assignedAt=datetime.now().isoformat(),
            metadata={
                "symbol": symbol,
                "assetClass": asset_class,
                "riskLevel": strategy_config.riskLevel,
                "expectedReturn": strategy_config.expectedReturn
            }
        )
        
        # Save assignment to database
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Create strategy assignments table if it doesn't exist
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS StrategyAssignment (
                id SERIAL PRIMARY KEY,
                userId INTEGER NOT NULL,
                positionId INTEGER NOT NULL,
                strategyId TEXT NOT NULL,
                strategyName TEXT NOT NULL,
                confidence REAL NOT NULL,
                reason TEXT NOT NULL,
                assignedAt TEXT NOT NULL,
                metadata TEXT,
                createdAt TEXT NOT NULL,
                FOREIGN KEY (userId) REFERENCES User(id),
                FOREIGN KEY (positionId) REFERENCES PortfolioPosition(id)
            )
        """)
        
        # Insert or update assignment
        cursor.execute("""
            INSERT INTO StrategyAssignment 
            (userId, positionId, strategyId, strategyName, confidence, reason, assignedAt, metadata, createdAt)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (userId, positionId) DO UPDATE SET
                strategyId = EXCLUDED.strategyId,
                strategyName = EXCLUDED.strategyName,
                confidence = EXCLUDED.confidence,
                reason = EXCLUDED.reason,
                assignedAt = EXCLUDED.assignedAt,
                metadata = EXCLUDED.metadata
        """, (
            user_id,
            position_id,
            assignment.strategyId,
            assignment.strategyName,
            assignment.confidence,
            assignment.reason,
            assignment.assignedAt,
            json.dumps(assignment.metadata) if assignment.metadata else None,
            datetime.now().isoformat()
        ))
        
        conn.commit()
        conn.close()
        
        return assignment
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to assign strategy: {str(e)}")

@router.post("/strategy/assign/{user_id}")
async def auto_assign_strategies(user_id: int):
    """Auto-assign strategies to all user's portfolio positions"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get all portfolio positions for user
        cursor.execute("""
            SELECT id, symbol, assetClass FROM PortfolioPosition 
            WHERE userId = %s
        """, (user_id,))
        
        positions = cursor.fetchall()
        conn.close()
        
        if not positions:
            await log_to_agent_memory(
                user_id,
                "auto_assign_strategies_no_positions",
                "Auto-assignment attempted but no positions found",
                None,
                "No portfolio positions found for strategy assignment",
                {"positionCount": 0}
            )
            
            return {
                "success": True,
                "message": "No positions found for strategy assignment",
                "assignments": []
            }
        
        assignments = []
        
        for position in positions:
            position_id, symbol, asset_class = position
            
            try:
                assignment = await assign_strategy_to_position(
                    user_id, position_id, symbol, asset_class
                )
                assignments.append(assignment.dict())
                
            except Exception as e:
                print(f"Failed to assign strategy to position {position_id}: {e}")
        
        await log_to_agent_memory(
            user_id,
            "auto_assign_strategies_completed",
            "Auto-assigned strategies to portfolio positions",
            None,
            f"Assigned strategies to {len(assignments)} positions",
            {
                "totalPositions": len(positions),
                "successfulAssignments": len(assignments),
                "strategies": list(set(a["strategyId"] for a in assignments))
            }
        )
        
        return {
            "success": True,
            "message": f"Assigned strategies to {len(assignments)} positions",
            "assignments": assignments
        }
        
    except Exception as e:
        await log_to_agent_memory(
            user_id,
            "auto_assign_strategies_failed",
            "Auto-assignment of strategies failed",
            None,
            str(e),
            {"error": str(e)}
        )
        
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/strategy/assignments/{user_id}")
async def get_strategy_assignments(user_id: int):
    """Get all strategy assignments for a user"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT sa.*, pp.symbol, pp.name, pp.quantity, pp.assetClass
            FROM StrategyAssignment sa
            JOIN PortfolioPosition pp ON sa.positionId = pp.id
            WHERE sa.userId = %s
            ORDER BY sa.assignedAt DESC
        """, (user_id,))
        
        columns = [description[0] for description in cursor.description]
        assignments = [dict(zip(columns, row)) for row in cursor.fetchall()]
        
        conn.close()
        
        # Parse metadata JSON
        for assignment in assignments:
            if assignment['metadata']:
                assignment['metadata'] = json.loads(assignment['metadata'])
        
        return {"assignments": assignments}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/strategy/configs")
async def get_strategy_configs():
    """Get all available strategy configurations"""
    try:
        strategies = [StrategyConfig(**strategy) for strategy in DEFAULT_STRATEGIES]
        return {"strategies": [s.dict() for s in strategies]}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/strategy/assign/{assignment_id}")
async def update_strategy_assignment(assignment_id: int, strategy_id: str, user_id: int):
    """Manually update a strategy assignment"""
    try:
        # Get strategy config
        strategy_config = await get_strategy_config(strategy_id)
        if not strategy_config:
            raise HTTPException(status_code=404, detail="Strategy not found")
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Update assignment
        cursor.execute("""
            UPDATE StrategyAssignment 
            SET strategyId = %s, strategyName = %s, reason = %s, assignedAt = %s, confidence = %s
            WHERE id = %s AND userId = %s
        """, (
            strategy_id,
            strategy_config.name,
            "Manual assignment",
            datetime.now().isoformat(),
            1.0,  # Manual assignments have full confidence
            assignment_id,
            user_id
        ))
        
        if cursor.rowcount == 0:
            conn.close()
            raise HTTPException(status_code=404, detail="Assignment not found")
        
        conn.commit()
        conn.close()
        
        await log_to_agent_memory(
            user_id,
            "strategy_assignment_updated",
            "User manually updated strategy assignment",
            f"Assignment {assignment_id} changed to {strategy_id}",
            f"Updated to {strategy_config.name} strategy",
            {"assignmentId": assignment_id, "newStrategyId": strategy_id}
        )
        
        return {
            "success": True,
            "message": f"Assignment updated to {strategy_config.name}"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/strategy/assign/{assignment_id}")
async def delete_strategy_assignment(assignment_id: int, user_id: int):
    """Delete a strategy assignment"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get assignment before deleting
        cursor.execute("""
            SELECT strategyName, positionId FROM StrategyAssignment 
            WHERE id = %s AND userId = %s
        """, (assignment_id, user_id))
        
        assignment = cursor.fetchone()
        if not assignment:
            conn.close()
            raise HTTPException(status_code=404, detail="Assignment not found")
        
        strategy_name, position_id = assignment
        
        # Delete assignment
        cursor.execute("""
            DELETE FROM StrategyAssignment 
            WHERE id = %s AND userId = %s
        """, (assignment_id, user_id))
        
        conn.commit()
        conn.close()
        
        await log_to_agent_memory(
            user_id,
            "strategy_assignment_deleted",
            "User deleted strategy assignment",
            None,
            f"Deleted {strategy_name} assignment for position {position_id}",
            {"assignmentId": assignment_id, "positionId": position_id}
        )
        
        return {
            "success": True,
            "message": "Strategy assignment deleted"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/strategy/rules")
async def get_assignment_rules():
    """Get current strategy assignment rules"""
    try:
        return {"rules": DEFAULT_ASSIGNMENT_RULES}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))        