from fastapi import APIRouter, Depends
from typing import List, Dict, Any
from server.auth import get_current_user

router = APIRouter()

@router.get("/trading-accounts", response_model=List[Dict[str, Any]])
async def get_trading_accounts(current_user: Dict = Depends(get_current_user)):
    """Get user's trading accounts - stub implementation"""
    return [
        {
            "id": "1",
            "name": "Paper Trading Account",
            "type": "paper",
            "balance": 100000.0,
            "currency": "USD",
            "is_active": True,
            "created_at": "2024-01-01T00:00:00Z"
        },
        {
            "id": "2", 
            "name": "Demo Crypto Account",
            "type": "demo",
            "balance": 50000.0,
            "currency": "USD", 
            "is_active": True,
            "created_at": "2024-01-01T00:00:00Z"
        }
    ] 