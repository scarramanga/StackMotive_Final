"""
Strategy API routes for signal preview and strategy management
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Dict, List
from pydantic import BaseModel

from server.database import get_db
from server.models.user import User
from server.auth import get_current_user
from server.logic.signal_engine import signal_engine

router = APIRouter()

class SignalPreviewResponse(BaseModel):
    """Response schema for signal preview"""
    symbol: str
    current_price: float
    rsi: float
    macd: float
    ma20: float
    ma50: float
    volume: int
    volume_7d_avg: int
    volume_ratio: float
    timestamp: str

class StrategySignalResponse(BaseModel):
    """Response schema for strategy signal check"""
    symbol: str
    signals: Dict
    triggers: Dict
    timestamp: str

class StrategyRecommendationResponse(BaseModel):
    """Response schema for strategy recommendations"""
    strategy: str
    symbol: str = None
    action: str = None
    amount: float = None
    quantity: float = None
    reason: str
    triggered: bool
    signals: Dict = None

@router.get("/strategies", response_model=List[Dict])
async def get_strategies(
    current_user: User = Depends(get_current_user)
) -> List[Dict]:
    """
    Get list of available trading strategies - stub implementation
    
    Returns:
        List of available strategies with metadata
    """
    return [
        {
            "id": "1",
            "name": "RSI Rebound",
            "description": "Buy when RSI drops below 30, sell when above 70",
            "type": "mean_reversion",
            "risk_level": "medium",
            "active": True
        },
        {
            "id": "2", 
            "name": "Momentum Buy",
            "description": "Buy on strong upward momentum with volume confirmation",
            "type": "momentum",
            "risk_level": "high",
            "active": True
        },
        {
            "id": "3",
            "name": "DCA Weekly", 
            "description": "Dollar cost average into positions weekly",
            "type": "accumulation",
            "risk_level": "low",
            "active": True
        },
        {
            "id": "4",
            "name": "Trend Exit",
            "description": "Exit positions when trend reversal signals appear",
            "type": "exit",
            "risk_level": "medium", 
            "active": True
        }
    ]

@router.get("/signal-preview/{symbol}", response_model=SignalPreviewResponse)
async def get_signal_preview(
    symbol: str,
    current_user: User = Depends(get_current_user)
) -> SignalPreviewResponse:
    """
    Get live signal preview for a specific symbol
    
    Args:
        symbol: Cryptocurrency symbol (BTC, ETH, SOL, ADA, DOT, MATIC, LINK, AVAX)
    
    Returns:
        Current technical indicators and signal data
    """
    
    # Validate symbol
    supported_symbols = ["BTC", "ETH", "SOL", "ADA", "DOT", "MATIC", "LINK", "AVAX"]
    if symbol.upper() not in supported_symbols:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Symbol {symbol} not supported. Supported symbols: {', '.join(supported_symbols)}"
        )
    
    try:
        # Get signal data from engine
        signal_data = signal_engine.get_signal_data(symbol.upper())
        
        return SignalPreviewResponse(
            symbol=signal_data["symbol"],
            current_price=signal_data["current_price"],
            rsi=signal_data["rsi"],
            macd=signal_data["macd"],
            ma20=signal_data["ma20"],
            ma50=signal_data["ma50"],
            volume=signal_data["volume"],
            volume_7d_avg=signal_data["volume_7d_avg"],
            volume_ratio=signal_data["volume_ratio"],
            timestamp=signal_data["timestamp"]
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to calculate signals: {str(e)}"
        )

@router.get("/signal-check/{symbol}", response_model=StrategySignalResponse)
async def check_strategy_signals(
    symbol: str,
    current_user: User = Depends(get_current_user)
) -> StrategySignalResponse:
    """
    Check if current signals meet strategy trigger conditions
    
    Args:
        symbol: Cryptocurrency symbol to check
        
    Returns:
        Strategy trigger status for all strategies
    """
    
    # Validate symbol
    supported_symbols = ["BTC", "ETH", "SOL", "ADA", "DOT", "MATIC", "LINK", "AVAX"]
    if symbol.upper() not in supported_symbols:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Symbol {symbol} not supported"
        )
    
    try:
        # Get strategy signal check
        signal_check = signal_engine.check_strategy_signals(symbol.upper())
        
        return StrategySignalResponse(
            symbol=signal_check["symbol"],
            signals=signal_check["signals"],
            triggers=signal_check["triggers"],
            timestamp=signal_check["timestamp"]
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to check strategy signals: {str(e)}"
        )

@router.get("/recommendation/{strategy_name}", response_model=StrategyRecommendationResponse)
async def get_strategy_recommendation(
    strategy_name: str,
    current_user: User = Depends(get_current_user)
) -> StrategyRecommendationResponse:
    """
    Get strategy recommendation based on current signals
    
    Args:
        strategy_name: Name of the strategy to check
        
    Returns:
        Strategy recommendation with trade details
    """
    
    # Validate strategy name
    valid_strategies = ["RSI Rebound", "Momentum Buy", "Trend Exit", "DCA Weekly"]
    if strategy_name not in valid_strategies:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid strategy name. Valid strategies: {', '.join(valid_strategies)}"
        )
    
    try:
        # Get strategy recommendation
        recommendation = signal_engine.get_strategy_recommendation(strategy_name)
        
        # 🧪 FORENSIC: Log strategy recommendation for test15 tracing
        print(f"🧪 Strategy Recommendation for {strategy_name}:")
        print(f"   - Strategy: {recommendation.get('strategy')}")
        print(f"   - Symbol: {recommendation.get('symbol')}")
        print(f"   - Action: {recommendation.get('action')}")
        print(f"   - Triggered: {recommendation.get('triggered')}")
        print(f"   - Reason: {recommendation.get('reason')}")
        
        if "error" in recommendation:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=recommendation["error"]
            )
        
        return StrategyRecommendationResponse(
            strategy=recommendation["strategy"],
            symbol=recommendation.get("symbol"),
            action=recommendation.get("action"),
            amount=recommendation.get("amount"),
            quantity=recommendation.get("quantity"),
            reason=recommendation["reason"],
            triggered=recommendation["triggered"],
            signals=recommendation.get("signals")
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get strategy recommendation: {str(e)}"
        )

@router.get("/signals/overview")
async def get_signals_overview(
    current_user: User = Depends(get_current_user)
) -> Dict:
    """
    Get signal overview for all supported symbols
    
    Returns:
        Overview of signals for all symbols
    """
    
    supported_symbols = ["BTC", "ETH", "SOL", "ADA", "DOT", "MATIC", "LINK", "AVAX"]
    
    try:
        overview = {}
        
        for symbol in supported_symbols:
            signal_data = signal_engine.get_signal_data(symbol)
            overview[symbol] = {
                "current_price": signal_data["current_price"],
                "rsi": signal_data["rsi"],
                "rsi_status": "oversold" if signal_data["rsi"] < 30 else "overbought" if signal_data["rsi"] > 70 else "neutral",
                "price_vs_ma20": "above" if signal_data["current_price"] > signal_data["ma20"] else "below",
                "price_vs_ma50": "above" if signal_data["current_price"] > signal_data["ma50"] else "below",
                "volume_ratio": signal_data["volume_ratio"],
                "volume_status": "high" if signal_data["volume_ratio"] > 2 else "normal"
            }
        
        return {
            "overview": overview,
            "timestamp": signal_data["timestamp"]
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get signals overview: {str(e)}"
        ) 