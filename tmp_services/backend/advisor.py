from fastapi import APIRouter, Depends, status
from pydantic import BaseModel
from typing import List, Optional
from server.auth import get_current_user
from datetime import datetime

router = APIRouter()

class AdvisorHistoryEntry(BaseModel):
    id: str
    user_id: str
    tab: str
    asset: Optional[str] = None
    action: str
    rationale: str
    markdown: str
    timestamp: str
    completed: bool
    accepted: bool
    declined: bool

# In-memory store for demo; replace with DB in production
advisor_history_store: List[dict] = []

@router.post('/api/advisor/history', status_code=201)
async def add_advisor_history(entry: AdvisorHistoryEntry, user=Depends(get_current_user)):
    entry.user_id = user.id
    advisor_history_store.append(entry.dict())
    return { 'status': 'ok' }

@router.get('/api/advisor/history', response_model=List[AdvisorHistoryEntry])
async def get_advisor_history(user=Depends(get_current_user)):
    return [e for e in advisor_history_store if e['user_id'] == user.id]

# --- New Stop-Loss/Take-Profit Agent ---
class StopLossRecommendation(BaseModel):
    id: str
    tab: str = 'stoploss'
    asset: str
    action: str
    rationale: str
    markdown: str
    timestamp: str
    completed: bool = False
    accepted: bool = False
    declined: bool = False

@router.get('/api/advisor/stoploss', response_model=List[StopLossRecommendation])
async def get_stoploss_recommendations(user=Depends(get_current_user)):
    # TODO: Replace with real portfolio/market data
    now = datetime.utcnow().isoformat()
    recs = [
        StopLossRecommendation(
            id=f"stoploss-BTC", asset="BTC", action="Set stop-loss at $60,000", rationale="BTC volatility high; protect downside.", markdown="**Set stop-loss for BTC**\n\nBTC has shown high volatility. Setting a stop-loss at $60,000 is recommended.", timestamp=now
        ),
        StopLossRecommendation(
            id=f"takeprofit-ETH", asset="ETH", action="Take profit at $4,000", rationale="ETH momentum slowing; consider profit.", markdown="**Take profit for ETH**\n\nETH momentum is slowing. Taking profit at $4,000 is recommended.", timestamp=now
        )
    ]
    return recs 