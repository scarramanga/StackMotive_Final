from fastapi import APIRouter
from typing import Dict, List
from pydantic import BaseModel

router = APIRouter()

class CryptoPrice(BaseModel):
    """Response schema for crypto price data"""
    symbol: str
    name: str
    price: float
    change24h: float
    volume24h: float

class HistoricalDataPoint(BaseModel):
    """Response schema for historical price data"""
    timestamp: str
    price: float

class MarketDataResponse(BaseModel):
    """Response schema for market data"""
    symbol: str
    interval: str
    latestPrice: float
    volume: float

# Mock price data for development (replace with real API calls in production)
MOCK_PRICES = {
    # Cryptocurrencies
    "BTC": {"name": "Bitcoin", "price": 95000.00, "change24h": 2.5, "volume24h": 28000000000},
    "ETH": {"name": "Ethereum", "price": 3500.00, "change24h": -1.2, "volume24h": 12000000000},
    "ADA": {"name": "Cardano", "price": 0.85, "change24h": 5.8, "volume24h": 800000000},
    "SOL": {"name": "Solana", "price": 220.00, "change24h": 3.1, "volume24h": 2500000000},
    "DOT": {"name": "Polkadot", "price": 8.50, "change24h": -0.5, "volume24h": 350000000},
    "MATIC": {"name": "Polygon", "price": 1.20, "change24h": 4.2, "volume24h": 450000000},
    "AVAX": {"name": "Avalanche", "price": 45.00, "change24h": 1.8, "volume24h": 650000000},
    "LINK": {"name": "Chainlink", "price": 18.50, "change24h": -2.1, "volume24h": 780000000},
    "UNI": {"name": "Uniswap", "price": 12.50, "change24h": 1.5, "volume24h": 520000000},
    "LTC": {"name": "Litecoin", "price": 85.00, "change24h": -0.8, "volume24h": 900000000},
    "XRP": {"name": "Ripple", "price": 0.65, "change24h": 2.1, "volume24h": 1200000000},
    "DOGE": {"name": "Dogecoin", "price": 0.08, "change24h": 5.2, "volume24h": 600000000},
    # Major Equities
    "AAPL": {"name": "Apple Inc.", "price": 195.50, "change24h": 1.8, "volume24h": 52000000},
    "META": {"name": "Meta Platforms", "price": 425.30, "change24h": -0.9, "volume24h": 18000000},
    "GOOGL": {"name": "Alphabet Inc.", "price": 165.80, "change24h": 2.1, "volume24h": 24000000},
    "MSFT": {"name": "Microsoft Corp.", "price": 415.20, "change24h": 0.5, "volume24h": 21000000},
    "AMZN": {"name": "Amazon.com Inc.", "price": 185.75, "change24h": 1.3, "volume24h": 29000000},
    "TSLA": {"name": "Tesla Inc.", "price": 248.90, "change24h": -2.5, "volume24h": 75000000},
    "NVDA": {"name": "NVIDIA Corp.", "price": 128.45, "change24h": 3.2, "volume24h": 45000000},
    "NFLX": {"name": "Netflix Inc.", "price": 695.20, "change24h": 0.8, "volume24h": 8500000},
    "AMD": {"name": "AMD Inc.", "price": 105.80, "change24h": 2.3, "volume24h": 35000000},
    "JPM": {"name": "JPMorgan Chase", "price": 175.40, "change24h": 0.7, "volume24h": 15000000},
    "V": {"name": "Visa Inc.", "price": 250.60, "change24h": 1.1, "volume24h": 12000000},
    "JNJ": {"name": "Johnson & Johnson", "price": 160.20, "change24h": -0.3, "volume24h": 8000000},
    "WMT": {"name": "Walmart Inc.", "price": 158.90, "change24h": 0.6, "volume24h": 14000000},
    "PG": {"name": "Procter & Gamble", "price": 145.30, "change24h": 0.2, "volume24h": 7000000},
    "HD": {"name": "Home Depot", "price": 335.80, "change24h": 1.4, "volume24h": 9000000},
    "BAC": {"name": "Bank of America", "price": 38.50, "change24h": 1.2, "volume24h": 45000000},
    "DIS": {"name": "Walt Disney Co.", "price": 95.40, "change24h": -1.1, "volume24h": 16000000},
    "KO": {"name": "Coca-Cola Co.", "price": 62.30, "change24h": 0.4, "volume24h": 11000000},
    "PFE": {"name": "Pfizer Inc.", "price": 28.70, "change24h": -0.6, "volume24h": 22000000},
    "XOM": {"name": "Exxon Mobil Corp.", "price": 118.90, "change24h": 2.8, "volume24h": 19000000},
}

@router.get("/market/prices", response_model=List[CryptoPrice])
async def get_crypto_prices():
    """Get current cryptocurrency prices"""
    prices = []
    for symbol, data in MOCK_PRICES.items():
        prices.append(CryptoPrice(
            symbol=symbol,
            name=data["name"],
            price=data["price"],
            change24h=data["change24h"],
            volume24h=data["volume24h"]
        ))
    return prices

@router.get("/market/price/{symbol}", response_model=CryptoPrice)
async def get_crypto_price(symbol: str):
    """Get current price for a specific cryptocurrency"""
    symbol = symbol.upper()
    if symbol not in MOCK_PRICES:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail=f"Price data not found for {symbol}")
    
    data = MOCK_PRICES[symbol]
    return CryptoPrice(
        symbol=symbol,
        name=data["name"],
        price=data["price"],
        change24h=data["change24h"],
        volume24h=data["volume24h"]
    )

@router.get("/market/trending")
async def get_trending_cryptos():
    """Get trending cryptocurrencies"""
    # Return top movers by percentage change
    trending = []
    for symbol, data in MOCK_PRICES.items():
        trending.append({
            "symbol": symbol,
            "name": data["name"],
            "price": data["price"],
            "change24h": data["change24h"]
        })
    
    # Sort by 24h change (descending)
    trending.sort(key=lambda x: x["change24h"], reverse=True)
    return trending[:5]  # Top 5 trending 

@router.get("/broker/historical/{portfolio_id}/{symbol}")
async def get_historical_data(portfolio_id: int, symbol: str):
    """Get historical OHLC data for a symbol in a portfolio"""
    symbol = symbol.upper()
    
    # Get base price from mock data
    base_price = MOCK_PRICES.get(symbol, {"price": 100.0})["price"]
    
    # Generate realistic OHLC data for the last 30 days
    from datetime import datetime, timedelta
    import random
    
    data = []
    current_price = base_price
    
    for i in range(30, 0, -1):  # 30 days ago to today
        date = datetime.now() - timedelta(days=i)
        
        # Generate realistic price movements (±2% daily volatility)
        daily_change = (random.random() - 0.5) * 0.04  # ±2%
        
        open_price = current_price
        close_price = open_price * (1 + daily_change)
        
        # High is above both open and close
        high_price = max(open_price, close_price) * (1 + random.random() * 0.01)
        
        # Low is below both open and close  
        low_price = min(open_price, close_price) * (1 - random.random() * 0.01)
        
        data.append({
            "time": date.strftime("%Y-%m-%d"),
            "open": round(open_price, 2),
            "high": round(high_price, 2),
            "low": round(low_price, 2),
            "close": round(close_price, 2),
            "volume": int(random.uniform(1000000, 10000000))  # Random volume
        })
        
        # Update current price for next iteration
        current_price = close_price
    
    return {
        "symbol": symbol,
        "interval": "1d",
        "data": data
    }

@router.get("/market/marketdata/symbol/{symbol}/{interval}")
async def get_market_data(symbol: str, interval: str):
    """Get market data for a specific symbol and interval"""
    symbol = symbol.upper()
    
    # Get base price from mock data
    base_price = MOCK_PRICES.get(symbol, {"price": 100.0})["price"]
    volume = MOCK_PRICES.get(symbol, {"volume24h": 1000000})["volume24h"]
    
    return {
        "symbol": symbol,
        "interval": interval,
        "latestPrice": base_price,
        "volume": volume,
    }

@router.get("/market/validate-symbol/{symbol}")
async def validate_symbol(symbol: str):
    """Validate if a symbol is available for trading"""
    symbol = symbol.upper()
    
    # Check if symbol exists in our mock data
    is_valid = symbol in MOCK_PRICES
    
    return {
        "symbol": symbol,
        "valid": is_valid,
        "name": MOCK_PRICES.get(symbol, {}).get("name", "Unknown"),
        "price": MOCK_PRICES.get(symbol, {}).get("price", 0) if is_valid else None,
        "exchange": "Mock Exchange" if is_valid else None
    } 