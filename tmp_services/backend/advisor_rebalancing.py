from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import List, Optional
from server.auth import get_current_user
from datetime import datetime

router = APIRouter()

class RebalanceRecommendation(BaseModel):
    id: str
    tab: str = 'rebalance'
    asset: str
    action: str
    rationale: str
    markdown: str
    timestamp: str
    completed: bool = False
    accepted: bool = False
    declined: bool = False

@router.get('/api/advisor/rebalancing', response_model=List[RebalanceRecommendation])
async def get_rebalancing_recommendations(user=Depends(get_current_user)):
    now = datetime.utcnow().isoformat()
    recs = [
        RebalanceRecommendation(
            id=f'rebalance-BTC', asset='BTC', action='Rebalance to 40%', rationale='BTC overweighted in portfolio.', markdown='**Rebalance BTC**\n\nBTC is above target allocation. Rebalance to 40%.', timestamp=now
        ),
        RebalanceRecommendation(
            id=f'rebalance-ETH', asset='ETH', action='Increase to 30%', rationale='ETH underweighted in portfolio.', markdown='**Rebalance ETH**\n\nETH is below target allocation. Increase to 30%.', timestamp=now
        )
    ]
    return recs

