from fastapi import APIRouter, Depends
from typing import List, Dict, Any
from server.auth import get_current_user
from server.logic.signal_engine import signal_engine

router = APIRouter()

@router.get("/trades", response_model=List[Dict[str, Any]])
async def get_trades(current_user: Dict = Depends(get_current_user)):
    """Get user's trading history - stub implementation"""
    return [
        {
            "id": "1",
            "symbol": "BTC",
            "side": "buy",
            "quantity": 0.1,
            "price": 45000.0,
            "timestamp": "2024-01-15T10:30:00Z",
            "status": "filled"
        },
        {
            "id": "2", 
            "symbol": "ETH",
            "side": "sell",
            "quantity": 2.0,
            "price": 3200.0,
            "timestamp": "2024-01-14T15:45:00Z",
            "status": "filled"
        }
    ] 