from fastapi import APIRouter
from typing import List, Dict, Any
from datetime import datetime

router = APIRouter()

@router.get("/whale-activities")
async def get_whale_activities():
    """Get whale trading activities - mock data for development"""
    return [
        {
            "id": 1,
            "symbol": "BTC",
            "institution": "BlackRock",
            "action": "BUY",
            "amount": "1250.5",
            "valueUsd": "56250000",
            "transactionDate": "2024-06-01T16:45:00Z",
            "confidence": 0.92,
            "exchange": "Binance"
        },
        {
            "id": 2,
            "symbol": "ETH", 
            "institution": "Grayscale",
            "action": "SELL",
            "amount": "15000.0",
            "valueUsd": "48000000",
            "transactionDate": "2024-06-01T14:20:00Z",
            "confidence": 0.88,
            "exchange": "Coinbase"
        },
        {
            "id": 3,
            "symbol": "BTC",
            "institution": "MicroStrategy",
            "action": "ACCUMULATE",
            "amount": "890.25",
            "valueUsd": "40000000",
            "transactionDate": "2024-06-01T11:15:00Z",
            "confidence": 0.85,
            "exchange": "Kraken"
        },
        {
            "id": 4,
            "symbol": "TSLA",
            "institution": "Vanguard",
            "action": "BUY",
            "amount": "50000",
            "valueUsd": "12500000",
            "transactionDate": "2024-06-01T09:30:00Z",
            "confidence": 0.95,
            "exchange": "NYSE"
        },
        {
            "id": 5,
            "symbol": "AAPL",
            "institution": "Berkshire Hathaway",
            "action": "DISTRIBUTE",
            "amount": "25000",
            "valueUsd": "4850000",
            "transactionDate": "2024-05-31T15:45:00Z",
            "confidence": 0.91,
            "exchange": "NASDAQ"
        }
    ]

@router.get("/whale-activities/institutions")
async def get_institutions():
    """Get list of institutions for filtering"""
    return [
        "BlackRock",
        "Grayscale", 
        "MicroStrategy",
        "Vanguard",
        "Berkshire Hathaway",
        "State Street",
        "Fidelity",
        "ARK Invest"
    ] 