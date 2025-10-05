from fastapi import APIRouter, Depends
from typing import List, Dict, Any
from server.auth import get_current_user

router = APIRouter()

@router.get("/market-events", response_model=List[Dict[str, Any]])
async def get_market_events(current_user: Dict = Depends(get_current_user)):
    """Get market events and news - stub implementation"""
    return [
        {
            "id": "1",
            "title": "Bitcoin ETF Approval Expected",
            "description": "Analysts predict SEC approval for Bitcoin ETF within Q2",
            "impact": "bullish",
            "confidence": 0.75,
            "timestamp": "2024-06-01T14:30:00Z",
            "affected_assets": ["BTC", "ETH"]
        },
        {
            "id": "2",
            "title": "Federal Reserve Interest Rate Decision",
            "description": "Fed expected to maintain current rates at 5.25-5.50%",
            "impact": "neutral", 
            "confidence": 0.85,
            "timestamp": "2024-06-01T12:00:00Z",
            "affected_assets": ["USD", "SPY", "QQQ"]
        },
        {
            "id": "3",
            "title": "NVIDIA Earnings Beat Expectations",
            "description": "Q1 revenue up 262% year-over-year driven by AI demand",
            "impact": "bullish",
            "confidence": 0.95,
            "timestamp": "2024-05-30T20:00:00Z", 
            "affected_assets": ["NVDA", "TECH"]
        }
    ] 