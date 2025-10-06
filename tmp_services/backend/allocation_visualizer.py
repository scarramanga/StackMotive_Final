from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, validator
from typing import Optional, List, Dict, Any
import json
from datetime import datetime
import psycopg2
from psycopg2.extras import RealDictCursor
import os

router = APIRouter()

# Block 3: Allocation Visualizer
# Provides portfolio allocation analysis, breakdowns, and visualization data

class AllocationBreakdown(BaseModel):
    type: str  # 'asset_class', 'strategy', 'sector', 'geographic'
    name: str
    value: float
    percentage: float
    count: int
    color: str

class AllocationAnalysis(BaseModel):
    totalValue: float
    totalPositions: int
    assetClassBreakdown: List[AllocationBreakdown]
    strategyBreakdown: List[AllocationBreakdown]
    sectorBreakdown: List[AllocationBreakdown]
    geographicBreakdown: List[AllocationBreakdown]
    riskLevelBreakdown: List[AllocationBreakdown]
    topHoldings: List[Dict[str, Any]]
    diversificationScore: float
    concentrationRisk: float
    analysisTimestamp: str

class RebalanceRecommendation(BaseModel):
    fromSymbol: str
    toSymbol: str
    fromStrategy: str
    toStrategy: str
    amount: float
    reason: str
    priority: str  # high, medium, low
    expectedImpact: float

class AllocationTarget(BaseModel):
    assetClass: str
    targetPercentage: float
    currentPercentage: float
    deviation: float
    status: str  # overweight, underweight, balanced

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
            "3",  # Block 3 - Allocation Visualizer
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

# Color palette for visualizations
VISUALIZATION_COLORS = [
    "#3B82F6",  # Blue
    "#10B981",  # Green
    "#F59E0B",  # Amber
    "#EF4444",  # Red
    "#8B5CF6",  # Purple
    "#06B6D4",  # Cyan
    "#84CC16",  # Lime
    "#F97316",  # Orange
    "#EC4899",  # Pink
    "#6B7280",  # Gray
]

# Default sector mappings
SECTOR_MAPPINGS = {
    "AAPL": "Technology",
    "MSFT": "Technology", 
    "GOOGL": "Technology",
    "AMZN": "Consumer Discretionary",
    "TSLA": "Consumer Discretionary",
    "NVDA": "Technology",
    "META": "Technology",
    "BRK.B": "Financial Services",
    "JNJ": "Healthcare",
    "V": "Financial Services",
    "BTC": "Cryptocurrency",
    "ETH": "Cryptocurrency",
    "SPY": "Index Fund",
    "QQQ": "Index Fund",
    "VTI": "Index Fund"
}

# Geographic mappings
GEOGRAPHIC_MAPPINGS = {
    "AAPL": "United States",
    "MSFT": "United States",
    "GOOGL": "United States", 
    "AMZN": "United States",
    "TSLA": "United States",
    "BTC": "Global",
    "ETH": "Global",
    "SPY": "United States",
    "QQQ": "United States",
    "VTI": "Global"
}

async def calculate_allocation_analysis(user_id: int) -> AllocationAnalysis:
    """Calculate comprehensive allocation analysis for a user's portfolio"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get portfolio positions with strategy assignments
        cursor.execute("""
            SELECT 
                pp.id,
                pp.symbol,
                pp.name,
                pp.quantity,
                pp.currentPrice,
                pp.marketValue,
                pp.assetClass,
                sa.strategyId,
                sa.strategyName,
                sa.metadata as strategy_metadata
            FROM PortfolioPosition pp
            LEFT JOIN StrategyAssignment sa ON pp.id = sa.positionId
            WHERE pp.userId = %s
        """, (user_id,))
        
        positions = cursor.fetchall()
        conn.close()
        
        if not positions:
            return AllocationAnalysis(
                totalValue=0.0,
                totalPositions=0,
                assetClassBreakdown=[],
                strategyBreakdown=[],
                sectorBreakdown=[],
                geographicBreakdown=[],
                riskLevelBreakdown=[],
                topHoldings=[],
                diversificationScore=0.0,
                concentrationRisk=0.0,
                analysisTimestamp=datetime.now().isoformat()
            )
        
        # Calculate totals
        total_value = sum(float(pos[5]) for pos in positions)  # marketValue
        total_positions = len(positions)
        
        # Asset class breakdown
        asset_class_data = {}
        for pos in positions:
            asset_class = pos[6] or "Unknown"
            market_value = float(pos[5])
            
            if asset_class not in asset_class_data:
                asset_class_data[asset_class] = {"value": 0.0, "count": 0}
            
            asset_class_data[asset_class]["value"] += market_value
            asset_class_data[asset_class]["count"] += 1
        
        asset_class_breakdown = []
        for i, (asset_class, data) in enumerate(asset_class_data.items()):
            percentage = (data["value"] / total_value) * 100 if total_value > 0 else 0
            asset_class_breakdown.append(AllocationBreakdown(
                type="asset_class",
                name=asset_class.title(),
                value=data["value"],
                percentage=percentage,
                count=data["count"],
                color=VISUALIZATION_COLORS[i % len(VISUALIZATION_COLORS)]
            ))
        
        # Strategy breakdown
        strategy_data = {}
        for pos in positions:
            strategy_name = pos[8] or "Unassigned"
            market_value = float(pos[5])
            
            if strategy_name not in strategy_data:
                strategy_data[strategy_name] = {"value": 0.0, "count": 0}
            
            strategy_data[strategy_name]["value"] += market_value
            strategy_data[strategy_name]["count"] += 1
        
        strategy_breakdown = []
        for i, (strategy, data) in enumerate(strategy_data.items()):
            percentage = (data["value"] / total_value) * 100 if total_value > 0 else 0
            strategy_breakdown.append(AllocationBreakdown(
                type="strategy",
                name=strategy,
                value=data["value"],
                percentage=percentage,
                count=data["count"],
                color=VISUALIZATION_COLORS[i % len(VISUALIZATION_COLORS)]
            ))
        
        # Sector breakdown
        sector_data = {}
        for pos in positions:
            symbol = pos[1]
            sector = SECTOR_MAPPINGS.get(symbol, "Other")
            market_value = float(pos[5])
            
            if sector not in sector_data:
                sector_data[sector] = {"value": 0.0, "count": 0}
            
            sector_data[sector]["value"] += market_value
            sector_data[sector]["count"] += 1
        
        sector_breakdown = []
        for i, (sector, data) in enumerate(sector_data.items()):
            percentage = (data["value"] / total_value) * 100 if total_value > 0 else 0
            sector_breakdown.append(AllocationBreakdown(
                type="sector",
                name=sector,
                value=data["value"],
                percentage=percentage,
                count=data["count"],
                color=VISUALIZATION_COLORS[i % len(VISUALIZATION_COLORS)]
            ))
        
        # Geographic breakdown
        geographic_data = {}
        for pos in positions:
            symbol = pos[1]
            region = GEOGRAPHIC_MAPPINGS.get(symbol, "Other")
            market_value = float(pos[5])
            
            if region not in geographic_data:
                geographic_data[region] = {"value": 0.0, "count": 0}
            
            geographic_data[region]["value"] += market_value
            geographic_data[region]["count"] += 1
        
        geographic_breakdown = []
        for i, (region, data) in enumerate(geographic_data.items()):
            percentage = (data["value"] / total_value) * 100 if total_value > 0 else 0
            geographic_breakdown.append(AllocationBreakdown(
                type="geographic",
                name=region,
                value=data["value"],
                percentage=percentage,
                count=data["count"],
                color=VISUALIZATION_COLORS[i % len(VISUALIZATION_COLORS)]
            ))
        
        # Risk level breakdown (from strategy metadata)
        risk_data = {}
        for pos in positions:
            risk_level = "Unknown"
            if pos[9]:  # strategy_metadata
                try:
                    metadata = json.loads(pos[9])
                    risk_level = metadata.get("riskLevel", "Unknown").title()
                except:
                    pass
            
            market_value = float(pos[5])
            
            if risk_level not in risk_data:
                risk_data[risk_level] = {"value": 0.0, "count": 0}
            
            risk_data[risk_level]["value"] += market_value
            risk_data[risk_level]["count"] += 1
        
        risk_breakdown = []
        for i, (risk_level, data) in enumerate(risk_data.items()):
            percentage = (data["value"] / total_value) * 100 if total_value > 0 else 0
            risk_breakdown.append(AllocationBreakdown(
                type="risk_level",
                name=risk_level,
                value=data["value"],
                percentage=percentage,
                count=data["count"],
                color=VISUALIZATION_COLORS[i % len(VISUALIZATION_COLORS)]
            ))
        
        # Top holdings
        top_holdings = []
        sorted_positions = sorted(positions, key=lambda x: float(x[5]), reverse=True)[:10]
        
        for pos in sorted_positions:
            percentage = (float(pos[5]) / total_value) * 100 if total_value > 0 else 0
            top_holdings.append({
                "symbol": pos[1],
                "name": pos[2] or pos[1],
                "value": float(pos[5]),
                "percentage": percentage,
                "quantity": float(pos[3]),
                "assetClass": pos[6],
                "strategy": pos[8] or "Unassigned"
            })
        
        # Calculate diversification score (simplified Herfindahl index)
        position_percentages = [float(pos[5]) / total_value for pos in positions if total_value > 0]
        herfindahl_index = sum(p * p for p in position_percentages)
        diversification_score = (1 - herfindahl_index) * 100 if position_percentages else 0
        
        # Calculate concentration risk (percentage of top 3 holdings)
        top_3_value = sum(float(pos[5]) for pos in sorted_positions[:3])
        concentration_risk = (top_3_value / total_value) * 100 if total_value > 0 else 0
        
        return AllocationAnalysis(
            totalValue=total_value,
            totalPositions=total_positions,
            assetClassBreakdown=asset_class_breakdown,
            strategyBreakdown=strategy_breakdown,
            sectorBreakdown=sector_breakdown,
            geographicBreakdown=geographic_breakdown,
            riskLevelBreakdown=risk_breakdown,
            topHoldings=top_holdings,
            diversificationScore=diversification_score,
            concentrationRisk=concentration_risk,
            analysisTimestamp=datetime.now().isoformat()
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to calculate allocation analysis: {str(e)}")

@router.get("/allocation/analysis/{user_id}")
async def get_allocation_analysis(user_id: int):
    """Get comprehensive allocation analysis for a user's portfolio"""
    try:
        analysis = await calculate_allocation_analysis(user_id)
        
        await log_to_agent_memory(
            user_id,
            "allocation_analysis_generated",
            "Generated portfolio allocation analysis",
            None,
            f"Analyzed {analysis.totalPositions} positions worth ${analysis.totalValue:,.2f}",
            {
                "totalValue": analysis.totalValue,
                "totalPositions": analysis.totalPositions,
                "diversificationScore": analysis.diversificationScore,
                "concentrationRisk": analysis.concentrationRisk
            }
        )
        
        return {"analysis": analysis.dict()}
        
    except Exception as e:
        await log_to_agent_memory(
            user_id,
            "allocation_analysis_failed",
            "Portfolio allocation analysis failed",
            None,
            str(e),
            {"error": str(e)}
        )
        
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/allocation/targets/{user_id}")
async def get_allocation_targets(user_id: int):
    """Get allocation targets and current vs target analysis"""
    try:
        # Default target allocations (can be customized per user)
        default_targets = {
            "equity": 60.0,
            "bond": 20.0,
            "crypto": 10.0,
            "cash": 5.0,
            "fund": 5.0
        }
        
        analysis = await calculate_allocation_analysis(user_id)
        
        targets = []
        for asset_class, target_percentage in default_targets.items():
            # Find current allocation for this asset class
            current_allocation = next(
                (breakdown for breakdown in analysis.assetClassBreakdown 
                 if breakdown.name.lower() == asset_class.lower()),
                None
            )
            
            current_percentage = current_allocation.percentage if current_allocation else 0.0
            deviation = current_percentage - target_percentage
            
            # Determine status
            if abs(deviation) <= 2.0:
                status = "balanced"
            elif deviation > 0:
                status = "overweight"
            else:
                status = "underweight"
            
            targets.append(AllocationTarget(
                assetClass=asset_class.title(),
                targetPercentage=target_percentage,
                currentPercentage=current_percentage,
                deviation=deviation,
                status=status
            ))
        
        await log_to_agent_memory(
            user_id,
            "allocation_targets_analyzed",
            "Analyzed allocation targets vs current allocations",
            None,
            f"Analyzed {len(targets)} asset class targets",
            {"targetCount": len(targets)}
        )
        
        return {"targets": [target.dict() for target in targets]}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/allocation/rebalance/{user_id}")
async def get_rebalance_recommendations(user_id: int):
    """Get rebalancing recommendations based on target allocations"""
    try:
        targets_response = await get_allocation_targets(user_id)
        targets = [AllocationTarget(**target) for target in targets_response["targets"]]
        
        recommendations = []
        
        # Find overweight and underweight positions
        overweight = [t for t in targets if t.status == "overweight" and abs(t.deviation) > 5.0]
        underweight = [t for t in targets if t.status == "underweight" and abs(t.deviation) > 5.0]
        
        # Generate rebalancing recommendations
        for ow in overweight:
            for uw in underweight:
                if abs(ow.deviation) > 5.0 and abs(uw.deviation) > 5.0:
                    # Calculate recommended rebalance amount
                    analysis = await calculate_allocation_analysis(user_id)
                    total_value = analysis.totalValue
                    
                    # Amount to move (simplified calculation)
                    move_percentage = min(abs(ow.deviation), abs(uw.deviation)) / 2
                    move_amount = (move_percentage / 100) * total_value
                    
                    priority = "high" if move_percentage > 10 else "medium" if move_percentage > 5 else "low"
                    
                    recommendations.append(RebalanceRecommendation(
                        fromSymbol=ow.assetClass,
                        toSymbol=uw.assetClass,
                        fromStrategy=f"{ow.assetClass} Strategy",
                        toStrategy=f"{uw.assetClass} Strategy",
                        amount=move_amount,
                        reason=f"Rebalance {ow.assetClass} (overweight by {ow.deviation:.1f}%) to {uw.assetClass} (underweight by {uw.deviation:.1f}%)",
                        priority=priority,
                        expectedImpact=move_percentage
                    ))
        
        await log_to_agent_memory(
            user_id,
            "rebalance_recommendations_generated",
            "Generated portfolio rebalancing recommendations",
            None,
            f"Generated {len(recommendations)} rebalancing recommendations",
            {"recommendationCount": len(recommendations)}
        )
        
        return {"recommendations": [rec.dict() for rec in recommendations]}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/allocation/refresh/{user_id}")
async def refresh_allocation_data(user_id: int):
    """Refresh allocation analysis data (useful after portfolio changes)"""
    try:
        analysis = await calculate_allocation_analysis(user_id)
        
        await log_to_agent_memory(
            user_id,
            "allocation_data_refreshed",
            "User requested allocation data refresh",
            None,
            "Allocation analysis data refreshed successfully",
            {"refreshTimestamp": datetime.now().isoformat()}
        )
        
        return {
            "success": True,
            "message": "Allocation data refreshed successfully",
            "analysis": analysis.dict()
        }
        
    except Exception as e:
        await log_to_agent_memory(
            user_id,
            "allocation_refresh_failed",
            "Allocation data refresh failed",
            None,
            str(e),
            {"error": str(e)}
        )
        
        raise HTTPException(status_code=500, detail=str(e))        