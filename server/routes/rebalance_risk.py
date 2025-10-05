from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import json
import random
import math
from pydantic import BaseModel
from database import get_db_connection

router = APIRouter()

class RebalanceRisk(BaseModel):
    """Rebalance risk response schema"""
    id: str
    label: str
    severity: int  # 0-100 score
    category: str
    description: str
    recommendedAction: str
    affectedAssets: List[str]
    detectedAt: str
    riskMetrics: Dict[str, Any]

class RebalanceRiskResponse(BaseModel):
    """Response schema for rebalance risks"""
    risks: List[RebalanceRisk]
    totalRiskScore: int
    riskLevel: str  # "LOW", "MEDIUM", "HIGH", "CRITICAL"
    lastUpdated: str
    nextRebalanceRecommended: Optional[str] = None

# Risk calculation functions
def calculate_drift_risk(holdings: List[Dict], target_weights: Dict[str, float]) -> Dict[str, Any]:
    """Calculate drift risk based on actual vs target weights"""
    total_portfolio_value = sum(h.get('market_value', 0) for h in holdings)
    
    if total_portfolio_value == 0:
        return {"severity": 0, "description": "No portfolio value to analyze"}
    
    max_drift = 0
    drifted_assets = []
    
    for holding in holdings:
        symbol = holding.get('symbol', '')
        actual_weight = (holding.get('market_value', 0) / total_portfolio_value) * 100
        target_weight = target_weights.get(symbol, 0)
        
        if target_weight > 0:
            drift = abs(actual_weight - target_weight)
            if drift > 5:  # More than 5% drift
                max_drift = max(max_drift, drift)
                drifted_assets.append({
                    'symbol': symbol,
                    'actualWeight': actual_weight,
                    'targetWeight': target_weight,
                    'drift': drift
                })
    
    severity = min(100, int(max_drift * 2))  # Scale drift to 0-100
    
    return {
        "severity": severity,
        "description": f"Portfolio drift detected with maximum deviation of {max_drift:.1f}%",
        "driftedAssets": drifted_assets,
        "maxDrift": max_drift
    }

def calculate_trust_risk(overlay_performance: List[Dict]) -> Dict[str, Any]:
    """Calculate trust risk based on overlay hit rates"""
    if not overlay_performance:
        return {"severity": 20, "description": "No overlay performance data available"}
    
    total_predictions = sum(p.get('totalPredictions', 0) for p in overlay_performance)
    successful_predictions = sum(p.get('successfulPredictions', 0) for p in overlay_performance)
    
    if total_predictions == 0:
        return {"severity": 30, "description": "No prediction history available"}
    
    hit_rate = (successful_predictions / total_predictions) * 100
    
    # Higher hit rate = lower risk
    severity = max(0, min(100, int(100 - hit_rate)))
    
    return {
        "severity": severity,
        "description": f"Overlay hit rate: {hit_rate:.1f}% ({successful_predictions}/{total_predictions})",
        "hitRate": hit_rate,
        "totalPredictions": total_predictions,
        "successfulPredictions": successful_predictions
    }

def calculate_signal_sync_risk(ai_signals: List[Dict], last_rebalance: Optional[str]) -> Dict[str, Any]:
    """Calculate signal sync risk based on AI signal engine alignment"""
    if not ai_signals:
        return {"severity": 40, "description": "No AI signals available for sync analysis"}
    
    # Check if last rebalance was recent enough
    if last_rebalance:
        last_rebalance_date = datetime.fromisoformat(last_rebalance.replace('Z', '+00:00'))
        days_since_rebalance = (datetime.now() - last_rebalance_date).days
        
        if days_since_rebalance > 14:  # More than 2 weeks
            return {
                "severity": 70,
                "description": f"Last rebalance was {days_since_rebalance} days ago, AI signals may be outdated",
                "daysSinceRebalance": days_since_rebalance
            }
    
    # Analyze signal strength and consistency
    strong_signals = [s for s in ai_signals if s.get('strength', 0) > 0.7]
    conflicting_signals = [s for s in ai_signals if s.get('confidence', 0) < 0.5]
    
    if len(conflicting_signals) > len(strong_signals):
        severity = 60
        description = f"Signal conflict detected: {len(conflicting_signals)} weak vs {len(strong_signals)} strong signals"
    else:
        severity = 25
        description = f"Signals aligned: {len(strong_signals)} strong signals, {len(conflicting_signals)} conflicts"
    
    return {
        "severity": severity,
        "description": description,
        "strongSignals": len(strong_signals),
        "conflictingSignals": len(conflicting_signals)
    }

def calculate_concentration_risk(holdings: List[Dict]) -> Dict[str, Any]:
    """Calculate concentration risk based on position sizes"""
    if not holdings:
        return {"severity": 0, "description": "No holdings to analyze"}
    
    total_value = sum(h.get('market_value', 0) for h in holdings)
    
    if total_value == 0:
        return {"severity": 0, "description": "No portfolio value"}
    
    # Find largest positions
    position_weights = [(h.get('symbol', ''), (h.get('market_value', 0) / total_value) * 100) 
                       for h in holdings]
    position_weights.sort(key=lambda x: x[1], reverse=True)
    
    # Check for concentration risk
    top_position = position_weights[0][1] if position_weights else 0
    top_3_concentration = sum(pw[1] for pw in position_weights[:3])
    
    if top_position > 25:  # Single position > 25%
        severity = min(100, int(top_position * 2))
        description = f"High concentration risk: {position_weights[0][0]} represents {top_position:.1f}% of portfolio"
    elif top_3_concentration > 60:  # Top 3 positions > 60%
        severity = min(80, int(top_3_concentration))
        description = f"Moderate concentration risk: Top 3 positions represent {top_3_concentration:.1f}% of portfolio"
    else:
        severity = 10
        description = f"Low concentration risk: Well diversified portfolio"
    
    return {
        "severity": severity,
        "description": description,
        "topPosition": position_weights[0] if position_weights else None,
        "top3Concentration": top_3_concentration
    }

def calculate_volatility_risk(holdings: List[Dict]) -> Dict[str, Any]:
    """Calculate volatility risk based on asset volatility"""
    if not holdings:
        return {"severity": 0, "description": "No holdings to analyze"}
    
    # Simulate volatility data (in real implementation, this would come from market data)
    high_vol_symbols = ['TSLA', 'ARKK', 'NVDA', 'COIN', 'GME']
    medium_vol_symbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META']
    
    total_value = sum(h.get('market_value', 0) for h in holdings)
    high_vol_exposure = 0
    medium_vol_exposure = 0
    
    for holding in holdings:
        symbol = holding.get('symbol', '')
        weight = (holding.get('market_value', 0) / total_value) * 100 if total_value > 0 else 0
        
        if symbol in high_vol_symbols:
            high_vol_exposure += weight
        elif symbol in medium_vol_symbols:
            medium_vol_exposure += weight
    
    if high_vol_exposure > 30:
        severity = min(100, int(high_vol_exposure * 2))
        description = f"High volatility risk: {high_vol_exposure:.1f}% exposure to high-volatility assets"
    elif high_vol_exposure > 15:
        severity = min(60, int(high_vol_exposure * 1.5))
        description = f"Moderate volatility risk: {high_vol_exposure:.1f}% exposure to high-volatility assets"
    else:
        severity = 20
        description = f"Low volatility risk: {high_vol_exposure:.1f}% exposure to high-volatility assets"
    
    return {
        "severity": severity,
        "description": description,
        "highVolExposure": high_vol_exposure,
        "mediumVolExposure": medium_vol_exposure
    }

async def get_rebalance_risks(user_id: str) -> RebalanceRiskResponse:
    """Main function to calculate rebalance risks"""
    try:
        async with get_db_connection() as conn:
            # Get current portfolio holdings
            holdings_data = await conn.fetch("""
                SELECT symbol, market_value, quantity, asset_class, sector
                FROM portfolio_holdings 
                WHERE user_id = $1
                ORDER BY market_value DESC
            """, user_id)
            
            holdings = [
                {
                    'symbol': row['symbol'],
                    'market_value': row['market_value'],
                    'quantity': row['quantity'],
                    'asset_class': row['asset_class'],
                    'sector': row['sector']
                }
                for row in holdings_data
            ]
        
        # Get target weights (simulated - in real implementation, this would come from strategy settings)
        target_weights = {
            'VTI': 30.0, 'MSFT': 15.0, 'AAPL': 12.0, 'GOOGL': 8.0, 'AMZN': 7.0,
            'TSLA': 5.0, 'META': 5.0, 'NVDA': 5.0, 'FPH': 8.0, 'SPK': 5.0
        }
        
        # Get overlay performance (simulated)
        overlay_performance = [
            {'totalPredictions': 45, 'successfulPredictions': 32},
            {'totalPredictions': 38, 'successfulPredictions': 28},
            {'totalPredictions': 52, 'successfulPredictions': 41}
        ]
        
        # Get AI signals (simulated)
        ai_signals = [
            {'strength': 0.8, 'confidence': 0.75, 'signal': 'BUY'},
            {'strength': 0.6, 'confidence': 0.65, 'signal': 'HOLD'},
            {'strength': 0.4, 'confidence': 0.45, 'signal': 'SELL'}
        ]
        
        # Get last rebalance date (simulated)
        last_rebalance = (datetime.now() - timedelta(days=12)).isoformat()
        
        # Calculate individual risks
        drift_risk = calculate_drift_risk(holdings, target_weights)
        trust_risk = calculate_trust_risk(overlay_performance)
        signal_sync_risk = calculate_signal_sync_risk(ai_signals, last_rebalance)
        concentration_risk = calculate_concentration_risk(holdings)
        volatility_risk = calculate_volatility_risk(holdings)
        
        # Create risk objects
        risks = []
        
        # Drift Risk
        if drift_risk['severity'] > 10:
            risks.append(RebalanceRisk(
                id="drift_risk",
                label="Portfolio Drift",
                severity=drift_risk['severity'],
                category="allocation",
                description=drift_risk['description'],
                recommendedAction="Rebalance to target weights" if drift_risk['severity'] > 50 else "Monitor drift levels",
                affectedAssets=[asset['symbol'] for asset in drift_risk.get('driftedAssets', [])],
                detectedAt=datetime.now().isoformat(),
                riskMetrics=drift_risk
            ))
        
        # Trust Risk
        if trust_risk['severity'] > 20:
            risks.append(RebalanceRisk(
                id="trust_risk",
                label="Overlay Trust",
                severity=trust_risk['severity'],
                category="strategy",
                description=trust_risk['description'],
                recommendedAction="Review overlay performance and consider strategy adjustments",
                affectedAssets=[],
                detectedAt=datetime.now().isoformat(),
                riskMetrics=trust_risk
            ))
        
        # Signal Sync Risk
        if signal_sync_risk['severity'] > 30:
            risks.append(RebalanceRisk(
                id="signal_sync_risk",
                label="Signal Synchronization",
                severity=signal_sync_risk['severity'],
                category="timing",
                description=signal_sync_risk['description'],
                recommendedAction="Review AI signals and consider rebalancing",
                affectedAssets=[],
                detectedAt=datetime.now().isoformat(),
                riskMetrics=signal_sync_risk
            ))
        
        # Concentration Risk
        if concentration_risk['severity'] > 15:
            risks.append(RebalanceRisk(
                id="concentration_risk",
                label="Concentration Risk",
                severity=concentration_risk['severity'],
                category="diversification",
                description=concentration_risk['description'],
                recommendedAction="Reduce position sizes of overweight holdings",
                affectedAssets=[concentration_risk['topPosition'][0]] if concentration_risk.get('topPosition') else [],
                detectedAt=datetime.now().isoformat(),
                riskMetrics=concentration_risk
            ))
        
        # Volatility Risk
        if volatility_risk['severity'] > 25:
            risks.append(RebalanceRisk(
                id="volatility_risk",
                label="Volatility Risk",
                severity=volatility_risk['severity'],
                category="market",
                description=volatility_risk['description'],
                recommendedAction="Consider reducing exposure to high-volatility assets",
                affectedAssets=[],
                detectedAt=datetime.now().isoformat(),
                riskMetrics=volatility_risk
            ))
        
        # Sort risks by severity (highest first)
        risks.sort(key=lambda x: x.severity, reverse=True)
        
        # Take top 5 risks
        top_risks = risks[:5]
        
        # Calculate overall risk score
        total_risk_score = sum(risk.severity for risk in top_risks) // len(top_risks) if top_risks else 0
        
        # Determine risk level
        if total_risk_score >= 70:
            risk_level = "CRITICAL"
        elif total_risk_score >= 50:
            risk_level = "HIGH"
        elif total_risk_score >= 30:
            risk_level = "MEDIUM"
        else:
            risk_level = "LOW"
        
        # Determine next rebalance recommendation
        next_rebalance = None
        if total_risk_score > 60:
            next_rebalance = "Immediate rebalancing recommended"
        elif total_risk_score > 40:
            next_rebalance = "Consider rebalancing within 1 week"
        elif total_risk_score > 20:
            next_rebalance = "Review in 2 weeks"
        else:
            next_rebalance = "No immediate action required"
        
        return RebalanceRiskResponse(
            risks=top_risks,
            totalRiskScore=total_risk_score,
            riskLevel=risk_level,
            lastUpdated=datetime.now().isoformat(),
            nextRebalanceRecommended=next_rebalance
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to calculate rebalance risks: {str(e)}")

@router.get("/portfolio/rebalance-risks/{user_id}")
async def get_rebalance_risks_endpoint(
    user_id: str,
    current_user_id: int = 1  # TODO: Get from authentication
):
    """
    Get rebalance risks for a specific user
    
    Returns top 5 rebalance risks with severity scores and recommended actions.
    """
    try:
        # Get rebalance risks
        risk_response = await get_rebalance_risks(user_id)
        
        return risk_response.dict()
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve rebalance risks: {str(e)}"
        )

@router.get("/portfolio/risk-summary/{user_id}")
async def get_risk_summary(
    user_id: str,
    current_user_id: int = 1  # TODO: Get from authentication
):
    """
    Get risk summary for a specific user
    
    Returns aggregated risk metrics and trends.
    """
    try:
        # Get current risks
        risk_response = await get_rebalance_risks(user_id)
        
        # Calculate risk category breakdown
        risk_categories = {}
        for risk in risk_response.risks:
            category = risk.category
            if category not in risk_categories:
                risk_categories[category] = {"count": 0, "avgSeverity": 0, "maxSeverity": 0}
            
            risk_categories[category]["count"] += 1
            risk_categories[category]["maxSeverity"] = max(risk_categories[category]["maxSeverity"], risk.severity)
        
        # Calculate average severity per category
        for category, data in risk_categories.items():
            category_risks = [r for r in risk_response.risks if r.category == category]
            data["avgSeverity"] = sum(r.severity for r in category_risks) // len(category_risks)
        
        return {
            "totalRiskScore": risk_response.totalRiskScore,
            "riskLevel": risk_response.riskLevel,
            "riskCount": len(risk_response.risks),
            "riskCategories": risk_categories,
            "highestRisk": risk_response.risks[0].dict() if risk_response.risks else None,
            "nextRebalanceRecommended": risk_response.nextRebalanceRecommended,
            "lastUpdated": risk_response.lastUpdated
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve risk summary: {str(e)}"
        )    