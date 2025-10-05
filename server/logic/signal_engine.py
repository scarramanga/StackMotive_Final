"""
SignalEngine: Real-time technical indicator calculation engine
Calculates RSI, MACD, Moving Averages, and Volume indicators for trading signals
"""
from typing import Dict, List, Optional
from datetime import datetime, timedelta
import random
import time


class SignalEngine:
    """
    Technical indicator calculation engine for trading signals
    """
    
    def __init__(self):
        # Mock historical price data for demonstration
        # In production, this would connect to a real data provider
        self.mock_price_history = self._generate_mock_price_history()
        # Price cache for 5-minute stability windows
        self.price_cache = {}
    
    def _generate_mock_price_history(self) -> Dict[str, List[Dict]]:
        """Generate realistic mock price history for all supported symbols"""
        symbols = ["BTC", "ETH", "SOL", "ADA", "DOT", "MATIC", "LINK", "AVAX", 
                  "AAPL", "META", "GOOGL", "MSFT", "AMZN", "TSLA", "NVDA", "NFLX"]
        
        # Base prices for each symbol
        base_prices = {
            # Cryptocurrencies  
            "BTC": 95000,
            "ETH": 3500,
            "SOL": 220,
            "ADA": 0.85,
            "DOT": 8.5,
            "MATIC": 1.2,
            "LINK": 18.5,
            "AVAX": 45.0,
            # Equities
            "AAPL": 195.50,
            "META": 425.30,
            "GOOGL": 165.80,
            "MSFT": 415.20,
            "AMZN": 185.75,
            "TSLA": 248.90,
            "NVDA": 128.45,
            "NFLX": 695.20
        }
        
        history = {}
        
        for symbol in symbols:
            base_price = base_prices[symbol]
            prices = []
            current_price = base_price
            
            # Generate 100 days of price history
            for i in range(100):
                # Add realistic price movement (random walk with trend)
                change_percent = random.uniform(-0.005, 0.005)  # ±0.5% daily change max
                current_price *= (1 + change_percent)
                
                # Generate volume (higher volume on bigger price moves)
                volume_base = random.uniform(800000, 2000000)
                volume_multiplier = 1 + abs(change_percent) * 10
                volume = volume_base * volume_multiplier
                
                prices.append({
                    'timestamp': datetime.now() - timedelta(days=99-i),
                    'price': round(current_price, 2 if current_price > 1 else 6),
                    'volume': round(volume)
                })
            
            history[symbol] = prices
            
        return history
    
    def get_signal_data(self, symbol: str) -> Dict:
        """
        Calculate all technical indicators for a given symbol
        
        Args:
            symbol: Cryptocurrency symbol (BTC, ETH, etc.)
            
        Returns:
            Dictionary containing all signal data
        """
        if symbol not in self.mock_price_history:
            raise ValueError(f"Symbol {symbol} not supported")
        
        # Create cache key for 5-minute windows (300 seconds)
        cache_key = f"{symbol}_{int(time.time() // 300)}"
        
        # Return cached data if available within the 5-minute window
        if cache_key in self.price_cache:
            return self.price_cache[cache_key]
        
        price_data = self.mock_price_history[symbol]
        
        # Extract price and volume arrays
        prices = [item['price'] for item in price_data]
        volumes = [item['volume'] for item in price_data]
        
        # Calculate technical indicators
        rsi = self._calculate_rsi(prices)
        macd = self._calculate_macd(prices)
        ma20 = self._calculate_moving_average(prices, 20)
        ma50 = self._calculate_moving_average(prices, 50)
        current_volume = volumes[-1]
        avg_volume_7d = sum(volumes[-7:]) / 7
        
        # Get current price
        current_price = prices[-1]
        
        signal_data = {
            "symbol": symbol,
            "current_price": current_price,
            "rsi": round(rsi, 2),
            "macd": round(macd, 4),
            "ma20": round(ma20, 2),
            "ma50": round(ma50, 2),
            "volume": current_volume,
            "volume_7d_avg": round(avg_volume_7d),
            "volume_ratio": round(current_volume / avg_volume_7d, 2),
            "timestamp": datetime.now().isoformat()
        }
        
        # Cache the signal data for the 5-minute window
        self.price_cache[cache_key] = signal_data
        
        # Clean up old cache entries (keep only current and previous window)
        current_window = int(time.time() // 300)
        keys_to_remove = [key for key in self.price_cache.keys() 
                         if int(key.split('_')[-1]) < current_window - 1]
        for key in keys_to_remove:
            del self.price_cache[key]
        
        return signal_data
    
    def _calculate_rsi(self, prices: List[float], period: int = 14) -> float:
        """Calculate Relative Strength Index"""
        if len(prices) < period + 1:
            return 50.0  # Neutral RSI if insufficient data
        
        # Calculate price changes
        changes = [prices[i] - prices[i-1] for i in range(1, len(prices))]
        
        # Separate gains and losses
        gains = [change if change > 0 else 0 for change in changes]
        losses = [-change if change < 0 else 0 for change in changes]
        
        # Calculate average gains and losses over the period
        if len(gains) < period:
            return 50.0
            
        avg_gain = sum(gains[-period:]) / period
        avg_loss = sum(losses[-period:]) / period
        
        if avg_loss == 0:
            return 100.0
        
        rs = avg_gain / avg_loss
        rsi = 100 - (100 / (1 + rs))
        
        return rsi
    
    def _calculate_macd(self, prices: List[float], fast: int = 12, slow: int = 26, signal: int = 9) -> float:
        """Calculate MACD (Moving Average Convergence Divergence)"""
        if len(prices) < slow:
            return 0.0
        
        # Calculate exponential moving averages
        ema_fast = self._calculate_ema(prices, fast)
        ema_slow = self._calculate_ema(prices, slow)
        
        # MACD line is the difference between fast and slow EMAs
        macd_line = ema_fast - ema_slow
        
        return macd_line
    
    def _calculate_ema(self, prices: List[float], period: int) -> float:
        """Calculate Exponential Moving Average"""
        if len(prices) < period:
            return sum(prices) / len(prices)
        
        # Use simple moving average for initial EMA
        sma = sum(prices[:period]) / period
        multiplier = 2 / (period + 1)
        
        ema = sma
        for price in prices[period:]:
            ema = (price * multiplier) + (ema * (1 - multiplier))
        
        return ema
    
    def _calculate_moving_average(self, prices: List[float], period: int) -> float:
        """Calculate Simple Moving Average"""
        if len(prices) < period:
            return sum(prices) / len(prices)
        
        return sum(prices[-period:]) / period
    
    def check_strategy_signals(self, symbol: str) -> Dict:
        """
        Check if current signals meet strategy trigger conditions
        
        Returns:
            Dictionary with strategy trigger status
        """
        signals = self.get_signal_data(symbol)
        
        triggers = {
            "rsi_rebound": {
                "triggered": signals["rsi"] < 30,
                "condition": "RSI < 30",
                "current_value": signals["rsi"],
                "target_asset": "ETH" if symbol == "ETH" else None
            },
            "momentum_buy": {
                "triggered": signals["current_price"] > signals["ma50"],
                "condition": "Price > MA50",
                "current_value": f"Price: {signals['current_price']}, MA50: {signals['ma50']}",
                "target_asset": "SOL" if symbol == "SOL" else None
            },
            "trend_exit": {
                "triggered": signals["current_price"] < signals["ma20"],
                "condition": "Price < MA20",
                "current_value": f"Price: {signals['current_price']}, MA20: {signals['ma20']}",
                "target_asset": "Any holdings"
            },
            "volume_spike": {
                "triggered": signals["volume_ratio"] > 2.0,
                "condition": "Volume > 2x 7-day average",
                "current_value": f"Ratio: {signals['volume_ratio']}x",
                "target_asset": "BTC" if symbol == "BTC" else None
            }
        }
        
        return {
            "symbol": symbol,
            "signals": signals,
            "triggers": triggers,
            "timestamp": datetime.now().isoformat()
        }
    
    def get_strategy_recommendation(self, strategy_name: str, account_holdings: Dict = None) -> Dict:
        """
        Get specific strategy recommendation based on current signals
        
        Args:
            strategy_name: Name of the strategy
            account_holdings: Current holdings in the account
            
        Returns:
            Strategy recommendation with trade details
        """
        if strategy_name == "RSI Rebound":
            return self._check_rsi_rebound()
        elif strategy_name == "Momentum Buy":
            return self._check_momentum_buy()
        elif strategy_name == "Trend Exit":
            return self._check_trend_exit(account_holdings or {})
        elif strategy_name == "DCA Weekly":
            return self._check_dca_weekly()
        else:
            return {"error": f"Unknown strategy: {strategy_name}"}
    
    def _check_rsi_rebound(self) -> Dict:
        """Check RSI Rebound strategy for ETH"""
        signals = self.get_signal_data("ETH")
        
        if signals["rsi"] < 30:
            return {
                "strategy": "RSI Rebound",
                "symbol": "ETH",
                "action": "buy",
                "amount": 50.0,
                "reason": f"RSI oversold at {signals['rsi']:.1f}",
                "triggered": True,
                "signals": signals
            }
        
        return {
            "strategy": "RSI Rebound",
            "symbol": "ETH",
            "action": None,
            "reason": f"RSI not oversold (current: {signals['rsi']:.1f})",
            "triggered": False,
            "signals": signals
        }
    
    def _check_momentum_buy(self) -> Dict:
        """Check Momentum Buy strategy for SOL"""
        signals = self.get_signal_data("SOL")
        
        if signals["current_price"] > signals["ma50"]:
            return {
                "strategy": "Momentum Buy",
                "symbol": "SOL",
                "action": "buy",
                "amount": 75.0,
                "reason": f"Price ${signals['current_price']} above MA50 ${signals['ma50']}",
                "triggered": True,
                "signals": signals
            }
        
        return {
            "strategy": "Momentum Buy",
            "symbol": "SOL",
            "action": None,
            "reason": f"Price ${signals['current_price']} below MA50 ${signals['ma50']}",
            "triggered": False,
            "signals": signals
        }
    
    def _check_trend_exit(self, holdings: Dict) -> Dict:
        """Check Trend Exit strategy for any holdings"""
        for symbol, quantity in holdings.items():
            if quantity > 0:
                signals = self.get_signal_data(symbol)
                
                if signals["current_price"] < signals["ma20"]:
                    sell_quantity = quantity * 0.25  # Sell 25%
                    return {
                        "strategy": "Trend Exit",
                        "symbol": symbol,
                        "action": "sell",
                        "quantity": sell_quantity,
                        "reason": f"Price ${signals['current_price']} below MA20 ${signals['ma20']}",
                        "triggered": True,
                        "signals": signals
                    }
        
        return {
            "strategy": "Trend Exit",
            "action": None,
            "reason": "No holdings below MA20 threshold",
            "triggered": False
        }
    
    def _check_dca_weekly(self) -> Dict:
        """Check DCA Weekly strategy for BTC"""
        signals = self.get_signal_data("BTC")
        
        return {
            "strategy": "DCA Weekly",
            "symbol": "BTC",
            "action": "buy",
            "amount": 100.0,
            "reason": "Regular DCA purchase",
            "triggered": True,  # DCA always triggers if time conditions are met
            "signals": signals
        }


# Global signal engine instance
signal_engine = SignalEngine() 