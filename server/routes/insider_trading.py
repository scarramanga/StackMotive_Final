"""Insider Trading API Routes"""

from fastapi import APIRouter, Depends, Query
from typing import List, Optional
from datetime import datetime, timedelta
from pydantic import BaseModel
from server.auth import get_current_user

router = APIRouter()

class InsiderTrade(BaseModel):
    id: str
    symbol: str
    company_name: str
    insider_name: str
    title: str
    trade_date: datetime
    shares_purchased: int
    shares_sold: int
    price_per_share: float
    total_value: float
    shares_owned: int
    percent_owned: float
    form_type: str

class InsiderAnalytics(BaseModel):
    buy_count: int
    sell_count: int
    net_shares: int
    net_value: float
    largest_trade: InsiderTrade
    top_insiders: List[dict]

class TraderPerformance(BaseModel):
    total_trades: int
    success_rate: float
    average_return: float
    trades: List[InsiderTrade]

@router.get("/trades")
async def get_insider_trades(
    symbol: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    min_value: Optional[float] = None,
    current_user: dict = Depends(get_current_user)
) -> List[InsiderTrade]:
    """Get insider trades with optional filtering"""
    # TODO: Implement actual insider trade data fetching
    # For MVP, return mock data
    return [
        InsiderTrade(
            id="it1",
            symbol="AAPL",
            company_name="Apple Inc.",
            insider_name="John Doe",
            title="Director",
            trade_date=datetime.utcnow() - timedelta(days=1),
            shares_purchased=10000,
            shares_sold=0,
            price_per_share=175.25,
            total_value=1752500.00,
            shares_owned=50000,
            percent_owned=0.001,
            form_type="Form 4"
        )
    ]

@router.get("/analytics/{symbol}")
async def get_insider_analytics(
    symbol: str,
    current_user: dict = Depends(get_current_user)
) -> InsiderAnalytics:
    """Get insider trading analytics for a specific symbol"""
    # TODO: Implement actual analytics calculation
    # For MVP, return mock data
    mock_trade = InsiderTrade(
        id="it1",
        symbol=symbol,
        company_name="Test Company",
        insider_name="John Doe",
        title="Director",
        trade_date=datetime.utcnow() - timedelta(days=1),
        shares_purchased=10000,
        shares_sold=0,
        price_per_share=175.25,
        total_value=1752500.00,
        shares_owned=50000,
        percent_owned=0.001,
        form_type="Form 4"
    )
    
    return InsiderAnalytics(
        buy_count=5,
        sell_count=2,
        net_shares=25000,
        net_value=4375000.00,
        largest_trade=mock_trade,
        top_insiders=[
            {
                "name": "John Doe",
                "total_value": 1752500.00,
                "net_shares": 10000
            }
        ]
    )

@router.get("/trader/{insider_name}")
async def get_trader_performance(
    insider_name: str,
    current_user: dict = Depends(get_current_user)
) -> TraderPerformance:
    """Get performance metrics for a specific insider"""
    # TODO: Implement actual trader performance calculation
    # For MVP, return mock data
    mock_trade = InsiderTrade(
        id="it1",
        symbol="AAPL",
        company_name="Apple Inc.",
        insider_name=insider_name,
        title="Director",
        trade_date=datetime.utcnow() - timedelta(days=1),
        shares_purchased=10000,
        shares_sold=0,
        price_per_share=175.25,
        total_value=1752500.00,
        shares_owned=50000,
        percent_owned=0.001,
        form_type="Form 4"
    )
    
    return TraderPerformance(
        total_trades=10,
        success_rate=0.70,
        average_return=0.15,
        trades=[mock_trade]
    )
