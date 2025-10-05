from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import List, Optional
from server.auth import get_current_user
from datetime import datetime

router = APIRouter()

class MacroEventRecommendation(BaseModel):
    id: str
    tab: str = 'macro'
    asset: Optional[str] = None
    action: str
    rationale: str
    markdown: str
    timestamp: str
    completed: bool = False
    accepted: bool = False
    declined: bool = False

@router.get('/api/advisor/macro', response_model=List[MacroEventRecommendation])
async def get_macro_recommendations(user=Depends(get_current_user)):
    now = datetime.utcnow().isoformat()
    recs = [
        MacroEventRecommendation(
            id=f'macro-FED', asset=None, action='Review portfolio', rationale='Fed rate hike expected; increased volatility likely.', markdown='**Macro Alert: Fed Rate Hike**\n\nA Fed rate hike is expected. Review your portfolio for risk.', timestamp=now
        ),
        MacroEventRecommendation(
            id=f'macro-ETH-ETF', asset='ETH', action='Monitor ETH', rationale='ETH ETF approval pending; possible price movement.', markdown='**Macro Alert: ETH ETF**\n\nETH ETF approval is pending. Monitor ETH for volatility.', timestamp=now
        )
    ]
    return recs
