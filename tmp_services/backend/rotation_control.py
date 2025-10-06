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

# Block 48: Rotation Aggression Control - API Routes
# User rotation preferences and risk tolerance management

class RotationPreferences(BaseModel):
    rotation_aggression_level: int = 5  # 1-10 scale
    rotation_frequency: str = "monthly"  # daily, weekly, biweekly, monthly, quarterly, manual
    max_rotation_percentage: float = 20.0  # Max % of portfolio to rotate
    min_rotation_threshold: float = 5.0   # Min threshold to trigger rotation
    risk_tolerance: str = "moderate"      # conservative, moderate, aggressive, very_aggressive
    volatility_tolerance: float = 15.0    # Max volatility tolerance %
    drawdown_tolerance: float = 10.0      # Max drawdown tolerance %
    auto_rebalance_enabled: bool = True
    rebalance_trigger_threshold: float = 5.0
    max_single_trade_size: float = 10.0
    cash_buffer_percentage: float = 2.0
    strategy_rotation_enabled: bool = True
    max_active_strategies: int = 3
    tax_loss_harvesting_enabled: bool = True
    tax_optimization_priority: int = 5
    nz_tax_optimization: bool = True
    franking_credits_consideration: bool = True
    currency_hedging_preference: str = "auto"
    
    @validator('rotation_aggression_level')
    def validate_aggression_level(cls, v):
        if not 1 <= v <= 10:
            raise ValueError('Rotation aggression level must be between 1 and 10')
        return v
    
    @validator('rotation_frequency')
    def validate_frequency(cls, v):
        allowed_frequencies = ['daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'manual']
        if v not in allowed_frequencies:
            raise ValueError(f'Rotation frequency must be one of: {", ".join(allowed_frequencies)}')
        return v
    
    @validator('risk_tolerance')
    def validate_risk_tolerance(cls, v):
        allowed_risk_levels = ['conservative', 'moderate', 'aggressive', 'very_aggressive']
        if v not in allowed_risk_levels:
            raise ValueError(f'Risk tolerance must be one of: {", ".join(allowed_risk_levels)}')
        return v

class RotationEvent(BaseModel):
    rotation_type: str  # automatic, manual, triggered, scheduled
    aggression_level: int
    assets_rotated: int
    total_rotation_amount: float
    expected_return_improvement: Optional[float] = 0
    risk_reduction_achieved: Optional[float] = 0
    transaction_costs: Optional[float] = 0
    tax_impact: Optional[float] = 0
    market_volatility: Optional[float] = 0
    market_trend: Optional[str] = None
    rotation_trigger: Optional[str] = None
    rotation_data: Optional[Dict[str, Any]] = {}

class RotationRecommendation(BaseModel):
    recommended_aggression_level: int
    rotation_actions: List[Dict[str, Any]]
    expected_impact: Dict[str, float]
    risk_assessment: Dict[str, float]
    tax_implications: Dict[str, float]
    market_context: Dict[str, Any]

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
            "block_48",
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

@router.get("/rotation/preferences/{user_id}")
async def get_rotation_preferences(user_id: int):
    """Get user rotation preferences"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Create rotation preferences table if it doesn't exist
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS UserRotationPreferences (
                id SERIAL PRIMARY KEY,
                userId INTEGER NOT NULL,
                rotation_aggression_level INTEGER NOT NULL DEFAULT 5,
                rotation_frequency TEXT NOT NULL DEFAULT 'monthly',
                max_rotation_percentage REAL NOT NULL DEFAULT 20.0,
                min_rotation_threshold REAL NOT NULL DEFAULT 5.0,
                risk_tolerance TEXT NOT NULL DEFAULT 'moderate',
                volatility_tolerance REAL NOT NULL DEFAULT 15.0,
                drawdown_tolerance REAL NOT NULL DEFAULT 10.0,
                auto_rebalance_enabled BOOLEAN NOT NULL DEFAULT true,
                rebalance_trigger_threshold REAL NOT NULL DEFAULT 5.0,
                max_single_trade_size REAL NOT NULL DEFAULT 10.0,
                cash_buffer_percentage REAL NOT NULL DEFAULT 2.0,
                strategy_rotation_enabled BOOLEAN NOT NULL DEFAULT true,
                max_active_strategies INTEGER NOT NULL DEFAULT 3,
                tax_loss_harvesting_enabled BOOLEAN NOT NULL DEFAULT true,
                tax_optimization_priority INTEGER NOT NULL DEFAULT 5,
                nz_tax_optimization BOOLEAN NOT NULL DEFAULT true,
                franking_credits_consideration BOOLEAN NOT NULL DEFAULT true,
                currency_hedging_preference TEXT NOT NULL DEFAULT 'auto',
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW(),
                last_applied_at TIMESTAMPTZ,
                UNIQUE(userId)
            )
        """)
        
        # Get user preferences
        cursor.execute("""
            SELECT * FROM UserRotationPreferences WHERE userId = %s
        """, (user_id,))
        
        result = cursor.fetchone()
        
        if not result:
            # Create default preferences
            default_preferences = RotationPreferences()
            cursor.execute("""
                INSERT INTO UserRotationPreferences 
                (userId, rotation_aggression_level, rotation_frequency, max_rotation_percentage, 
                 min_rotation_threshold, risk_tolerance, volatility_tolerance, drawdown_tolerance,
                 auto_rebalance_enabled, rebalance_trigger_threshold, max_single_trade_size,
                 cash_buffer_percentage, strategy_rotation_enabled, max_active_strategies,
                 tax_loss_harvesting_enabled, tax_optimization_priority, nz_tax_optimization,
                 franking_credits_consideration, currency_hedging_preference)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                user_id,
                default_preferences.rotation_aggression_level,
                default_preferences.rotation_frequency,
                default_preferences.max_rotation_percentage,
                default_preferences.min_rotation_threshold,
                default_preferences.risk_tolerance,
                default_preferences.volatility_tolerance,
                default_preferences.drawdown_tolerance,
                default_preferences.auto_rebalance_enabled,
                default_preferences.rebalance_trigger_threshold,
                default_preferences.max_single_trade_size,
                default_preferences.cash_buffer_percentage,
                default_preferences.strategy_rotation_enabled,
                default_preferences.max_active_strategies,
                default_preferences.tax_loss_harvesting_enabled,
                default_preferences.tax_optimization_priority,
                default_preferences.nz_tax_optimization,
                default_preferences.franking_credits_consideration,
                default_preferences.currency_hedging_preference
            ))
            
            conn.commit()
            
            # Fetch the created preferences
            cursor.execute("""
                SELECT * FROM UserRotationPreferences WHERE userId = %s
            """, (user_id,))
            result = cursor.fetchone()
        
        columns = [description[0] for description in cursor.description]
        preference_data = dict(zip(columns, result))
        
        conn.close()
        
        preferences = RotationPreferences(
            rotation_aggression_level=preference_data['rotation_aggression_level'],
            rotation_frequency=preference_data['rotation_frequency'],
            max_rotation_percentage=preference_data['max_rotation_percentage'],
            min_rotation_threshold=preference_data['min_rotation_threshold'],
            risk_tolerance=preference_data['risk_tolerance'],
            volatility_tolerance=preference_data['volatility_tolerance'],
            drawdown_tolerance=preference_data['drawdown_tolerance'],
            auto_rebalance_enabled=bool(preference_data['auto_rebalance_enabled']),
            rebalance_trigger_threshold=preference_data['rebalance_trigger_threshold'],
            max_single_trade_size=preference_data['max_single_trade_size'],
            cash_buffer_percentage=preference_data['cash_buffer_percentage'],
            strategy_rotation_enabled=bool(preference_data['strategy_rotation_enabled']),
            max_active_strategies=preference_data['max_active_strategies'],
            tax_loss_harvesting_enabled=bool(preference_data['tax_loss_harvesting_enabled']),
            tax_optimization_priority=preference_data['tax_optimization_priority'],
            nz_tax_optimization=bool(preference_data['nz_tax_optimization']),
            franking_credits_consideration=bool(preference_data['franking_credits_consideration']),
            currency_hedging_preference=preference_data['currency_hedging_preference']
        )
        
        await log_to_agent_memory(
            user_id,
            "rotation_preferences_retrieved",
            f"Retrieved rotation preferences for user",
            None,
            f"Aggression level: {preferences.rotation_aggression_level}, Risk: {preferences.risk_tolerance}",
            {
                "aggression_level": preferences.rotation_aggression_level,
                "risk_tolerance": preferences.risk_tolerance,
                "rotation_frequency": preferences.rotation_frequency
            }
        )
        
        return {
            "id": str(preference_data['id']),
            "user_id": user_id,
            "preferences": preferences.dict(),
            "created_at": preference_data['created_at'],
            "updated_at": preference_data['updated_at'],
            "last_applied_at": preference_data['last_applied_at']
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/rotation/preferences/{user_id}")
async def update_rotation_preferences(user_id: int, preferences: RotationPreferences):
    """Update user rotation preferences"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Update preferences
        cursor.execute("""
            UPDATE UserRotationPreferences 
            SET rotation_aggression_level = %s, rotation_frequency = %s, 
                max_rotation_percentage = %s, min_rotation_threshold = %s,
                risk_tolerance = %s, volatility_tolerance = %s, drawdown_tolerance = %s,
                auto_rebalance_enabled = %s, rebalance_trigger_threshold = %s,
                max_single_trade_size = %s, cash_buffer_percentage = %s,
                strategy_rotation_enabled = %s, max_active_strategies = %s,
                tax_loss_harvesting_enabled = %s, tax_optimization_priority = %s,
                nz_tax_optimization = %s, franking_credits_consideration = %s,
                currency_hedging_preference = %s, updated_at = %s, last_applied_at = %s
            WHERE userId = %s
        """, (
            preferences.rotation_aggression_level,
            preferences.rotation_frequency,
            preferences.max_rotation_percentage,
            preferences.min_rotation_threshold,
            preferences.risk_tolerance,
            preferences.volatility_tolerance,
            preferences.drawdown_tolerance,
            preferences.auto_rebalance_enabled,
            preferences.rebalance_trigger_threshold,
            preferences.max_single_trade_size,
            preferences.cash_buffer_percentage,
            preferences.strategy_rotation_enabled,
            preferences.max_active_strategies,
            preferences.tax_loss_harvesting_enabled,
            preferences.tax_optimization_priority,
            preferences.nz_tax_optimization,
            preferences.franking_credits_consideration,
            preferences.currency_hedging_preference,
            datetime.now().isoformat(),
            datetime.now().isoformat(),
            user_id
        ))
        
        if cursor.rowcount == 0:
            # Create new preferences if none exist
            cursor.execute("""
                INSERT INTO UserRotationPreferences 
                (userId, rotation_aggression_level, rotation_frequency, max_rotation_percentage, 
                 min_rotation_threshold, risk_tolerance, volatility_tolerance, drawdown_tolerance,
                 auto_rebalance_enabled, rebalance_trigger_threshold, max_single_trade_size,
                 cash_buffer_percentage, strategy_rotation_enabled, max_active_strategies,
                 tax_loss_harvesting_enabled, tax_optimization_priority, nz_tax_optimization,
                 franking_credits_consideration, currency_hedging_preference)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                user_id,
                preferences.rotation_aggression_level,
                preferences.rotation_frequency,
                preferences.max_rotation_percentage,
                preferences.min_rotation_threshold,
                preferences.risk_tolerance,
                preferences.volatility_tolerance,
                preferences.drawdown_tolerance,
                preferences.auto_rebalance_enabled,
                preferences.rebalance_trigger_threshold,
                preferences.max_single_trade_size,
                preferences.cash_buffer_percentage,
                preferences.strategy_rotation_enabled,
                preferences.max_active_strategies,
                preferences.tax_loss_harvesting_enabled,
                preferences.tax_optimization_priority,
                preferences.nz_tax_optimization,
                preferences.franking_credits_consideration,
                preferences.currency_hedging_preference
            ))
        
        conn.commit()
        conn.close()
        
        await log_to_agent_memory(
            user_id,
            "rotation_preferences_updated",
            f"Updated rotation preferences",
            preferences.json(),
            f"Aggression level set to {preferences.rotation_aggression_level}",
            {
                "aggression_level": preferences.rotation_aggression_level,
                "risk_tolerance": preferences.risk_tolerance,
                "max_rotation_percentage": preferences.max_rotation_percentage
            }
        )
        
        return {
            "success": True,
            "message": "Rotation preferences updated successfully",
            "preferences": preferences.dict()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/rotation/recommend/{user_id}")
async def get_rotation_recommendation(user_id: int, portfolio_data: Dict[str, Any]):
    """Get rotation recommendation based on current portfolio and preferences"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get user preferences
        cursor.execute("""
            SELECT * FROM UserRotationPreferences WHERE userId = %s
        """, (user_id,))
        
        prefs = cursor.fetchone()
        if not prefs:
            raise HTTPException(status_code=404, detail="User rotation preferences not found")
        
        columns = [description[0] for description in cursor.description]
        preference_data = dict(zip(columns, prefs))
        
        # Simple rotation recommendation logic
        # In production, this would be much more sophisticated
        aggression_level = preference_data['rotation_aggression_level']
        max_rotation = preference_data['max_rotation_percentage']
        risk_tolerance = preference_data['risk_tolerance']
        
        # Calculate recommended actions based on portfolio data
        total_value = portfolio_data.get('total_value', 0)
        current_allocation = portfolio_data.get('allocation', {})
        
        rotation_actions = []
        expected_impact = {
            "return_improvement": aggression_level * 0.5,
            "risk_reduction": (10 - aggression_level) * 0.3,
            "transaction_costs": aggression_level * 0.1 * total_value / 100
        }
        
        risk_assessment = {
            "volatility_increase": aggression_level * 0.2,
            "max_drawdown_risk": aggression_level * 0.15,
            "correlation_risk": aggression_level * 0.1
        }
        
        tax_implications = {
            "capital_gains_tax": expected_impact["transaction_costs"] * 0.33,
            "wash_sale_risk": 0.05 if preference_data['tax_loss_harvesting_enabled'] else 0,
            "tax_optimization_benefit": preference_data['tax_optimization_priority'] * 0.1
        }
        
        # Generate rotation actions
        for asset, allocation in current_allocation.items():
            if allocation > max_rotation:
                rotation_actions.append({
                    "action": "reduce",
                    "asset": asset,
                    "current_allocation": allocation,
                    "target_allocation": max_rotation,
                    "rotation_amount": allocation - max_rotation
                })
        
        market_context = {
            "market_trend": "neutral",
            "volatility_level": "moderate",
            "recommended_timing": "immediate" if aggression_level > 7 else "gradual"
        }
        
        conn.close()
        
        recommendation = RotationRecommendation(
            recommended_aggression_level=aggression_level,
            rotation_actions=rotation_actions,
            expected_impact=expected_impact,
            risk_assessment=risk_assessment,
            tax_implications=tax_implications,
            market_context=market_context
        )
        
        await log_to_agent_memory(
            user_id,
            "rotation_recommendation_generated",
            f"Generated rotation recommendation",
            json.dumps(portfolio_data),
            f"Recommended {len(rotation_actions)} rotation actions",
            {
                "aggression_level": aggression_level,
                "actions_count": len(rotation_actions),
                "expected_return": expected_impact["return_improvement"]
            }
        )
        
        return {
            "recommendation": recommendation.dict(),
            "user_id": user_id,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/rotation/execute/{user_id}")
async def execute_rotation(user_id: int, rotation_event: RotationEvent):
    """Log rotation execution and update history"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Create rotation history table if it doesn't exist
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS RotationHistory (
                id SERIAL PRIMARY KEY,
                userId INTEGER NOT NULL,
                rotation_date TIMESTAMPTZ DEFAULT NOW(),
                rotation_type TEXT NOT NULL,
                aggression_level INTEGER NOT NULL,
                assets_rotated INTEGER NOT NULL DEFAULT 0,
                total_rotation_amount REAL NOT NULL DEFAULT 0,
                expected_return_improvement REAL DEFAULT 0,
                risk_reduction_achieved REAL DEFAULT 0,
                transaction_costs REAL DEFAULT 0,
                tax_impact REAL DEFAULT 0,
                market_volatility REAL DEFAULT 0,
                market_trend TEXT,
                rotation_trigger TEXT,
                rotation_data TEXT DEFAULT '{}',
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        """)
        
        # Insert rotation event
        cursor.execute("""
            INSERT INTO RotationHistory 
            (userId, rotation_type, aggression_level, assets_rotated, total_rotation_amount,
             expected_return_improvement, risk_reduction_achieved, transaction_costs,
             tax_impact, market_volatility, market_trend, rotation_trigger, rotation_data)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            user_id,
            rotation_event.rotation_type,
            rotation_event.aggression_level,
            rotation_event.assets_rotated,
            rotation_event.total_rotation_amount,
            rotation_event.expected_return_improvement or 0,
            rotation_event.risk_reduction_achieved or 0,
            rotation_event.transaction_costs or 0,
            rotation_event.tax_impact or 0,
            rotation_event.market_volatility or 0,
            rotation_event.market_trend,
            rotation_event.rotation_trigger,
            json.dumps(rotation_event.rotation_data or {})
        ))
        
        rotation_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        await log_to_agent_memory(
            user_id,
            "rotation_executed",
            f"Executed {rotation_event.rotation_type} rotation",
            rotation_event.json(),
            f"Rotation completed with ID {rotation_id}",
            {
                "rotation_id": rotation_id,
                "rotation_type": rotation_event.rotation_type,
                "aggression_level": rotation_event.aggression_level,
                "assets_rotated": rotation_event.assets_rotated,
                "total_amount": rotation_event.total_rotation_amount
            }
        )
        
        return {
            "success": True,
            "rotation_id": rotation_id,
            "message": f"Rotation executed successfully",
            "rotation_details": rotation_event.dict()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/rotation/history/{user_id}")
async def get_rotation_history(
    user_id: int,
    limit: int = Query(50, le=500),
    rotation_type: Optional[str] = Query(None)
):
    """Get rotation history for a user"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Build query with optional filters
        query = "SELECT * FROM RotationHistory WHERE userId = %s"
        params = [user_id]
        
        if rotation_type:
            query += " AND rotation_type = %s"
            params.append(rotation_type)
        
        query += " ORDER BY rotation_date DESC LIMIT %s"
        params.append(limit)
        
        cursor.execute(query, params)
        
        columns = [description[0] for description in cursor.description]
        history = []
        
        for row in cursor.fetchall():
            history_data = dict(zip(columns, row))
            # Parse rotation data JSON
            try:
                history_data['rotation_data'] = json.loads(history_data['rotation_data'] or '{}')
            except:
                history_data['rotation_data'] = {}
            history.append(history_data)
        
        conn.close()
        
        return {
            "history": history,
            "count": len(history),
            "user_id": user_id,
            "rotation_type": rotation_type
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/rotation/performance/{user_id}")
async def get_rotation_performance(user_id: int, period: str = Query("30d")):
    """Get rotation performance metrics"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Calculate period start date
        period_map = {"7d": 7, "30d": 30, "90d": 90, "1y": 365}
        days = period_map.get(period, 30)
        start_date = (datetime.now() - timedelta(days=days)).isoformat()
        
        # Get performance metrics
        cursor.execute("""
            SELECT 
                COUNT(*) as total_rotations,
                AVG(expected_return_improvement) as avg_return_improvement,
                AVG(risk_reduction_achieved) as avg_risk_reduction,
                SUM(transaction_costs) as total_transaction_costs,
                SUM(tax_impact) as total_tax_impact,
                SUM(total_rotation_amount) as total_rotation_amount,
                AVG(aggression_level) as avg_aggression_level,
                MIN(rotation_date) as first_rotation,
                MAX(rotation_date) as last_rotation
            FROM RotationHistory 
            WHERE userId = %s AND rotation_date >= %s
        """, (user_id, start_date))
        
        result = cursor.fetchone()
        columns = [description[0] for description in cursor.description]
        performance_data = dict(zip(columns, result)) if result else {}
        
        # Calculate success rate (simplified)
        cursor.execute("""
            SELECT 
                COUNT(*) as successful_rotations
            FROM RotationHistory 
            WHERE userId = %s AND rotation_date >= %s AND expected_return_improvement > 0
        """, (user_id, start_date))
        
        successful = cursor.fetchone()[0] or 0
        total = performance_data.get('total_rotations', 0) or 1
        success_rate = (successful / total) * 100 if total > 0 else 0
        
        conn.close()
        
        return {
            "performance": {
                **performance_data,
                "success_rate": success_rate,
                "cost_per_rotation": performance_data.get('total_transaction_costs', 0) / total if total > 0 else 0
            },
            "period": period,
            "user_id": user_id
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 
from pydantic import BaseModel, validator
from typing import Optional, List, Dict, Any
import json
from datetime import datetime, timedelta
import psycopg2
from psycopg2.extras import RealDictCursor
import os
from decimal import Decimal

router = APIRouter()

# Block 48: Rotation Aggression Control - API Routes
# User rotation preferences and risk tolerance management

class RotationPreferences(BaseModel):
    rotation_aggression_level: int = 5  # 1-10 scale
    rotation_frequency: str = "monthly"  # daily, weekly, biweekly, monthly, quarterly, manual
    max_rotation_percentage: float = 20.0  # Max % of portfolio to rotate
    min_rotation_threshold: float = 5.0   # Min threshold to trigger rotation
    risk_tolerance: str = "moderate"      # conservative, moderate, aggressive, very_aggressive
    volatility_tolerance: float = 15.0    # Max volatility tolerance %
    drawdown_tolerance: float = 10.0      # Max drawdown tolerance %
    auto_rebalance_enabled: bool = True
    rebalance_trigger_threshold: float = 5.0
    max_single_trade_size: float = 10.0
    cash_buffer_percentage: float = 2.0
    strategy_rotation_enabled: bool = True
    max_active_strategies: int = 3
    tax_loss_harvesting_enabled: bool = True
    tax_optimization_priority: int = 5
    nz_tax_optimization: bool = True
    franking_credits_consideration: bool = True
    currency_hedging_preference: str = "auto"
    
    @validator('rotation_aggression_level')
    def validate_aggression_level(cls, v):
        if not 1 <= v <= 10:
            raise ValueError('Rotation aggression level must be between 1 and 10')
        return v
    
    @validator('rotation_frequency')
    def validate_frequency(cls, v):
        allowed_frequencies = ['daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'manual']
        if v not in allowed_frequencies:
            raise ValueError(f'Rotation frequency must be one of: {", ".join(allowed_frequencies)}')
        return v
    
    @validator('risk_tolerance')
    def validate_risk_tolerance(cls, v):
        allowed_risk_levels = ['conservative', 'moderate', 'aggressive', 'very_aggressive']
        if v not in allowed_risk_levels:
            raise ValueError(f'Risk tolerance must be one of: {", ".join(allowed_risk_levels)}')
        return v

class RotationEvent(BaseModel):
    rotation_type: str  # automatic, manual, triggered, scheduled
    aggression_level: int
    assets_rotated: int
    total_rotation_amount: float
    expected_return_improvement: Optional[float] = 0
    risk_reduction_achieved: Optional[float] = 0
    transaction_costs: Optional[float] = 0
    tax_impact: Optional[float] = 0
    market_volatility: Optional[float] = 0
    market_trend: Optional[str] = None
    rotation_trigger: Optional[str] = None
    rotation_data: Optional[Dict[str, Any]] = {}

class RotationRecommendation(BaseModel):
    recommended_aggression_level: int
    rotation_actions: List[Dict[str, Any]]
    expected_impact: Dict[str, float]
    risk_assessment: Dict[str, float]
    tax_implications: Dict[str, float]
    market_context: Dict[str, Any]

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
            "block_48",
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

@router.get("/rotation/preferences/{user_id}")
async def get_rotation_preferences(user_id: int):
    """Get user rotation preferences"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Create rotation preferences table if it doesn't exist
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS UserRotationPreferences (
                id SERIAL PRIMARY KEY,
                userId INTEGER NOT NULL,
                rotation_aggression_level INTEGER NOT NULL DEFAULT 5,
                rotation_frequency TEXT NOT NULL DEFAULT 'monthly',
                max_rotation_percentage REAL NOT NULL DEFAULT 20.0,
                min_rotation_threshold REAL NOT NULL DEFAULT 5.0,
                risk_tolerance TEXT NOT NULL DEFAULT 'moderate',
                volatility_tolerance REAL NOT NULL DEFAULT 15.0,
                drawdown_tolerance REAL NOT NULL DEFAULT 10.0,
                auto_rebalance_enabled BOOLEAN NOT NULL DEFAULT true,
                rebalance_trigger_threshold REAL NOT NULL DEFAULT 5.0,
                max_single_trade_size REAL NOT NULL DEFAULT 10.0,
                cash_buffer_percentage REAL NOT NULL DEFAULT 2.0,
                strategy_rotation_enabled BOOLEAN NOT NULL DEFAULT true,
                max_active_strategies INTEGER NOT NULL DEFAULT 3,
                tax_loss_harvesting_enabled BOOLEAN NOT NULL DEFAULT true,
                tax_optimization_priority INTEGER NOT NULL DEFAULT 5,
                nz_tax_optimization BOOLEAN NOT NULL DEFAULT true,
                franking_credits_consideration BOOLEAN NOT NULL DEFAULT true,
                currency_hedging_preference TEXT NOT NULL DEFAULT 'auto',
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW(),
                last_applied_at TIMESTAMPTZ,
                UNIQUE(userId)
            )
        """)
        
        # Get user preferences
        cursor.execute("""
            SELECT * FROM UserRotationPreferences WHERE userId = %s
        """, (user_id,))
        
        result = cursor.fetchone()
        
        if not result:
            # Create default preferences
            default_preferences = RotationPreferences()
            cursor.execute("""
                INSERT INTO UserRotationPreferences 
                (userId, rotation_aggression_level, rotation_frequency, max_rotation_percentage, 
                 min_rotation_threshold, risk_tolerance, volatility_tolerance, drawdown_tolerance,
                 auto_rebalance_enabled, rebalance_trigger_threshold, max_single_trade_size,
                 cash_buffer_percentage, strategy_rotation_enabled, max_active_strategies,
                 tax_loss_harvesting_enabled, tax_optimization_priority, nz_tax_optimization,
                 franking_credits_consideration, currency_hedging_preference)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                user_id,
                default_preferences.rotation_aggression_level,
                default_preferences.rotation_frequency,
                default_preferences.max_rotation_percentage,
                default_preferences.min_rotation_threshold,
                default_preferences.risk_tolerance,
                default_preferences.volatility_tolerance,
                default_preferences.drawdown_tolerance,
                default_preferences.auto_rebalance_enabled,
                default_preferences.rebalance_trigger_threshold,
                default_preferences.max_single_trade_size,
                default_preferences.cash_buffer_percentage,
                default_preferences.strategy_rotation_enabled,
                default_preferences.max_active_strategies,
                default_preferences.tax_loss_harvesting_enabled,
                default_preferences.tax_optimization_priority,
                default_preferences.nz_tax_optimization,
                default_preferences.franking_credits_consideration,
                default_preferences.currency_hedging_preference
            ))
            
            conn.commit()
            
            # Fetch the created preferences
            cursor.execute("""
                SELECT * FROM UserRotationPreferences WHERE userId = %s
            """, (user_id,))
            result = cursor.fetchone()
        
        columns = [description[0] for description in cursor.description]
        preference_data = dict(zip(columns, result))
        
        conn.close()
        
        preferences = RotationPreferences(
            rotation_aggression_level=preference_data['rotation_aggression_level'],
            rotation_frequency=preference_data['rotation_frequency'],
            max_rotation_percentage=preference_data['max_rotation_percentage'],
            min_rotation_threshold=preference_data['min_rotation_threshold'],
            risk_tolerance=preference_data['risk_tolerance'],
            volatility_tolerance=preference_data['volatility_tolerance'],
            drawdown_tolerance=preference_data['drawdown_tolerance'],
            auto_rebalance_enabled=bool(preference_data['auto_rebalance_enabled']),
            rebalance_trigger_threshold=preference_data['rebalance_trigger_threshold'],
            max_single_trade_size=preference_data['max_single_trade_size'],
            cash_buffer_percentage=preference_data['cash_buffer_percentage'],
            strategy_rotation_enabled=bool(preference_data['strategy_rotation_enabled']),
            max_active_strategies=preference_data['max_active_strategies'],
            tax_loss_harvesting_enabled=bool(preference_data['tax_loss_harvesting_enabled']),
            tax_optimization_priority=preference_data['tax_optimization_priority'],
            nz_tax_optimization=bool(preference_data['nz_tax_optimization']),
            franking_credits_consideration=bool(preference_data['franking_credits_consideration']),
            currency_hedging_preference=preference_data['currency_hedging_preference']
        )
        
        await log_to_agent_memory(
            user_id,
            "rotation_preferences_retrieved",
            f"Retrieved rotation preferences for user",
            None,
            f"Aggression level: {preferences.rotation_aggression_level}, Risk: {preferences.risk_tolerance}",
            {
                "aggression_level": preferences.rotation_aggression_level,
                "risk_tolerance": preferences.risk_tolerance,
                "rotation_frequency": preferences.rotation_frequency
            }
        )
        
        return {
            "id": str(preference_data['id']),
            "user_id": user_id,
            "preferences": preferences.dict(),
            "created_at": preference_data['created_at'],
            "updated_at": preference_data['updated_at'],
            "last_applied_at": preference_data['last_applied_at']
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/rotation/preferences/{user_id}")
async def update_rotation_preferences(user_id: int, preferences: RotationPreferences):
    """Update user rotation preferences"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Update preferences
        cursor.execute("""
            UPDATE UserRotationPreferences 
            SET rotation_aggression_level = %s, rotation_frequency = %s, 
                max_rotation_percentage = %s, min_rotation_threshold = %s,
                risk_tolerance = %s, volatility_tolerance = %s, drawdown_tolerance = %s,
                auto_rebalance_enabled = %s, rebalance_trigger_threshold = %s,
                max_single_trade_size = %s, cash_buffer_percentage = %s,
                strategy_rotation_enabled = %s, max_active_strategies = %s,
                tax_loss_harvesting_enabled = %s, tax_optimization_priority = %s,
                nz_tax_optimization = %s, franking_credits_consideration = %s,
                currency_hedging_preference = %s, updated_at = %s, last_applied_at = %s
            WHERE userId = %s
        """, (
            preferences.rotation_aggression_level,
            preferences.rotation_frequency,
            preferences.max_rotation_percentage,
            preferences.min_rotation_threshold,
            preferences.risk_tolerance,
            preferences.volatility_tolerance,
            preferences.drawdown_tolerance,
            preferences.auto_rebalance_enabled,
            preferences.rebalance_trigger_threshold,
            preferences.max_single_trade_size,
            preferences.cash_buffer_percentage,
            preferences.strategy_rotation_enabled,
            preferences.max_active_strategies,
            preferences.tax_loss_harvesting_enabled,
            preferences.tax_optimization_priority,
            preferences.nz_tax_optimization,
            preferences.franking_credits_consideration,
            preferences.currency_hedging_preference,
            datetime.now().isoformat(),
            datetime.now().isoformat(),
            user_id
        ))
        
        if cursor.rowcount == 0:
            # Create new preferences if none exist
            cursor.execute("""
                INSERT INTO UserRotationPreferences 
                (userId, rotation_aggression_level, rotation_frequency, max_rotation_percentage, 
                 min_rotation_threshold, risk_tolerance, volatility_tolerance, drawdown_tolerance,
                 auto_rebalance_enabled, rebalance_trigger_threshold, max_single_trade_size,
                 cash_buffer_percentage, strategy_rotation_enabled, max_active_strategies,
                 tax_loss_harvesting_enabled, tax_optimization_priority, nz_tax_optimization,
                 franking_credits_consideration, currency_hedging_preference)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                user_id,
                preferences.rotation_aggression_level,
                preferences.rotation_frequency,
                preferences.max_rotation_percentage,
                preferences.min_rotation_threshold,
                preferences.risk_tolerance,
                preferences.volatility_tolerance,
                preferences.drawdown_tolerance,
                preferences.auto_rebalance_enabled,
                preferences.rebalance_trigger_threshold,
                preferences.max_single_trade_size,
                preferences.cash_buffer_percentage,
                preferences.strategy_rotation_enabled,
                preferences.max_active_strategies,
                preferences.tax_loss_harvesting_enabled,
                preferences.tax_optimization_priority,
                preferences.nz_tax_optimization,
                preferences.franking_credits_consideration,
                preferences.currency_hedging_preference
            ))
        
        conn.commit()
        conn.close()
        
        await log_to_agent_memory(
            user_id,
            "rotation_preferences_updated",
            f"Updated rotation preferences",
            preferences.json(),
            f"Aggression level set to {preferences.rotation_aggression_level}",
            {
                "aggression_level": preferences.rotation_aggression_level,
                "risk_tolerance": preferences.risk_tolerance,
                "max_rotation_percentage": preferences.max_rotation_percentage
            }
        )
        
        return {
            "success": True,
            "message": "Rotation preferences updated successfully",
            "preferences": preferences.dict()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/rotation/recommend/{user_id}")
async def get_rotation_recommendation(user_id: int, portfolio_data: Dict[str, Any]):
    """Get rotation recommendation based on current portfolio and preferences"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get user preferences
        cursor.execute("""
            SELECT * FROM UserRotationPreferences WHERE userId = %s
        """, (user_id,))
        
        prefs = cursor.fetchone()
        if not prefs:
            raise HTTPException(status_code=404, detail="User rotation preferences not found")
        
        columns = [description[0] for description in cursor.description]
        preference_data = dict(zip(columns, prefs))
        
        # Simple rotation recommendation logic
        # In production, this would be much more sophisticated
        aggression_level = preference_data['rotation_aggression_level']
        max_rotation = preference_data['max_rotation_percentage']
        risk_tolerance = preference_data['risk_tolerance']
        
        # Calculate recommended actions based on portfolio data
        total_value = portfolio_data.get('total_value', 0)
        current_allocation = portfolio_data.get('allocation', {})
        
        rotation_actions = []
        expected_impact = {
            "return_improvement": aggression_level * 0.5,
            "risk_reduction": (10 - aggression_level) * 0.3,
            "transaction_costs": aggression_level * 0.1 * total_value / 100
        }
        
        risk_assessment = {
            "volatility_increase": aggression_level * 0.2,
            "max_drawdown_risk": aggression_level * 0.15,
            "correlation_risk": aggression_level * 0.1
        }
        
        tax_implications = {
            "capital_gains_tax": expected_impact["transaction_costs"] * 0.33,
            "wash_sale_risk": 0.05 if preference_data['tax_loss_harvesting_enabled'] else 0,
            "tax_optimization_benefit": preference_data['tax_optimization_priority'] * 0.1
        }
        
        # Generate rotation actions
        for asset, allocation in current_allocation.items():
            if allocation > max_rotation:
                rotation_actions.append({
                    "action": "reduce",
                    "asset": asset,
                    "current_allocation": allocation,
                    "target_allocation": max_rotation,
                    "rotation_amount": allocation - max_rotation
                })
        
        market_context = {
            "market_trend": "neutral",
            "volatility_level": "moderate",
            "recommended_timing": "immediate" if aggression_level > 7 else "gradual"
        }
        
        conn.close()
        
        recommendation = RotationRecommendation(
            recommended_aggression_level=aggression_level,
            rotation_actions=rotation_actions,
            expected_impact=expected_impact,
            risk_assessment=risk_assessment,
            tax_implications=tax_implications,
            market_context=market_context
        )
        
        await log_to_agent_memory(
            user_id,
            "rotation_recommendation_generated",
            f"Generated rotation recommendation",
            json.dumps(portfolio_data),
            f"Recommended {len(rotation_actions)} rotation actions",
            {
                "aggression_level": aggression_level,
                "actions_count": len(rotation_actions),
                "expected_return": expected_impact["return_improvement"]
            }
        )
        
        return {
            "recommendation": recommendation.dict(),
            "user_id": user_id,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/rotation/execute/{user_id}")
async def execute_rotation(user_id: int, rotation_event: RotationEvent):
    """Log rotation execution and update history"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Create rotation history table if it doesn't exist
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS RotationHistory (
                id SERIAL PRIMARY KEY,
                userId INTEGER NOT NULL,
                rotation_date TIMESTAMPTZ DEFAULT NOW(),
                rotation_type TEXT NOT NULL,
                aggression_level INTEGER NOT NULL,
                assets_rotated INTEGER NOT NULL DEFAULT 0,
                total_rotation_amount REAL NOT NULL DEFAULT 0,
                expected_return_improvement REAL DEFAULT 0,
                risk_reduction_achieved REAL DEFAULT 0,
                transaction_costs REAL DEFAULT 0,
                tax_impact REAL DEFAULT 0,
                market_volatility REAL DEFAULT 0,
                market_trend TEXT,
                rotation_trigger TEXT,
                rotation_data TEXT DEFAULT '{}',
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        """)
        
        # Insert rotation event
        cursor.execute("""
            INSERT INTO RotationHistory 
            (userId, rotation_type, aggression_level, assets_rotated, total_rotation_amount,
             expected_return_improvement, risk_reduction_achieved, transaction_costs,
             tax_impact, market_volatility, market_trend, rotation_trigger, rotation_data)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            user_id,
            rotation_event.rotation_type,
            rotation_event.aggression_level,
            rotation_event.assets_rotated,
            rotation_event.total_rotation_amount,
            rotation_event.expected_return_improvement or 0,
            rotation_event.risk_reduction_achieved or 0,
            rotation_event.transaction_costs or 0,
            rotation_event.tax_impact or 0,
            rotation_event.market_volatility or 0,
            rotation_event.market_trend,
            rotation_event.rotation_trigger,
            json.dumps(rotation_event.rotation_data or {})
        ))
        
        rotation_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        await log_to_agent_memory(
            user_id,
            "rotation_executed",
            f"Executed {rotation_event.rotation_type} rotation",
            rotation_event.json(),
            f"Rotation completed with ID {rotation_id}",
            {
                "rotation_id": rotation_id,
                "rotation_type": rotation_event.rotation_type,
                "aggression_level": rotation_event.aggression_level,
                "assets_rotated": rotation_event.assets_rotated,
                "total_amount": rotation_event.total_rotation_amount
            }
        )
        
        return {
            "success": True,
            "rotation_id": rotation_id,
            "message": f"Rotation executed successfully",
            "rotation_details": rotation_event.dict()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/rotation/history/{user_id}")
async def get_rotation_history(
    user_id: int,
    limit: int = Query(50, le=500),
    rotation_type: Optional[str] = Query(None)
):
    """Get rotation history for a user"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Build query with optional filters
        query = "SELECT * FROM RotationHistory WHERE userId = %s"
        params = [user_id]
        
        if rotation_type:
            query += " AND rotation_type = %s"
            params.append(rotation_type)
        
        query += " ORDER BY rotation_date DESC LIMIT %s"
        params.append(limit)
        
        cursor.execute(query, params)
        
        columns = [description[0] for description in cursor.description]
        history = []
        
        for row in cursor.fetchall():
            history_data = dict(zip(columns, row))
            # Parse rotation data JSON
            try:
                history_data['rotation_data'] = json.loads(history_data['rotation_data'] or '{}')
            except:
                history_data['rotation_data'] = {}
            history.append(history_data)
        
        conn.close()
        
        return {
            "history": history,
            "count": len(history),
            "user_id": user_id,
            "rotation_type": rotation_type
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/rotation/performance/{user_id}")
async def get_rotation_performance(user_id: int, period: str = Query("30d")):
    """Get rotation performance metrics"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Calculate period start date
        period_map = {"7d": 7, "30d": 30, "90d": 90, "1y": 365}
        days = period_map.get(period, 30)
        start_date = (datetime.now() - timedelta(days=days)).isoformat()
        
        # Get performance metrics
        cursor.execute("""
            SELECT 
                COUNT(*) as total_rotations,
                AVG(expected_return_improvement) as avg_return_improvement,
                AVG(risk_reduction_achieved) as avg_risk_reduction,
                SUM(transaction_costs) as total_transaction_costs,
                SUM(tax_impact) as total_tax_impact,
                SUM(total_rotation_amount) as total_rotation_amount,
                AVG(aggression_level) as avg_aggression_level,
                MIN(rotation_date) as first_rotation,
                MAX(rotation_date) as last_rotation
            FROM RotationHistory 
            WHERE userId = %s AND rotation_date >= %s
        """, (user_id, start_date))
        
        result = cursor.fetchone()
        columns = [description[0] for description in cursor.description]
        performance_data = dict(zip(columns, result)) if result else {}
        
        # Calculate success rate (simplified)
        cursor.execute("""
            SELECT 
                COUNT(*) as successful_rotations
            FROM RotationHistory 
            WHERE userId = %s AND rotation_date >= %s AND expected_return_improvement > 0
        """, (user_id, start_date))
        
        successful = cursor.fetchone()[0] or 0
        total = performance_data.get('total_rotations', 0) or 1
        success_rate = (successful / total) * 100 if total > 0 else 0
        
        conn.close()
        
        return {
            "performance": {
                **performance_data,
                "success_rate": success_rate,
                "cost_per_rotation": performance_data.get('total_transaction_costs', 0) / total if total > 0 else 0
            },
            "period": period,
            "user_id": user_id
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))          