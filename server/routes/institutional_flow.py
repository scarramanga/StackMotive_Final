from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from pydantic import BaseModel
from server.auth import get_current_user
import random

router = APIRouter()

# Models
class InstitutionalFlow(BaseModel):
    id: str
    timestamp: str
    institution: str
    institutionType: str
    symbol: str
    side: str
    volume: float
    price: float
    value: float
    flowType: str
    confidence: float
    source: str
    impactScore: float
    marketCap: float
    percentOfFloat: float
    averageVolume: float
    metadata: Dict[str, Any]

class InstitutionalPosition(BaseModel):
    id: str
    institution: str
    symbol: str
    shares: float
    value: float
    percentOfPortfolio: float
    percentOfFloat: float
    quarterlyChange: float
    yearlyChange: float
    averageCost: float
    lastReported: str
    trend: str
    riskLevel: str

class InstitutionalAlert(BaseModel):
    id: str
    type: str
    severity: str
    title: str
    description: str
    symbol: str
    institution: str
    value: float
    timestamp: str
    isRead: bool
    isActive: bool
    relatedFlows: List[str]

class FlowAnalysis(BaseModel):
    symbol: str
    period: str
    totalInflows: float
    totalOutflows: float
    netFlow: float
    flowVelocity: float
    institutionCount: int
    topInstitutions: List[Dict[str, Any]]
    flowByType: List[Dict[str, Any]]
    priceImpact: Dict[str, float]

# Mock data generators
def generate_mock_flow() -> Dict[str, Any]:
    institutions = ["BlackRock", "Vanguard", "Fidelity", "State Street", "JPMorgan"]
    symbols = ["AAPL", "MSFT", "GOOGL", "AMZN", "TSLA"]
    sources = ["sec_filing", "dark_pool", "block_trade", "options_flow", "insider_trading"]
    
    return {
        "id": f"flow_{random.randint(1000, 9999)}",
        "timestamp": (datetime.now() - timedelta(hours=random.randint(1, 48))).isoformat(),
        "institution": random.choice(institutions),
        "institutionType": random.choice(["hedge_fund", "pension_fund", "bank", "insurance", "sovereign_wealth"]),
        "symbol": random.choice(symbols),
        "side": random.choice(["buy", "sell"]),
        "volume": random.randint(10000, 1000000),
        "price": random.uniform(100, 1000),
        "value": 0,  # Calculated below
        "flowType": random.choice(["inflow", "outflow"]),
        "confidence": random.uniform(0.6, 0.95),
        "source": random.choice(sources),
        "impactScore": random.uniform(1, 10),
        "marketCap": random.uniform(1e9, 1e12),
        "percentOfFloat": random.uniform(0.001, 0.05),
        "averageVolume": random.uniform(1e6, 1e7),
        "metadata": {
            "filingType": "13F" if random.random() > 0.5 else None,
            "reportDate": datetime.now().isoformat() if random.random() > 0.5 else None
        }
    }

# Routes
@router.get("/institutional/flows")
async def get_flow_data(
    user: Dict = Depends(get_current_user),
    vaultId: Optional[str] = None,
    symbols: Optional[List[str]] = Query(None),
    institutions: Optional[List[str]] = Query(None),
    minValue: Optional[float] = None,
    flowType: Optional[str] = None,
    source: Optional[str] = None,
    limit: Optional[int] = 100
) -> Dict[str, Any]:
    """Get institutional flow data with optional filters"""
    
    # Generate mock flows
    flows = []
    for _ in range(20):
        flow = generate_mock_flow()
        flow["value"] = flow["volume"] * flow["price"]
        flows.append(flow)
    
    # Apply filters
    if symbols:
        flows = [f for f in flows if f["symbol"] in symbols]
    if institutions:
        flows = [f for f in flows if f["institution"] in institutions]
    if minValue:
        flows = [f for f in flows if f["value"] >= minValue]
    if flowType:
        flows = [f for f in flows if f["flowType"] == flowType]
    if source:
        flows = [f for f in flows if f["source"] == source]
    
    # Calculate summary
    total_value = sum(f["value"] for f in flows)
    inflows = sum(f["value"] for f in flows if f["flowType"] == "inflow")
    outflows = sum(f["value"] for f in flows if f["flowType"] == "outflow")
    
    return {
        "flows": flows[:limit],
        "positions": [],  # Would be populated with real position data
        "alerts": [],     # Would be populated with real alerts
        "analysis": [],   # Would be populated with real analysis
        "summary": {
            "totalFlows": len(flows),
            "totalValue": total_value,
            "netInflow": inflows - outflows,
            "activeInstitutions": len(set(f["institution"] for f in flows)),
            "topMovers": [
                {
                    "symbol": flows[0]["symbol"],
                    "flow": flows[0]["value"],
                    "change": random.uniform(-10, 10)
                }
            ],
            "marketSentiment": "bullish" if inflows > outflows else "bearish",
            "confidenceLevel": sum(f["confidence"] for f in flows) / len(flows)
        }
    }

@router.get("/institutional/flows/analysis/{symbol}")
async def get_flow_analysis(
    symbol: str,
    period: str = "30d",
    user: Dict = Depends(get_current_user)
) -> FlowAnalysis:
    """Get flow analysis for a specific symbol"""
    return {
        "symbol": symbol,
        "period": period,
        "totalInflows": random.uniform(1e6, 1e7),
        "totalOutflows": random.uniform(1e6, 1e7),
        "netFlow": random.uniform(-1e6, 1e6),
        "flowVelocity": random.uniform(1e4, 1e5),
        "institutionCount": random.randint(5, 20),
        "topInstitutions": [
            {
                "name": "BlackRock",
                "flow": random.uniform(1e5, 1e6),
                "change": random.uniform(-10, 10)
            }
        ],
        "flowByType": [
            {
                "type": "dark_pool",
                "inflow": random.uniform(1e5, 1e6),
                "outflow": random.uniform(1e5, 1e6),
                "net": random.uniform(-1e5, 1e5)
            }
        ],
        "priceImpact": {
            "correlation": random.uniform(-1, 1),
            "lag": random.uniform(0, 24),
            "significance": random.uniform(0.8, 0.99)
        }
    }

@router.post("/institutional/flows/alerts")
async def create_alert(
    alert: InstitutionalAlert,
    user: Dict = Depends(get_current_user)
) -> InstitutionalAlert:
    """Create a new institutional flow alert"""
    # In a real implementation, this would save to database
    return alert

@router.post("/institutional/flows/alerts/{alert_id}/read")
async def mark_alert_as_read(
    alert_id: str,
    user: Dict = Depends(get_current_user)
):
    """Mark an alert as read"""
    # In a real implementation, this would update database
    return {"status": "success"}

@router.post("/institutional/flows/watchlist/analysis")
async def get_watchlist_flow_analysis(
    symbols: List[str],
    period: str = "7d",
    user: Dict = Depends(get_current_user)
) -> List[Dict[str, Any]]:
    """Get flow analysis for watchlist symbols"""
    return [
        {
            "symbol": symbol,
            "netFlow": random.uniform(-1e6, 1e6),
            "flowVelocity": random.uniform(1e4, 1e5),
            "institutionCount": random.randint(5, 20),
            "riskLevel": random.choice(["low", "medium", "high"])
        }
        for symbol in symbols
    ]
