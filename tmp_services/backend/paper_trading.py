from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional, List
from pydantic import BaseModel, Field, validator
from datetime import datetime, timedelta
from enum import Enum
import random

from server.database import get_db
from server.models.paper_trading import PaperTradingAccount, Trade
from server.models.user import User
from server.auth import get_current_user
from server.logic.signal_engine import signal_engine

router = APIRouter()

class TradeType(str, Enum):
    BUY = "buy"
    SELL = "sell"

class TradeStatus(str, Enum):
    PENDING = "pending"
    EXECUTED = "executed"
    CANCELLED = "cancelled"

class StrategyName(str, Enum):
    DCA_WEEKLY = "DCA Weekly"
    RSI_REBOUND = "RSI Rebound"
    MOMENTUM_BUY = "Momentum Buy"
    TREND_EXIT = "Trend Exit"

class SupportedCurrency(str, Enum):
    USD = "USD"
    EUR = "EUR"
    GBP = "GBP"
    AUD = "AUD"
    NZD = "NZD"

class PaperTradingAccountCreate(BaseModel):
    """Request schema for creating a paper trading account"""
    name: str = Field(..., min_length=1, max_length=100, description="Account name")
    currency: SupportedCurrency = Field(default=SupportedCurrency.USD, description="Account currency")
    initialBalance: float = Field(..., ge=1000, le=10000000, description="Initial balance (1,000 - 10,000,000)")
    
    @validator('name')
    def validate_name(cls, v):
        if not v or not v.strip():
            raise ValueError('Account name cannot be empty')
        return v.strip()
    
    @validator('initialBalance')
    def validate_initial_balance(cls, v):
        if v < 1000:
            raise ValueError('Initial balance must be at least 1,000')
        if v > 10000000:
            raise ValueError('Initial balance cannot exceed 10,000,000')
        return round(v, 2)  # Ensure 2 decimal places

class TradeCreate(BaseModel):
    """Request schema for creating a trade"""
    symbol: str  # e.g., "BTC", "ETH"
    tradeType: TradeType
    quantity: float
    price: float  # Price per unit at time of trade

class StrategyAssignment(BaseModel):
    """Request schema for assigning a strategy to an account"""
    strategyName: StrategyName

class TradeResponse(BaseModel):
    """Response schema for trades"""
    id: int
    accountId: int                    # ✅ Consistent with frontend expectations
    symbol: str
    tradeType: str                    # ✅ Fixed: Use tradeType to match frontend expectations
    quantity: float
    price: float
    totalValue: float
    status: TradeStatus
    strategy: Optional[str] = None
    createdAt: datetime
    executedAt: Optional[datetime] = None

    class Config:
        from_attributes = True

class PaperTradingAccountResponse(BaseModel):
    """Response schema for paper trading account"""
    id: int
    userId: str
    name: str
    initialBalance: float
    currentBalance: float
    currency: str
    isActive: bool
    strategyName: Optional[str] = None
    lastStrategyRunAt: Optional[datetime] = None
    createdAt: datetime
    updatedAt: datetime
    # Enhanced portfolio valuation fields
    cashBalance: float
    totalHoldingsValue: float
    totalPortfolioValue: float
    totalProfitLoss: float
    totalProfitLossPercent: float

    class Config:
        from_attributes = True

class HoldingResponse(BaseModel):
    """Response schema for holdings"""
    symbol: str
    quantity: float
    averagePrice: float
    currentPrice: float
    totalValue: float
    profitLoss: float
    profitLossPercent: float

    class Config:
        from_attributes = True

# Enhanced response models for Phase A implementation
class DetailedHoldingResponse(BaseModel):
    """Enhanced holding response with complete market data"""
    symbol: str
    quantity: float
    averagePrice: float
    currentPrice: float
    totalValue: float
    profitLoss: float
    profitLossPercent: float
    costBasis: float
    allocation: float  # Percentage of total portfolio
    type: str  # 'equity' or 'crypto'

    class Config:
        from_attributes = True

class AssetPerformanceResponse(BaseModel):
    """Asset performance based on executed BUY trades only"""
    assetPerformanceValue: float
    assetPerformancePercent: float
    assetPerformanceIsPositive: bool
    hasTradeHistory: bool
    costBasisFromTrades: float
    currentValueFromTrades: float

    class Config:
        from_attributes = True

class EnhancedPaperTradingAccountResponse(BaseModel):
    """Enhanced response with complete portfolio breakdown"""
    # Core account info
    id: int
    userId: str
    name: str
    initialBalance: float
    currentBalance: float
    currency: str
    isActive: bool
    strategyName: Optional[str] = None
    lastStrategyRunAt: Optional[datetime] = None
    createdAt: datetime
    updatedAt: datetime
    
    # Portfolio summary (consistent with current API)
    cashBalance: float
    totalHoldingsValue: float
    totalPortfolioValue: float
    totalProfitLoss: float
    totalProfitLossPercent: float
    
    # NEW: Complete holdings breakdown
    holdings: List[DetailedHoldingResponse]
    
    # NEW: Asset performance calculation
    assetPerformance: AssetPerformanceResponse
    
    # NEW: Recent trades (last 3 executed)
    recentTrades: List[TradeResponse]

    class Config:
        from_attributes = True

__all__ = ["router", "PaperTradingAccountResponse", "TradeResponse", "HoldingResponse", 
           "EnhancedPaperTradingAccountResponse", "DetailedHoldingResponse", "AssetPerformanceResponse"]

def _calculate_portfolio_valuation(account: PaperTradingAccount, db: Session) -> dict:
    """Helper function to calculate portfolio valuation data with proper P&L tracking"""
    
    # Start with initial balance and calculate actual cash position from trades
    initial_balance = float(account.initial_balance)
    cash_balance = initial_balance  # Start with initial balance
    
    total_holdings_value = 0.0
    total_realized_pnl = 0.0  # Track realized gains/losses from completed trades
    total_unrealized_pnl = 0.0  # Track unrealized gains/losses on current holdings
    
    # Get all executed trades for portfolio calculation
    trades = db.query(Trade).filter(
        Trade.account_id == account.id,
        Trade.status == 'executed'
    ).order_by(Trade.created_at).all()  # Order by time for FIFO cost basis calculation
    
    # Calculate cash balance changes from all trades
    for trade in trades:
        trade_value = trade.quantity * trade.price
        if trade.side == 'buy':
            cash_balance -= trade_value  # Spend cash on purchases
        else:  # sell
            cash_balance += trade_value  # Receive cash from sales
    
    # Calculate holdings and realized P&L by symbol using FIFO method
    holdings_dict = {}
    for trade in trades:
        symbol = trade.symbol
        if symbol not in holdings_dict:
            holdings_dict[symbol] = {
                "quantity": 0.0,
                "cost_basis": 0.0,  # Total cost basis of current holdings
                "realized_pnl": 0.0  # Realized P&L from sells
            }
        
        if trade.side == 'buy':
            # Add to holdings
            holdings_dict[symbol]["quantity"] += trade.quantity
            holdings_dict[symbol]["cost_basis"] += trade.quantity * trade.price
            
        else:  # sell
            # Calculate realized P&L for the sold quantity
            if holdings_dict[symbol]["quantity"] > 0:
                # FIFO: Use average cost basis for the sale
                avg_cost_per_unit = holdings_dict[symbol]["cost_basis"] / holdings_dict[symbol]["quantity"]
                
                # Calculate realized gain/loss on the sold quantity
                sold_cost_basis = trade.quantity * avg_cost_per_unit
                sale_proceeds = trade.quantity * trade.price
                realized_gain = sale_proceeds - sold_cost_basis
                
                holdings_dict[symbol]["realized_pnl"] += realized_gain
                total_realized_pnl += realized_gain
                
                # Remove sold quantity and proportional cost basis
                holdings_dict[symbol]["quantity"] -= trade.quantity
                holdings_dict[symbol]["cost_basis"] -= sold_cost_basis
                
                # Ensure no negative quantities due to rounding
                if holdings_dict[symbol]["quantity"] < 0.001:
                    holdings_dict[symbol]["quantity"] = 0.0
                    holdings_dict[symbol]["cost_basis"] = 0.0
    
    # Calculate current values and unrealized P&L using live prices
    for symbol, data in holdings_dict.items():
        if data["quantity"] > 0:  # Only include positive holdings
            # Get current price from signal engine
            try:
                signal_data = signal_engine.get_signal_data(symbol)
                current_price = signal_data["current_price"]
            except:
                # Fallback: use average cost if signal data not available
                avg_price = data["cost_basis"] / data["quantity"] if data["quantity"] > 0 else 0
                current_price = avg_price
            
            # Calculate unrealized P&L on current holdings
            current_value = data["quantity"] * current_price
            unrealized_gain = current_value - data["cost_basis"]
            
            total_holdings_value += current_value
            total_unrealized_pnl += unrealized_gain
    
    # Calculate total portfolio metrics
    total_portfolio_value = cash_balance + total_holdings_value
    
    # Total P&L = Realized P&L + Unrealized P&L
    total_profit_loss = total_realized_pnl + total_unrealized_pnl
    total_profit_loss_percent = ((total_portfolio_value - initial_balance) / initial_balance * 100) if initial_balance > 0 else 0
    
    return {
        "cashBalance": round(cash_balance, 2),
        "totalHoldingsValue": round(total_holdings_value, 2),
        "totalPortfolioValue": round(total_portfolio_value, 2),
        "totalProfitLoss": round(total_profit_loss, 2),
        "totalProfitLossPercent": round(total_profit_loss_percent, 2)
    }

def _calculate_asset_performance_from_trades(account_id: int, db: Session) -> dict:
    """Calculate asset performance using executed BUY trades only for cost basis"""
    
    # Get all executed BUY trades for cost basis calculation
    buy_trades = db.query(Trade).filter(
        Trade.account_id == account_id,
        Trade.status == 'executed',
        Trade.side == 'buy'
    ).all()
    
    if not buy_trades:
        return {
            "assetPerformanceValue": 0.0,
            "assetPerformancePercent": 0.0,
            "assetPerformanceIsPositive": False,
            "hasTradeHistory": False,
            "costBasisFromTrades": 0.0,
            "currentValueFromTrades": 0.0
        }
    
    # Calculate cost basis from BUY trades only
    cost_basis_by_symbol = {}
    quantity_by_symbol = {}
    
    for trade in buy_trades:
        symbol = trade.symbol
        if symbol not in cost_basis_by_symbol:
            cost_basis_by_symbol[symbol] = 0.0
            quantity_by_symbol[symbol] = 0.0
        
        cost_basis_by_symbol[symbol] += trade.quantity * trade.price
        quantity_by_symbol[symbol] += trade.quantity
    
    # Calculate current value using signal engine prices
    total_cost_basis = 0.0
    total_current_value = 0.0
    
    for symbol, cost_basis in cost_basis_by_symbol.items():
        if quantity_by_symbol[symbol] > 0:
            try:
                signal_data = signal_engine.get_signal_data(symbol)
                current_price = signal_data["current_price"]
            except:
                # Fallback to average price if signal unavailable
                avg_price = cost_basis / quantity_by_symbol[symbol]
                current_price = avg_price
            
            current_value = quantity_by_symbol[symbol] * current_price
            
            total_cost_basis += cost_basis
            total_current_value += current_value
    
    # Calculate performance metrics
    asset_performance_value = total_current_value - total_cost_basis
    asset_performance_percent = (asset_performance_value / total_cost_basis * 100) if total_cost_basis > 0 else 0.0
    
    return {
        "assetPerformanceValue": round(asset_performance_value, 2),
        "assetPerformancePercent": round(asset_performance_percent, 2),
        "assetPerformanceIsPositive": asset_performance_value >= 0,
        "hasTradeHistory": True,
        "costBasisFromTrades": round(total_cost_basis, 2),
        "currentValueFromTrades": round(total_current_value, 2)
    }

def _get_detailed_holdings_breakdown(account_id: int, db: Session) -> List[dict]:
    """Get detailed holdings breakdown with market data from signal engine only"""
    
    # Get all executed trades for holdings calculation
    trades = db.query(Trade).filter(
        Trade.account_id == account_id,
        Trade.status == 'executed'
    ).order_by(Trade.created_at).all()
    
    # Calculate holdings by symbol using FIFO method
    holdings_dict = {}
    for trade in trades:
        symbol = trade.symbol
        if symbol not in holdings_dict:
            holdings_dict[symbol] = {
                "quantity": 0.0,
                "cost_basis": 0.0
            }
        
        if trade.side == 'buy':
            holdings_dict[symbol]["quantity"] += trade.quantity
            holdings_dict[symbol]["cost_basis"] += trade.quantity * trade.price
        else:  # sell
            if holdings_dict[symbol]["quantity"] > 0:
                # Calculate proportional cost basis reduction
                sell_ratio = trade.quantity / holdings_dict[symbol]["quantity"]
                cost_reduction = holdings_dict[symbol]["cost_basis"] * sell_ratio
                
                holdings_dict[symbol]["quantity"] -= trade.quantity
                holdings_dict[symbol]["cost_basis"] -= cost_reduction
                
                # Clean up zero/negative quantities
                if holdings_dict[symbol]["quantity"] < 0.001:
                    holdings_dict[symbol]["quantity"] = 0.0
                    holdings_dict[symbol]["cost_basis"] = 0.0
    
    # Build detailed holdings response with current prices from signal engine
    holdings = []
    total_portfolio_value = 0.0
    
    # First pass: calculate total portfolio value for allocation percentages
    for symbol, data in holdings_dict.items():
        if data["quantity"] > 0:
            try:
                signal_data = signal_engine.get_signal_data(symbol)
                current_price = signal_data["current_price"]
            except:
                avg_price = data["cost_basis"] / data["quantity"] if data["quantity"] > 0 else 0
                current_price = avg_price
            
            current_value = data["quantity"] * current_price
            total_portfolio_value += current_value
    
    # Second pass: create detailed holding objects
    for symbol, data in holdings_dict.items():
        if data["quantity"] > 0:
            avg_price = data["cost_basis"] / data["quantity"] if data["quantity"] > 0 else 0
            
            try:
                signal_data = signal_engine.get_signal_data(symbol)
                current_price = signal_data["current_price"]
            except:
                current_price = avg_price
            
            current_value = data["quantity"] * current_price
            profit_loss = current_value - data["cost_basis"]
            profit_loss_percent = (profit_loss / data["cost_basis"] * 100) if data["cost_basis"] > 0 else 0
            allocation = (current_value / total_portfolio_value * 100) if total_portfolio_value > 0 else 0
            
            # Determine asset type based on symbol
            asset_type = "crypto" if symbol in ["BTC", "ETH", "ADA", "SOL", "DOT", "MATIC", "AVAX", "LINK", "UNI", "LTC", "XRP", "DOGE"] else "equity"
            
            holdings.append({
                "symbol": symbol,
                "quantity": round(data["quantity"], 8),
                "averagePrice": round(avg_price, 2),
                "currentPrice": round(current_price, 2),
                "totalValue": round(current_value, 2),
                "profitLoss": round(profit_loss, 2),
                "profitLossPercent": round(profit_loss_percent, 2),
                "costBasis": round(data["cost_basis"], 2),
                "allocation": round(allocation, 1),
                "type": asset_type
            })
    
    return holdings

def _get_recent_trades(account_id: int, db: Session, limit: int = 3) -> List[dict]:
    """Get recent executed trades for the account"""
    
    trades = db.query(Trade).filter(
        Trade.account_id == account_id,
        Trade.status == 'executed'
    ).order_by(Trade.created_at.desc()).limit(limit).all()
    
    recent_trades = []
    for trade in trades:
        recent_trades.append({
            "id": trade.id,
            "accountId": trade.account_id,
            "symbol": trade.symbol,
            "tradeType": trade.side.upper(),  # Ensure uppercase for consistency
            "quantity": trade.quantity,
            "price": trade.price,
            "totalValue": trade.quantity * trade.price,
            "status": trade.status,
            "strategy": None,  # Can be enhanced later
            "createdAt": trade.created_at,
            "executedAt": trade.executed_at
        })
    
    return recent_trades

@router.get("/user/paper-trading-account", response_model=PaperTradingAccountResponse)
async def get_paper_trading_account(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> PaperTradingAccountResponse:
    """Get the user's paper trading account with comprehensive portfolio valuation"""
    
    print("📨 Incoming GET to /api/user/paper-trading-account")
    print(f"🧪 Fetching paper account for user_id = {current_user.id}")
    
    account = db.query(PaperTradingAccount).filter(
        PaperTradingAccount.user_id == current_user.id
    ).first()
    
    # 🔍 Debug logging
    if account:
        print(f"🔍 Found account for user {current_user.id}: ID {account.id}, Name: {account.name}")
    else:
        print(f"🔍 No account found for user {current_user.id}")
    
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No paper trading account found"
        )
    
    # Calculate portfolio valuation
    portfolio_data = _calculate_portfolio_valuation(account, db)
    
    # 🔍 Debug logging for portfolio calculation
    print(f"🔍 Portfolio calculation result for account {account.id}:")
    for key, value in portfolio_data.items():
        print(f"   - {key}: ${value:,.2f}")

    # 🧠 FORENSIC TRACE: Log values being returned for user_id=98 / account_id=83
    if current_user.id == 98 and account.id == 83:
        print("🧠 API RETURN for user_id=98 / account_id=83")
        print({
            "initialBalance": float(account.initial_balance),
            "cashBalance": portfolio_data["cashBalance"],
            "totalHoldingsValue": portfolio_data["totalHoldingsValue"],
            "totalPortfolioValue": portfolio_data["totalPortfolioValue"],
            "totalProfitLoss": portfolio_data["totalProfitLoss"],
        })

    return PaperTradingAccountResponse(
        id=account.id,
        userId=str(account.user_id),
        name=account.name,
        initialBalance=float(account.initial_balance),
        currentBalance=float(account.current_balance),
        currency=account.currency,
        isActive=account.is_active,
        strategyName=account.strategy_name,
        lastStrategyRunAt=account.last_strategy_run_at,
        createdAt=account.created_at,
        updatedAt=account.updated_at or account.created_at,
        **portfolio_data
    )

@router.get("/user/paper-trading-account/dashboard", response_model=EnhancedPaperTradingAccountResponse)
async def get_paper_trading_dashboard(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> EnhancedPaperTradingAccountResponse:
    """
    🚀 PHASE A - Enhanced dashboard endpoint providing all data in one call
    
    This endpoint eliminates the need for frontend calculations by providing:
    - Complete portfolio valuation (using signal engine prices only)
    - Detailed holdings breakdown with allocations
    - Asset performance calculation (BUY trades cost basis only)
    - Recent executed trades (last 3)
    
    This is the new single source of truth for dashboard data.
    """
    
    print("📨 GET /api/user/paper-trading-account/dashboard")
    print(f"🧪 Fetching enhanced dashboard for user_id = {current_user.id}")
    
    account = db.query(PaperTradingAccount).filter(
        PaperTradingAccount.user_id == current_user.id
    ).first()
    
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No paper trading account found"
        )
    
    print(f"🔍 Processing enhanced dashboard for account {account.id}")
    
    # Calculate base portfolio valuation (existing logic)
    portfolio_data = _calculate_portfolio_valuation(account, db)
    
    # NEW: Get detailed holdings breakdown with Signal Engine prices
    holdings_breakdown = _get_detailed_holdings_breakdown(account.id, db)
    
    # NEW: Calculate asset performance from BUY trades only
    asset_performance = _calculate_asset_performance_from_trades(account.id, db)
    
    # NEW: Get recent executed trades
    recent_trades = _get_recent_trades(account.id, db, limit=3)
    
    print(f"🔍 Enhanced dashboard calculation results for account {account.id}:")
    print(f"   - Portfolio Value: ${portfolio_data['totalPortfolioValue']:,.2f}")
    print(f"   - Holdings Count: {len(holdings_breakdown)}")
    print(f"   - Asset Performance: ${asset_performance['assetPerformanceValue']:,.2f} ({asset_performance['assetPerformancePercent']:.2f}%)")
    print(f"   - Recent Trades: {len(recent_trades)}")
    
    # Create response objects
    holdings_response = [
        DetailedHoldingResponse(**holding) for holding in holdings_breakdown
    ]
    
    performance_response = AssetPerformanceResponse(**asset_performance)
    
    trades_response = [
        TradeResponse(**trade) for trade in recent_trades
    ]
    
    return EnhancedPaperTradingAccountResponse(
        # Core account info
        id=account.id,
        userId=str(account.user_id),
        name=account.name,
        initialBalance=float(account.initial_balance),
        currentBalance=float(account.current_balance),
        currency=account.currency,
        isActive=account.is_active,
        strategyName=account.strategy_name,
        lastStrategyRunAt=account.last_strategy_run_at,
        createdAt=account.created_at,
        updatedAt=account.updated_at or account.created_at,
        
        # Portfolio summary (backward compatible)
        **portfolio_data,
        
        # NEW: Enhanced data for frontend
        holdings=holdings_response,
        assetPerformance=performance_response,
        recentTrades=trades_response
    )

@router.post("/user/paper-trading-account", response_model=PaperTradingAccountResponse)
async def create_paper_trading_account(
    account_data: PaperTradingAccountCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> PaperTradingAccountResponse:
    """Create a new paper trading account for the user"""
    
    print("📨 Incoming POST to /api/user/paper-trading-account")
    print(f"📨 Payload: {account_data}")
    
    try:
        # 🔍 Debug logging - Log the request details
        print(f"🔍 Creating paper trading account for user {current_user.id} ({current_user.email})")
        print(f"🔍 Account data: {account_data.dict()}")
        
        # Check if user already has a paper trading account
        existing_account = db.query(PaperTradingAccount).filter(
            PaperTradingAccount.user_id == current_user.id
        ).first()
        
        # 🔍 Debug logging - Log existing account check
        if existing_account:
            print(f"🔍 Found existing account for user {current_user.id}: ID {existing_account.id}, Name: {existing_account.name}")
        else:
            print(f"🔍 No existing account found for user {current_user.id}")
        
        # ✅ NEW LOGIC: Return existing account instead of throwing error
        if existing_account:
            print(f"🔍 Returning existing account for user {current_user.id}")
            
            # Calculate portfolio valuation for existing account
            try:
                portfolio_data = _calculate_portfolio_valuation(existing_account, db)
                print(f"🔍 Portfolio data calculated for existing account: {portfolio_data}")
            except Exception as e:
                print(f"🔍 Error calculating portfolio data for existing account: {str(e)}")
                # Fallback to default values
                portfolio_data = {
                    "cashBalance": float(existing_account.current_balance),
                    "totalHoldingsValue": 0.0,
                    "totalPortfolioValue": float(existing_account.current_balance),
                    "totalProfitLoss": 0.0,
                    "totalProfitLossPercent": 0.0
                }
            
            # Return existing account with status
            return PaperTradingAccountResponse(
                id=existing_account.id,
                userId=str(existing_account.user_id),
                name=existing_account.name,
                initialBalance=float(existing_account.initial_balance),
                currentBalance=float(existing_account.current_balance),
                currency=existing_account.currency,
                isActive=existing_account.is_active,
                strategyName=existing_account.strategy_name,
                lastStrategyRunAt=existing_account.last_strategy_run_at,
                createdAt=existing_account.created_at,
                updatedAt=existing_account.updated_at or existing_account.created_at,
                **portfolio_data
            )
        
        # Validate currency is supported
        if account_data.currency.value not in [c.value for c in SupportedCurrency]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Currency {account_data.currency} is not supported. Supported currencies: {', '.join([c.value for c in SupportedCurrency])}"
            )
        
        print(f"🔍 Creating new account for user {current_user.id}")
        print(f"🔍 Input values - name: '{account_data.name}', initialBalance: {account_data.initialBalance}")
        
        # Create new paper trading account
        new_account = PaperTradingAccount(
            user_id=current_user.id,
            name=account_data.name,
            initial_balance=account_data.initialBalance,
            current_balance=account_data.initialBalance,
            currency=account_data.currency.value,
            is_active=True
        )
        
        print(f"🔍 Before DB commit - new_account.name: '{new_account.name}', new_account.initial_balance: {new_account.initial_balance}")
        
        db.add(new_account)
        db.commit()
        db.refresh(new_account)
        
        print(f"🔍 After DB commit - new_account.name: '{new_account.name}', new_account.initial_balance: {new_account.initial_balance}")
        print(f"🔍 Successfully created account ID {new_account.id} for user {current_user.id}")
        
        # Calculate portfolio valuation (will be zero for new account)
        try:
            portfolio_data = _calculate_portfolio_valuation(new_account, db)
            print(f"🔍 Portfolio data calculated: {portfolio_data}")
        except Exception as e:
            print(f"🔍 Error calculating portfolio data: {str(e)}")
            # Fallback to default values for new account
            portfolio_data = {
                "cashBalance": float(new_account.current_balance),
                "totalHoldingsValue": 0.0,
                "totalPortfolioValue": float(new_account.current_balance),
                "totalProfitLoss": 0.0,
                "totalProfitLossPercent": 0.0
            }
        
        # Ensure datetime fields are properly handled
        created_at = new_account.created_at
        updated_at = new_account.updated_at if new_account.updated_at else new_account.created_at
        
        print(f"🔍 Creating response with dates: created_at={created_at}, updated_at={updated_at}")
        
        try:
            response_data = PaperTradingAccountResponse(
                id=new_account.id,
                userId=str(new_account.user_id),
                name=new_account.name,
                initialBalance=float(new_account.initial_balance),
                currentBalance=float(new_account.current_balance),
                currency=new_account.currency,
                isActive=new_account.is_active,
                strategyName=new_account.strategy_name,
                lastStrategyRunAt=new_account.last_strategy_run_at,
                createdAt=created_at,
                updatedAt=updated_at,
                **portfolio_data
            )
            
            print(f"🔍 Response created successfully")
            return response_data
        except Exception as e:
            print(f"🔍 Error creating response: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error creating response: {str(e)}"
            )
    
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except ValueError as e:
        # Handle validation errors
        print(f"🔍 Validation error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        # Handle any other errors
        print(f"🔍 Unexpected error creating account: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while creating the account. Please try again."
        )

@router.post("/user/paper-trading-account/{account_id}/trades", response_model=TradeResponse)
async def create_trade(
    account_id: int,
    trade_data: TradeCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> TradeResponse:
    """Create a new trade for the paper trading account with correct field mappings"""
    
    # Verify the account belongs to the current user
    account = db.query(PaperTradingAccount).filter(
        PaperTradingAccount.id == account_id,
        PaperTradingAccount.user_id == current_user.id
    ).first()
    
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Paper trading account not found"
        )
    
    # Calculate total trade value
    total_value = trade_data.quantity * trade_data.price
    
    # Check if user has sufficient balance for buy orders
    if trade_data.tradeType == TradeType.BUY:
        if account.current_balance < total_value:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Insufficient balance for this trade"
            )
        # Deduct from balance for buy orders
        account.current_balance -= total_value
    else:  # SELL order - 🛡️ CRITICAL: Validate holdings ownership
        print(f"🛡️ BACKEND SELL VALIDATION - User {current_user.id} attempting to sell {trade_data.quantity} {trade_data.symbol}")
        
        # Get all executed trades to calculate current holdings
        trades = db.query(Trade).filter(
            Trade.account_id == account_id,
            Trade.status == 'executed'
        ).order_by(Trade.created_at).all()
        
        # Calculate current holdings for the symbol
        holdings_dict = {}
        for trade in trades:
            symbol = trade.symbol
            if symbol not in holdings_dict:
                holdings_dict[symbol] = {"quantity": 0.0}
            
            if trade.side == 'buy':
                holdings_dict[symbol]["quantity"] += trade.quantity
            else:  # sell
                holdings_dict[symbol]["quantity"] -= trade.quantity
        
        # Check if user owns enough of the asset
        current_holdings = holdings_dict.get(trade_data.symbol.upper(), {"quantity": 0.0})["quantity"]
        print(f"🛡️ BACKEND SELL VALIDATION - Current holdings of {trade_data.symbol}: {current_holdings}")
        
        if current_holdings < trade_data.quantity:
            print(f"❌ BACKEND SELL BLOCKED - Insufficient holdings. Has: {current_holdings}, Trying to sell: {trade_data.quantity}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Insufficient holdings. You have {current_holdings} {trade_data.symbol}, but trying to sell {trade_data.quantity}"
            )
        
        print(f"✅ BACKEND SELL APPROVED - Selling {trade_data.quantity} out of {current_holdings} {trade_data.symbol}")
        # Add to balance for valid sell orders
        account.current_balance += total_value
    
    # ✅ Fixed: Create trade with correct field names
    new_trade = Trade(
        account_id=account_id,                             # ✅ Fixed: Use account_id
        symbol=trade_data.symbol.upper(),
        side=trade_data.tradeType.value,                   # ✅ Fixed: Use side field
        quantity=trade_data.quantity,
        price=trade_data.price,
        order_type="market",
        status=TradeStatus.EXECUTED.value,
        executed_at=datetime.utcnow().isoformat(),         # ✅ Fixed: Store as string
        created_at=datetime.utcnow().isoformat()           # ✅ Fixed: Store as string
    )
    
    db.add(new_trade)
    account.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(new_trade)
    
    # ✅ Fixed: Return response with correct field mappings
    return TradeResponse(
        id=new_trade.id,
        accountId=new_trade.account_id,                    # ✅ Fixed: Correct field
        symbol=new_trade.symbol,
        tradeType=new_trade.side.upper(),                  # ✅ Fixed: Map side to tradeType with proper case
        quantity=new_trade.quantity,
        price=new_trade.price,
        totalValue=new_trade.quantity * new_trade.price,   # ✅ Fixed: Calculate total value
        status=TradeStatus(new_trade.status),
        strategy=account.strategy_name,                    # ✅ Keep using account strategy for manual trades
        createdAt=datetime.fromisoformat(new_trade.created_at) if isinstance(new_trade.created_at, str) else new_trade.created_at,
        executedAt=datetime.fromisoformat(new_trade.executed_at) if new_trade.executed_at and isinstance(new_trade.executed_at, str) else new_trade.executed_at
    )

@router.get("/user/paper-trading-account/{account_id}/trades", response_model=List[TradeResponse])
async def get_trades(
    account_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: int = 50
) -> List[TradeResponse]:
    """Get trade history for the paper trading account with correct field mappings"""
    
    # Verify the account belongs to the current user
    account = db.query(PaperTradingAccount).filter(
        PaperTradingAccount.id == account_id,
        PaperTradingAccount.user_id == current_user.id
    ).first()
    
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Paper trading account not found"
        )
    
    # ✅ Fixed: Use correct field name account_id
    trades = db.query(Trade).filter(
        Trade.account_id == account_id
    ).order_by(Trade.created_at.desc()).limit(limit).all()
    
    # 🧪 FORENSIC: Log trades for test15 tracing
    if account_id == 83:  # test15's account
        print(f"🧪 Trades for test15 account_id={account_id}:")
        for trade in trades:
            print(f"   - ID: {trade.id}, Symbol: {trade.symbol}, Side: {trade.side}, Quantity: {trade.quantity}, Price: {trade.price}, Status: {trade.status}")
    
    return [
        TradeResponse(
            id=trade.id,
            accountId=trade.account_id,                    # ✅ Fixed: Correct field mapping
            symbol=trade.symbol,
            tradeType=trade.side.upper(),                  # ✅ Fixed: Map side to tradeType with proper case
            quantity=trade.quantity,
            price=trade.price,
            totalValue=trade.quantity * trade.price,       # ✅ Fixed: Calculate from quantity * price
            status=TradeStatus(trade.status),
            strategy=getattr(trade, 'strategy', None) or account.strategy_name,  # ✅ Fixed: Use trade.strategy with fallback
            createdAt=datetime.fromisoformat(trade.created_at) if isinstance(trade.created_at, str) else trade.created_at,
            executedAt=datetime.fromisoformat(trade.executed_at) if trade.executed_at and isinstance(trade.executed_at, str) else trade.executed_at
        )
        for trade in trades
    ]

@router.get("/user/paper-trading-account/{account_id}/holdings", response_model=List[HoldingResponse])
async def get_holdings(
    account_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> List[HoldingResponse]:
    """Get current holdings for the paper trading account with accurate FIFO-based cost basis and P&L"""
    
    # Verify the account belongs to the current user
    account = db.query(PaperTradingAccount).filter(
        PaperTradingAccount.id == account_id,
        PaperTradingAccount.user_id == current_user.id
    ).first()
    
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Paper trading account not found"
        )
    
    # Get all executed trades for this account, ordered by time for FIFO processing
    trades = db.query(Trade).filter(
        Trade.account_id == account_id,
        Trade.status == 'executed'
    ).order_by(Trade.created_at).all()
    
    # Calculate holdings by symbol using FIFO method (same logic as Step 2)
    holdings_dict = {}
    for trade in trades:
        symbol = trade.symbol
        if symbol not in holdings_dict:
            holdings_dict[symbol] = {
                "quantity": 0.0,
                "cost_basis": 0.0,  # Total cost basis of current holdings
                "realized_pnl": 0.0  # Track realized P&L (for debugging)
            }
        
        if trade.side == 'buy':
            # Add to holdings
            holdings_dict[symbol]["quantity"] += trade.quantity
            holdings_dict[symbol]["cost_basis"] += trade.quantity * trade.price
            
        else:  # sell
            # Calculate realized P&L for the sold quantity using FIFO
            if holdings_dict[symbol]["quantity"] > 0:
                # FIFO: Use average cost basis for the sale
                avg_cost_per_unit = holdings_dict[symbol]["cost_basis"] / holdings_dict[symbol]["quantity"]
                
                # Calculate realized gain/loss on the sold quantity
                sold_cost_basis = trade.quantity * avg_cost_per_unit
                sale_proceeds = trade.quantity * trade.price
                realized_gain = sale_proceeds - sold_cost_basis
                
                holdings_dict[symbol]["realized_pnl"] += realized_gain
                
                # Remove sold quantity and proportional cost basis
                holdings_dict[symbol]["quantity"] -= trade.quantity
                holdings_dict[symbol]["cost_basis"] -= sold_cost_basis
                
                # Ensure no negative quantities due to rounding
                if holdings_dict[symbol]["quantity"] < 0.001:
                    holdings_dict[symbol]["quantity"] = 0.0
                    holdings_dict[symbol]["cost_basis"] = 0.0
    
    # Build holdings response with live prices and accurate P&L calculations
    holdings = []
    
    for symbol, data in holdings_dict.items():
        if data["quantity"] > 0:  # Only include positive holdings
            # Calculate average price from current cost basis
            avg_price = data["cost_basis"] / data["quantity"] if data["quantity"] > 0 else 0
            
            # Get current price from signal engine
            try:
                signal_data = signal_engine.get_signal_data(symbol)
                current_price = signal_data["current_price"]
            except:
                # Fallback to average price if signal data not available
                current_price = avg_price
            
            # Calculate current value and unrealized P&L
            current_value = data["quantity"] * current_price
            unrealized_pnl = current_value - data["cost_basis"]  # Current value vs cost basis
            unrealized_pnl_percent = (unrealized_pnl / data["cost_basis"] * 100) if data["cost_basis"] > 0 else 0
            
            holdings.append(HoldingResponse(
                symbol=symbol,
                quantity=round(data["quantity"], 8),
                averagePrice=round(avg_price, 2),           # averageCost
                currentPrice=round(current_price, 2),
                totalValue=round(current_value, 2),         # currentValue  
                profitLoss=round(unrealized_pnl, 2),        # unrealizedPnL
                profitLossPercent=round(unrealized_pnl_percent, 2)
            ))
    
    return holdings

# Strategy endpoints

@router.post("/user/paper-trading-account/{account_id}/strategy", response_model=PaperTradingAccountResponse)
async def assign_strategy(
    account_id: int,
    strategy_data: StrategyAssignment,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> PaperTradingAccountResponse:
    """Assign a trading strategy to the paper trading account"""
    
    # Verify the account belongs to the current user
    account = db.query(PaperTradingAccount).filter(
        PaperTradingAccount.id == account_id,
        PaperTradingAccount.user_id == current_user.id
    ).first()
    
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Paper trading account not found"
        )
    
    # Update strategy
    account.strategy_name = strategy_data.strategyName.value
    account.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(account)
    
    # Calculate portfolio valuation
    portfolio_data = _calculate_portfolio_valuation(account, db)
    
    return PaperTradingAccountResponse(
        id=account.id,
        userId=str(account.user_id),
        name=account.name,
        initialBalance=float(account.initial_balance),
        currentBalance=float(account.current_balance),
        currency=account.currency,
        isActive=account.is_active,
        strategyName=account.strategy_name,
        lastStrategyRunAt=account.last_strategy_run_at,
        createdAt=account.created_at,
        updatedAt=account.updated_at or account.created_at,
        **portfolio_data
    )

@router.post("/user/paper-trading-account/{account_id}/strategy/execute", response_model=TradeResponse)
async def execute_strategy(
    account_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> TradeResponse:
    """Execute the assigned trading strategy"""
    
    # Verify the account belongs to the current user
    account = db.query(PaperTradingAccount).filter(
        PaperTradingAccount.id == account_id,
        PaperTradingAccount.user_id == current_user.id
    ).first()
    
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Paper trading account not found"
        )
    
    if not account.strategy_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No strategy assigned to this account"
        )
    
    # Execute strategy logic
    strategy_result = None
    
    if account.strategy_name == "DCA Weekly":
        # DCA Weekly: Buy $100 of BTC if more than 7 days since last run
        can_run = (
            account.last_strategy_run_at is None or 
            datetime.utcnow() - account.last_strategy_run_at > timedelta(days=7)
        )
        
        if can_run:
            btc_signals = signal_engine.get_signal_data("BTC")
            btc_price = btc_signals["current_price"]
            trade_amount = 100.0
            quantity = trade_amount / btc_price
            
            if account.current_balance >= trade_amount:
                strategy_result = {
                    "symbol": "BTC",
                    "side": "buy",
                    "quantity": quantity,
                    "price": btc_price,
                    "total_value": trade_amount,
                    "reason": f"DCA Weekly purchase - BTC price: ${btc_price:,.2f}"
                }
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="DCA Weekly: Must wait 7 days between runs"
            )
    
    elif account.strategy_name == "RSI Rebound":
        # RSI Rebound: Buy ETH if RSI < 30
        eth_signals = signal_engine.get_signal_data("ETH")
        
        if eth_signals["rsi"] < 30:
            eth_price = eth_signals["current_price"]
            trade_amount = 50.0  # Smaller amount for RSI strategy
            quantity = trade_amount / eth_price
            
            if account.current_balance >= trade_amount:
                strategy_result = {
                    "symbol": "ETH",
                    "side": "buy",
                    "quantity": quantity,
                    "price": eth_price,
                    "total_value": trade_amount,
                    "reason": f"RSI oversold at {eth_signals['rsi']:.1f} - ETH price: ${eth_price:,.2f}"
                }
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"RSI Rebound: RSI not oversold (current: {eth_signals['rsi']:.1f}), waiting for RSI < 30"
            )
    
    elif account.strategy_name == "Momentum Buy":
        # Momentum Buy: Buy SOL if price > 50-day moving average
        sol_signals = signal_engine.get_signal_data("SOL")
        sol_price = sol_signals["current_price"]
        ma_50 = sol_signals["ma50"]
        
        if sol_price > ma_50:
            trade_amount = 75.0
            quantity = trade_amount / sol_price
            
            if account.current_balance >= trade_amount:
                strategy_result = {
                    "symbol": "SOL",
                    "side": "buy",
                    "quantity": quantity,
                    "price": sol_price,
                    "total_value": trade_amount,
                    "reason": f"Momentum breakout - SOL ${sol_price:,.2f} > MA50 ${ma_50:,.2f}"
                }
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Momentum Buy: SOL price ${sol_price:,.2f} below MA50 ${ma_50:,.2f}"
            )
    
    elif account.strategy_name == "Trend Exit":
        # Trend Exit: Sell 25% of holdings if price drops below MA20
        # First, get current holdings
        trades = db.query(Trade).filter(
            Trade.account_id == account_id,
            Trade.status == 'executed'
        ).all()
        
        # Calculate current holdings
        holdings = {}
        for trade in trades:
            symbol = trade.symbol
            if symbol not in holdings:
                holdings[symbol] = 0.0
            
            if trade.side == 'buy':
                holdings[symbol] += trade.quantity
            else:
                holdings[symbol] -= trade.quantity
        
        # Find a holding to potentially sell using live signals
        for symbol, quantity in holdings.items():
            if quantity > 0:
                try:
                    signals = signal_engine.get_signal_data(symbol)
                    current_price = signals["current_price"]
                    ma_20 = signals["ma20"]
                    
                    if current_price < ma_20:
                        sell_quantity = quantity * 0.25  # Sell 25%
                        total_value = sell_quantity * current_price
                        
                        strategy_result = {
                            "symbol": symbol,
                            "side": "sell",
                            "quantity": sell_quantity,
                            "price": current_price,
                            "total_value": total_value,
                            "reason": f"Trend exit - {symbol} ${current_price:,.2f} below MA20 ${ma_20:,.2f}"
                        }
                        break
                except Exception as e:
                    # Skip symbols we can't get signals for
                    continue
        
        if not strategy_result:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Trend Exit: No holdings below MA20 threshold"
            )
    
    # If no strategy result, raise error
    if not strategy_result:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Strategy conditions not met"
        )
    
    # Execute the trade
    if strategy_result["side"] == "buy":
        if account.current_balance < strategy_result["total_value"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Insufficient balance for strategy trade"
            )
        account.current_balance -= strategy_result["total_value"]
    else:  # sell
        account.current_balance += strategy_result["total_value"]
    
    # Create the trade
    new_trade = Trade(
        account_id=account_id,
        symbol=strategy_result["symbol"],
        side=strategy_result["side"],
        quantity=strategy_result["quantity"],
        price=strategy_result["price"],
        order_type="market",
        status=TradeStatus.EXECUTED.value,
        created_at=datetime.utcnow().isoformat(),
        executed_at=datetime.utcnow().isoformat()
    )
    
    # Update account
    account.last_strategy_run_at = datetime.utcnow()
    account.updated_at = datetime.utcnow()
    
    db.add(new_trade)
    db.commit()
    db.refresh(new_trade)
    
    return TradeResponse(
        id=new_trade.id,
        accountId=new_trade.account_id,
        symbol=new_trade.symbol,
        tradeType=new_trade.side.upper(),
        quantity=new_trade.quantity,
        price=new_trade.price,
        totalValue=new_trade.quantity * new_trade.price,
        status=TradeStatus(new_trade.status),
        strategy=account.strategy_name,
        createdAt=datetime.fromisoformat(new_trade.created_at) if isinstance(new_trade.created_at, str) else new_trade.created_at,
        executedAt=datetime.fromisoformat(new_trade.executed_at) if new_trade.executed_at and isinstance(new_trade.executed_at, str) else new_trade.executed_at
    ) 