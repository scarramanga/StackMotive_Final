from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, validator
from typing import Optional, List, Dict, Any
import json
from datetime import datetime
import psycopg2
from psycopg2.extras import RealDictCursor
import os

router = APIRouter()

# Block 4: AI Rebalance Suggestion Panel
# Provides AI-driven rebalancing suggestions with rationale and impact analysis

class AIRebalanceSuggestion(BaseModel):
    id: str
    type: str  # 'overweight_reduction', 'underweight_increase', 'risk_rebalance', 'opportunity_capture'
    fromAsset: str
    toAsset: str
    fromStrategy: Optional[str] = None
    toStrategy: Optional[str] = None
    suggestedAmount: float
    currentAllocation: float
    targetAllocation: float
    deviation: float
    priority: str  # 'high', 'medium', 'low'
    confidence: float  # 0.0 to 1.0
    aiRationale: str
    expectedImpact: Dict[str, float]  # risk, return, diversification scores
    marketContext: List[str]
    estimatedCost: float
    timeframe: str  # 'immediate', 'short_term', 'medium_term'
    createdAt: str

class AIRebalanceSession(BaseModel):
    sessionId: str
    userId: int
    suggestions: List[AIRebalanceSuggestion]
    totalPortfolioValue: float
    riskScore: float
    diversificationScore: float
    aiSummary: str
    sessionTimestamp: str

class SuggestionResponse(BaseModel):
    action: str  # 'accept', 'decline', 'modify'
    suggestionId: str
    userNotes: Optional[str] = None
    modifiedAmount: Optional[float] = None

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
            CREATE TABLE IF NOT EXISTS AgentMemory (
                id SERIAL PRIMARY KEY,
                userId INTEGER NOT NULL,
                actionType TEXT NOT NULL,
                actionSummary TEXT NOT NULL,
                inputData TEXT,
                outputData TEXT,
                metadata TEXT,
                timestamp TEXT NOT NULL,
                createdAt TEXT NOT NULL
            )
        """)
        
        cursor.execute("""
            INSERT INTO AgentMemory 
            (userId, actionType, actionSummary, inputData, outputData, metadata, timestamp, createdAt)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            user_id,
            action_type,
            action_summary,
            input_data,
            output_data,
            json.dumps(metadata) if metadata else None,
            datetime.now().isoformat(),
            datetime.now().isoformat()
        ))
        
        conn.commit()
        conn.close()
        
    except Exception as e:
        print(f"Failed to log to agent memory: {e}")

# AI rationale generator
def generate_ai_rationale(suggestion_type: str, from_asset: str, to_asset: str, deviation: float, market_context: List[str]) -> str:
    rationales = {
        'overweight_reduction': f"AI analysis indicates {from_asset} is overweight by {deviation:.1f}%. Current market conditions suggest reducing exposure to optimize risk-adjusted returns.",
        'underweight_increase': f"Portfolio analysis reveals {to_asset} is underweight by {abs(deviation):.1f}%. Increasing allocation aligns with strategic asset allocation targets.",
        'risk_rebalance': f"Risk metrics indicate portfolio tilt towards {from_asset}. Rebalancing to {to_asset} improves risk-adjusted returns and portfolio diversification.",
        'opportunity_capture': f"Market analysis suggests tactical opportunity in {to_asset}. Temporary allocation adjustment from {from_asset} may capture alpha."
    }
    
    base_rationale = rationales.get(suggestion_type, f"AI recommends rebalancing from {from_asset} to {to_asset} based on current portfolio metrics.")
    
    if market_context:
        context_str = ". Market factors: " + ", ".join(market_context[:2])
        base_rationale += context_str
    
    return base_rationale

# Calculate expected impact
def calculate_expected_impact(from_asset: str, to_asset: str, amount: float, total_value: float) -> Dict[str, float]:
    # Simplified impact calculation - in production, this would use more sophisticated models
    weight_change = (amount / total_value) * 100
    
    # Mock calculations based on asset classes
    risk_assets = ['crypto', 'growth_stocks', 'emerging_markets']
    safe_assets = ['bonds', 'cash', 'treasury']
    
    from_risk = 0.8 if any(risk in from_asset.lower() for risk in risk_assets) else 0.3
    to_risk = 0.8 if any(risk in to_asset.lower() for risk in risk_assets) else 0.3
    
    risk_change = (to_risk - from_risk) * weight_change * 0.1
    return_change = risk_change * 0.5  # Risk-return tradeoff
    diversification_change = abs(weight_change) * 0.05  # Rebalancing generally improves diversification
    
    return {
        "riskChange": round(risk_change, 2),
        "returnChange": round(return_change, 2),
        "diversificationChange": round(diversification_change, 2)
    }

# Generate AI rebalance suggestions
async def generate_ai_suggestions(user_id: int) -> AIRebalanceSession:
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get portfolio positions
        cursor.execute("""
            SELECT * FROM PortfolioPosition 
            WHERE userId = %s
        """, (user_id,))
        
        positions = cursor.fetchall()
        conn.close()
        
        if not positions:
            raise HTTPException(status_code=404, detail="No portfolio positions found")
        
        # Calculate current allocations
        # pos structure: [id, userId, symbol, name, quantity, avgPrice, currentPrice, assetClass, account, currency, lastUpdated, syncSource, createdAt]
        asset_allocations = {}
        for pos in positions:
            symbol = pos[2]  # symbol
            quantity = float(pos[4])  # quantity
            avg_price = float(pos[5])  # avgPrice
            current_price = float(pos[6]) if pos[6] is not None else avg_price  # currentPrice or fallback to avgPrice
            asset_class = pos[7] or "Unknown"  # assetClass
            
            market_value = quantity * current_price
            
            if asset_class not in asset_allocations:
                asset_allocations[asset_class] = {"value": 0.0, "percentage": 0.0}
            
            asset_allocations[asset_class]["value"] += market_value
        
        # Calculate total portfolio value
        total_value = sum(alloc["value"] for alloc in asset_allocations.values())
        
        # Calculate percentages
        for asset_class in asset_allocations:
            asset_allocations[asset_class]["percentage"] = (asset_allocations[asset_class]["value"] / total_value) * 100
        
        # Target allocations (simplified - in production, this would be user-customizable)
        target_allocations = {
            "equity": 60.0,
            "crypto": 15.0,
            "bond": 15.0,
            "fund": 5.0,
            "cash": 5.0
        }
        
        # Generate suggestions
        suggestions = []
        suggestion_counter = 0
        
        # Market context (mock - in production, this would come from real market data)
        market_context = [
            "Recent volatility spike detected",
            "Sector rotation underway",
            "Fed policy shift anticipated"
        ]
        
        for asset_class, current in asset_allocations.items():
            target = target_allocations.get(asset_class, 10.0)  # Default 10% if not specified
            deviation = current["percentage"] - target
            
            # Only suggest rebalances for significant deviations
            if abs(deviation) > 3.0:
                suggestion_counter += 1
                
                # Determine suggestion type and direction
                if deviation > 0:  # Overweight
                    suggestion_type = "overweight_reduction"
                    from_asset = asset_class
                    # Find underweight asset class
                    to_asset = min(
                        [(ac, target_allocations.get(ac, 10.0) - asset_allocations.get(ac, {"percentage": 0})["percentage"]) 
                         for ac in target_allocations.keys()],
                        key=lambda x: x[1]
                    )[0]
                else:  # Underweight
                    suggestion_type = "underweight_increase"
                    from_asset = max(asset_allocations.keys(), 
                                   key=lambda x: asset_allocations[x]["percentage"] - target_allocations.get(x, 10.0))
                    to_asset = asset_class
                
                # Calculate suggested amount
                suggested_percentage = abs(deviation) / 2  # Rebalance half the deviation
                suggested_amount = (suggested_percentage / 100) * total_value
                
                # Determine priority and confidence
                priority = "high" if abs(deviation) > 10 else "medium" if abs(deviation) > 5 else "low"
                confidence = min(0.95, 0.6 + (abs(deviation) / 100))  # Higher confidence for larger deviations
                
                # Generate AI rationale
                ai_rationale = generate_ai_rationale(suggestion_type, from_asset, to_asset, deviation, market_context)
                
                # Calculate expected impact
                expected_impact = calculate_expected_impact(from_asset, to_asset, suggested_amount, total_value)
                
                # Estimate cost (simplified)
                estimated_cost = suggested_amount * 0.001  # 0.1% transaction cost
                
                suggestion = AIRebalanceSuggestion(
                    id=f"suggestion_{suggestion_counter}_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                    type=suggestion_type,
                    fromAsset=from_asset,
                    toAsset=to_asset,
                    fromStrategy=None,  # Could be enhanced to include strategy info
                    toStrategy=None,
                    suggestedAmount=suggested_amount,
                    currentAllocation=current["percentage"],
                    targetAllocation=target,
                    deviation=deviation,
                    priority=priority,
                    confidence=confidence,
                    aiRationale=ai_rationale,
                    expectedImpact=expected_impact,
                    marketContext=market_context[:2],  # Limit to top 2 factors
                    estimatedCost=estimated_cost,
                    timeframe="short_term",
                    createdAt=datetime.now().isoformat()
                )
                
                suggestions.append(suggestion)
        
        # Calculate portfolio metrics
        risk_score = sum(asset_allocations.get(asset, {"percentage": 0})["percentage"] * 0.8 
                        for asset in ["crypto", "equity"]) / 100  # Simplified risk calculation
        
        # Calculate diversification score (simplified Herfindahl index)
        percentages = [alloc["percentage"] / 100 for alloc in asset_allocations.values()]
        herfindahl_index = sum(p * p for p in percentages)
        diversification_score = (1 - herfindahl_index) * 100
        
        # Generate AI summary
        ai_summary = f"Portfolio analysis complete. {len(suggestions)} rebalancing opportunities identified. "
        if suggestions:
            high_priority = len([s for s in suggestions if s.priority == "high"])
            if high_priority > 0:
                ai_summary += f"{high_priority} high-priority adjustments recommended for immediate action."
            else:
                ai_summary += "Minor adjustments suggested to optimize allocation targets."
        else:
            ai_summary += "Portfolio is well-balanced within target ranges."
        
        session = AIRebalanceSession(
            sessionId=f"session_{user_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            userId=user_id,
            suggestions=suggestions,
            totalPortfolioValue=total_value,
            riskScore=risk_score,
            diversificationScore=diversification_score,
            aiSummary=ai_summary,
            sessionTimestamp=datetime.now().isoformat()
        )
        
        return session
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate AI suggestions: {str(e)}")

@router.get("/ai-rebalance/suggestions/{user_id}")
async def get_ai_rebalance_suggestions(user_id: int):
    """Generate AI-driven rebalancing suggestions for user's portfolio"""
    try:
        session = await generate_ai_suggestions(user_id)
        
        await log_to_agent_memory(
            user_id,
            "ai_rebalance_suggestions_generated",
            "AI generated portfolio rebalancing suggestions",
            None,
            f"Generated {len(session.suggestions)} suggestions with AI summary",
            {
                "sessionId": session.sessionId,
                "suggestionCount": len(session.suggestions),
                "riskScore": session.riskScore,
                "diversificationScore": session.diversificationScore,
                "portfolioValue": session.totalPortfolioValue
            }
        )
        
        return {"session": session.dict()}
        
    except Exception as e:
        await log_to_agent_memory(
            user_id,
            "ai_rebalance_suggestions_failed",
            "AI rebalance suggestion generation failed",
            None,
            str(e),
            {"error": str(e)}
        )
        
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/ai-rebalance/respond/{user_id}")
async def respond_to_suggestion(user_id: int, response: SuggestionResponse):
    """User response to an AI rebalancing suggestion"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Create AI suggestion responses table if it doesn't exist
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS AISuggestionResponse (
                id SERIAL PRIMARY KEY,
                userId INTEGER NOT NULL,
                suggestionId TEXT NOT NULL,
                action TEXT NOT NULL,
                userNotes TEXT,
                modifiedAmount REAL,
                responseTimestamp TEXT NOT NULL,
                createdAt TEXT NOT NULL
            )
        """)
        
        # Save user response
        cursor.execute("""
            INSERT INTO AISuggestionResponse 
            (userId, suggestionId, action, userNotes, modifiedAmount, responseTimestamp, createdAt)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (
            user_id,
            response.suggestionId,
            response.action,
            response.userNotes,
            response.modifiedAmount,
            datetime.now().isoformat(),
            datetime.now().isoformat()
        ))
        
        conn.commit()
        conn.close()
        
        await log_to_agent_memory(
            user_id,
            "ai_suggestion_response",
            f"User {response.action}ed AI rebalancing suggestion",
            response.json(),
            f"Suggestion {response.suggestionId} {response.action}ed",
            {
                "suggestionId": response.suggestionId,
                "action": response.action,
                "hasNotes": bool(response.userNotes),
                "hasModification": bool(response.modifiedAmount)
            }
        )
        
        return {
            "success": True,
            "message": f"Suggestion {response.action}ed successfully",
            "suggestionId": response.suggestionId
        }
        
    except Exception as e:
        await log_to_agent_memory(
            user_id,
            "ai_suggestion_response_failed",
            "Failed to record AI suggestion response",
            response.json(),
            str(e),
            {"error": str(e)}
        )
        
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/ai-rebalance/history/{user_id}")
async def get_suggestion_history(user_id: int):
    """Get user's AI suggestion response history"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT * FROM AISuggestionResponse 
            WHERE userId = %s 
            ORDER BY responseTimestamp DESC 
            LIMIT 50
        """, (user_id,))
        
        columns = [description[0] for description in cursor.description]
        responses = [dict(zip(columns, row)) for row in cursor.fetchall()]
        
        conn.close()
        
        return {"responses": responses}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/ai-rebalance/refresh/{user_id}")
async def refresh_ai_suggestions(user_id: int):
    """Refresh AI suggestions with latest portfolio data"""
    try:
        session = await generate_ai_suggestions(user_id)
        
        await log_to_agent_memory(
            user_id,
            "ai_suggestions_refreshed",
            "User requested AI suggestion refresh",
            None,
            "AI suggestions refreshed successfully",
            {"sessionId": session.sessionId}
        )
        
        return {
            "success": True,
            "message": "AI suggestions refreshed successfully",
            "session": session.dict()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))          