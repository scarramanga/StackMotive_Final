from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import List, Optional
from server.auth import get_current_user
from datetime import datetime

router = APIRouter()

class CustomAgentRecommendation(BaseModel):
    id: str
    tab: str = 'custom'
    asset: Optional[str] = None
    action: str
    rationale: str
    markdown: str
    timestamp: str
    completed: bool = False
    accepted: bool = False
    declined: bool = False

@router.get('/api/advisor/custom', response_model=List[CustomAgentRecommendation])
async def get_custom_recommendations(user=Depends(get_current_user)):
    now = datetime.utcnow().isoformat()
    recs = [
        CustomAgentRecommendation(
            id=f'custom-BTC-drop', asset='BTC', action='Alert: BTC dropped 5%', rationale='BTC price dropped 5% in 24h (user rule).', markdown='**Custom Alert: BTC Drop**\n\nBTC price dropped 5% in 24h. User-defined alert triggered.', timestamp=now
        ),
        CustomAgentRecommendation(
            id=f'custom-ETH-volume', asset='ETH', action='Alert: ETH volume spike', rationale='ETH volume spiked above threshold (user rule).', markdown='**Custom Alert: ETH Volume**\n\nETH volume spiked above user-defined threshold.', timestamp=now
        )
    ]
    return recs
