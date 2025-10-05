from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import List, Optional
from server.auth import get_current_user
from datetime import datetime

router = APIRouter()

class TaxLossRecommendation(BaseModel):
    id: str
    tab: str = 'taxloss'
    asset: str
    action: str
    rationale: str
    markdown: str
    timestamp: str
    completed: bool = False
    accepted: bool = False
    declined: bool = False

@router.get('/api/advisor/taxloss', response_model=List[TaxLossRecommendation])
async def get_taxloss_recommendations(user=Depends(get_current_user)):
    now = datetime.utcnow().isoformat()
    recs = [
        TaxLossRecommendation(
            id=f'taxloss-ADA', asset='ADA', action='Harvest loss', rationale='ADA is at a loss; consider harvesting for tax benefit.', markdown='**Harvest Loss: ADA**\n\nADA is currently at a loss. Realizing this loss may reduce your tax bill.', timestamp=now
        ),
        TaxLossRecommendation(
            id=f'taxloss-SOL', asset='SOL', action='Harvest loss', rationale='SOL is at a loss; consider harvesting for tax benefit.', markdown='**Harvest Loss: SOL**\n\nSOL is currently at a loss. Realizing this loss may reduce your tax bill.', timestamp=now
        )
    ]
    return recs
