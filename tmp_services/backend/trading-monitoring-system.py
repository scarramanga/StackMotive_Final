# Trading Monitoring and AI Analysis System
# Architecture Overview

from ibapi.client import EClient
from ibapi.wrapper import EWrapper
from ibapi.contract import Contract
import pandas as pd
import numpy as np
import talib
from sklearn.ensemble import RandomForestClassifier
import requests
from bs4 import BeautifulSoup
import nltk
from nltk.sentiment.vader import SentimentIntensityAnalyzer
import schedule
import time
import logging
import yfinance as yf
import matplotlib.pyplot as plt
import seaborn as sns
from datetime import datetime, timedelta
import pickle
import os

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("trading_system.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger('TradingSystem')

# 1. IBKR Connection Class
class IBKRApp(EWrapper, EClient):
    def __init__(self):
        EClient.__init__(self, self)
        self.data = {}
        self.portfolio = {}
        
    def connectTWS(self):
        """Connect to TWS/IB Gateway"""
        self.connect("127.0.0.1", 7497, clientId=1)  # Use 7496 for IB Gateway, 7497 for TWS
        logger.info("Connected to TWS/IB Gateway")
        
    def error(self, reqId, errorCode, errorString):
        """Handle errors from TWS"""
        logger.error(f"Error {errorCode}: {errorString}")
    
    def accountSummary(self, reqId, account, tag, value, currency):
        """Handle account summary data"""
        if account not in self.portfolio:
            self.portfolio[account] = {}
        self.portfolio[account][tag] = value
        
    def historicalData(self, reqId, bar):
        """Handle historical data"""
        if reqId not in self.data:
            self.data[reqId] = []
        self.data[reqId].append({
            'date': bar.date,
            'open': bar.open,
            'high': bar.high,
            'low': bar.low,
            'close': bar.close,
            'volume': bar.volume
        })

# 2. Technical Analysis Module
class TechnicalAnalysis:
    def __init__(self):
        self.indicators = {}
        
    def calculate_indicators(self, df):
        """Calculate various technical indicators"""
        result = df.copy()
        
        # RSI
        result['RSI'] = talib.RSI(df['close'], timeperiod=14)
        
        # MACD
        macd, signal, hist = talib.MACD(df['close'], fastperiod=12, slowperiod=26, signalperiod=9)
        result['MACD'] = macd
        result['MACD_signal'] = signal
        result['MACD_hist'] = hist
        
        # Bollinger Bands
        upper, middle, lower = talib.BBANDS(df['close'], timeperiod=20, nbdevup=2, nbdevdn=2)
        result['BB_upper'] = upper
        result['BB_middle'] = middle
        result['BB_lower'] = lower
        
        # Moving Averages
        result['MA20'] = talib.SMA(df['close'], timeperiod=20)
        result['MA50'] = talib.SMA(df['close'], timeperiod=50)
        result['MA200'] = talib.SMA(df['close'], timeperiod=200)
        
        # Stochastic Oscillator
        slowk, slowd = talib.STOCH(df['high'], df['low'], df['close'], 
                                  fastk_period=14, slowk_period=3, slowk_matype=0, 
                                  slowd_period=3, slowd_matype=0)
        result['STOCH_k'] = slowk
        result['STOCH_d'] = slowd
        
        # ATR (Average True Range) - Volatility
        result['ATR'] = talib.ATR(df['high'], df['low'], df['close'], timeperiod=14)
        
        # OBV (On-Balance Volume)
        result['OBV'] = talib.OBV(df['close'], df['volume'])
        
        return result
    
    def generate_signals(self, df):
        """Generate trading signals based on technical indicators"""
        signals = {}
        
        # RSI signals
        if df['RSI'].iloc[-1] < 30:
            signals['RSI'] = 'OVERSOLD - Potential Buy'
        elif df['RSI'].iloc[-1] > 70:
            signals['RSI'] = 'OVERBOUGHT - Potential Sell'
        else:
            signals['RSI'] = 'NEUTRAL'
            
        # MACD signals
        if df['MACD_hist'].iloc[-1] > 0 and df['MACD_hist'].iloc[-2] <= 0:
            signals['MACD'] = 'BULLISH CROSSOVER - Buy Signal'
        elif df['MACD_hist'].iloc[-1] < 0 and df['MACD_hist'].iloc[-2] >= 0:
            signals['MACD'] = 'BEARISH CROSSOVER - Sell Signal'
        else:
            signals['MACD'] = 'NO CROSSOVER'
            
        # Bollinger Bands signals
        if df['close'].iloc[-1] < df['BB_lower'].iloc[-1]:
            signals['BB'] = 'BELOW LOWER BAND - Potential Buy'
        elif df['close'].iloc[-1] > df['BB_upper'].iloc[-1]:
            signals['BB'] = 'ABOVE UPPER BAND - Potential Sell'
        else:
            signals['BB'] = 'WITHIN BANDS'
            
        # Moving Average Crossover signals
        if df['MA20'].iloc[-1] > df['MA50'].iloc[-1] and df['MA20'].iloc[-2] <= df['MA50'].iloc[-2]:
            signals['MA_CROSS'] = 'GOLDEN CROSS (MA20 above MA50) - Bullish'
        elif df['MA20'].iloc[-1] < df['MA50'].iloc[-1] and df['MA20'].iloc[-2] >= df['MA50'].iloc[-2]:
            signals['MA_CROSS'] = 'DEATH CROSS (MA20 below MA50) - Bearish'
        else:
            signals['MA_CROSS'] = 'NO CROSSOVER'
            
        return signals

# 3. News and Sentiment Analysis Module
class NewsAnalysis:
    def __init__(self):
        # Download NLTK resources if not already available
        try:
            nltk.data.find('vader_lexicon')
        except LookupError:
            nltk.download('vader_lexicon')
        
        self.sentiment_analyzer = SentimentIntensityAnalyzer()
        
    def fetch_company_news(self, ticker, num_articles=5):
        """Fetch recent news articles for a company"""
        # This is a placeholder - in real implementation, you'd use a proper API
        # such as Alpha Vantage, Bloomberg, or a specialized news API
        
        try:
            # Example using Yahoo Finance for demo purposes
            # In production, use a more reliable source
            url = f"https://finance.yahoo.com/quote/{ticker}"
            headers = {'User-Agent': 'Mozilla/5.0'}
            response = requests.get(url, headers=headers)
            soup = BeautifulSoup(response.text, 'html.parser')
            
            news_items = []
            news_elements = soup.find_all('h3', {'class': 'Mb(5px)'})
            
            for i, elem in enumerate(news_elements[:num_articles]):
                if elem.a:
                    title = elem.a.text
                    link = "https://finance.yahoo.com" + elem.a['href']
                    news_items.append({'title': title, 'url': link})
            
            return news_items
        
        except Exception as e:
            logger.error(f"Error fetching news for {ticker}: {str(e)}")
            return []
    
    def analyze_sentiment(self, text):
        """Analyze sentiment of a text using VADER"""
        sentiment_score = self.sentiment_analyzer.polarity_scores(text)
        return sentiment_score

# 4. ML Prediction Model
class MLPredictor:
    def __init__(self):
        self.model = None
        self.model_path = "trading_model.pkl"
        self.load_model()
        
    def load_model(self):
        """Load the prediction model if it exists, otherwise create a new one"""
        if os.path.exists(self.model_path):
            with open(self.model_path, 'rb') as f:
                self.model = pickle.load(f)
                logger.info("Model loaded successfully")
        else:
            # Create a new model
            self.model = RandomForestClassifier(n_estimators=100, random_state=42)
            logger.info("New model created")
            
    def save_model(self):
        """Save the model to disk"""
        with open(self.model_path, 'wb') as f:
            pickle.dump(self.model, f)
            logger.info("Model saved successfully")
    
    def prepare_features(self, technical_df):
        """Prepare features for the ML model"""
        # Select relevant features
        features = technical_df[['RSI', 'MACD', 'MACD_signal', 'MACD_hist', 
                                'BB_upper', 'BB_middle', 'BB_lower',
                                'MA20', 'MA50', 'MA200', 'STOCH_k', 'STOCH_d',
                                'ATR', 'OBV']].copy()
        
        # Handle NaN values
        features = features.fillna(0)
        
        return features
    
    def train(self, technical_df, target):
        """Train the model using historical data"""
        features = self.prepare_features(technical_df)
        
        # Create a target variable (1 for price increase after 5 days, 0 otherwise)
        # In a real implementation, you'd have a more sophisticated approach
        
        self.model.fit(features, target)
        self.save_model()
        
    def predict(self, technical_df):
        """Make predictions using the trained model"""
        if self.model is None:
            logger.error("Model not loaded")
            return None
        
        features = self.prepare_features(technical_df)
        predictions = self.model.predict_proba(features)
        
        # Return probability of price increase
        return predictions[:, 1]

# 5. Dashboard and Visualization Module
class DashboardGenerator:
    def __init__(self):
        self.output_dir = "dashboard_outputs"
        os.makedirs(self.output_dir, exist_ok=True)
    
    def generate_technical_chart(self, ticker, df):
        """Generate a technical analysis chart for a stock"""
        plt.figure(figsize=(12, 8))
        
        # Plot price and moving averages
        plt.subplot(3, 1, 1)
        plt.plot(df.index, df['close'], label='Price')
        plt.plot(df.index, df['MA20'], label='MA20')
        plt.plot(df.index, df['MA50'], label='MA50')
        plt.title(f'{ticker} Price and Moving Averages')
        plt.legend()
        
        # Plot RSI
        plt.subplot(3, 1, 2)
        plt.plot(df.index, df['RSI'], label='RSI')
        plt.axhline(y=70, color='r', linestyle='--')
        plt.axhline(y=30, color='g', linestyle='--')
        plt.title('RSI')
        plt.legend()
        
        # Plot MACD
        plt.subplot(3, 1, 3)
        plt.plot(df.index, df['MACD'], label='MACD')
        plt.plot(df.index, df['MACD_signal'], label='Signal')
        plt.bar(df.index, df['MACD_hist'], label='Histogram')
        plt.title('MACD')
        plt.legend()
        
        plt.tight_layout()
        filename = f"{self.output_dir}/{ticker}_technical_{datetime.now().strftime('%Y%m%d')}.png"
        plt.savefig(filename)
        plt.close()
        
        return filename
    
    def generate_portfolio_summary(self, portfolio_data):
        """Generate a portfolio summary visualization"""
        # Create a pie chart of portfolio allocation
        plt.figure(figsize=(10, 7))
        
        # Example data - in reality would come from portfolio_data
        allocation = {
            'AI Stocks': 40,
            'Biotech': 15,
            'Precious Metals': 15,
            'Stablecoins': 20,
            'Cash': 10
        }
        
        plt.pie(allocation.values(), labels=allocation.keys(), autopct='%1.1f%%', startangle=140)
        plt.axis('equal')
        plt.title('Portfolio Allocation')
        
        filename = f"{self.output_dir}/portfolio_allocation_{datetime.now().strftime('%Y%m%d')}.png"
        plt.savefig(filename)
        plt.close()
        
        return filename

# 6. Industry/Sector Analysis Module
class IndustryAnalysis:
    def __init__(self):
        self.sector_data = {}
        
    def fetch_sector_performance(self):
        """Fetch performance data for major sectors"""
        sectors = [
            'XLK',  # Technology
            'XLV',  # Healthcare
            'XLF',  # Financial
            'XLE',  # Energy
            'XLB',  # Materials
            'XLI',  # Industrial
            'XLY',  # Consumer Discretionary
            'XLP',  # Consumer Staples
            'XLU',  # Utilities
            'XLRE'  # Real Estate
        ]
        
        end_date = datetime.now()
        start_date = end_date - timedelta(days=30)
        
        sector_performance = {}
        
        for sector in sectors:
            try:
                data = yf.download(sector, start=start_date, end=end_date)
                if not data.empty:
                    # Calculate performance metrics
                    sector_performance[sector] = {
                        'name': self._get_sector_name(sector),
                        'return_1m': ((data['Close'].iloc[-1] / data['Close'].iloc[0]) - 1) * 100,
                        'volatility': data['Close'].pct_change().std() * 100 * (252 ** 0.5),  # Annualized
                        'last_close': data['Close'].iloc[-1]
                    }
            except Exception as e:
                logger.error(f"Error fetching data for sector {sector}: {str(e)}")
                
        self.sector_data = sector_performance
        return sector_performance
    
    def _get_sector_name(self, ticker):
        """Map sector ticker to readable name"""
        sector_names = {
            'XLK': 'Technology',
            'XLV': 'Healthcare',
            'XLF': 'Financial',
            'XLE': 'Energy',
            'XLB': 'Materials',
            'XLI': 'Industrial',
            'XLY': 'Consumer Discretionary',
            'XLP': 'Consumer Staples',
            'XLU': 'Utilities',
            'XLRE': 'Real Estate'
        }
        return sector_names.get(ticker, ticker)
    
    def analyze_sector_trend(self):
        """Analyze trends in each sector"""
        if not self.sector_data:
            self.fetch_sector_performance()
            
        analysis = {}
        
        for sector, data in self.sector_data.items():
            if data['return_1m'] > 5:
                strength = "Strong Bullish"
            elif data['return_1m'] > 2:
                strength = "Bullish"
            elif data['return_1m'] > -2:
                strength = "Neutral"
            elif data['return_1m'] > -5:
                strength = "Bearish"
            else:
                strength = "Strong Bearish"
                
            analysis[data['name']] = {
                'trend': strength,
                'return_1m': f"{data['return_1m']:.2f}%",
                'volatility': f"{data['volatility']:.2f}%"
            }
            
        return analysis
    
    def visualize_sector_performance(self):
        """Create visualization of sector performance"""
        if not self.sector_data:
            self.fetch_sector_performance()
            
        sectors = [data['name'] for _, data in self.sector_data.items()]
        returns = [data['return_1m'] for _, data in self.sector_data.items()]
        
        plt.figure(figsize=(12, 6))
        colors = ['g' if r > 0 else 'r' for r in returns]
        plt.bar(sectors, returns, color=colors)
        plt.axhline(y=0, color='black', linestyle='-', alpha=0.3)
        plt.title('Sector Performance (1 Month Return)')
        plt.ylabel('Return (%)')
        plt.xticks(rotation=45)
        plt.tight_layout()
        
        filename = f"dashboard_outputs/sector_performance_{datetime.now().strftime('%Y%m%d')}.png"
        plt.savefig(filename)
        plt.close()
        
        return filename

# 7. Main Trading Monitor System
class TradingMonitorSystem:
    def __init__(self):
        self.ibkr = IBKRApp()
        self.tech_analyzer = TechnicalAnalysis()
        self.news_analyzer = NewsAnalysis()
        self.ml_predictor = MLPredictor()
        self.dashboard = DashboardGenerator()
        self.industry_analyzer = IndustryAnalysis()
        
        self.watchlist = []
        self.portfolio = {}
        
    def initialize(self):
        """Initialize the system"""
        logger.info("Initializing Trading Monitoring System...")
        
        # Connect to IBKR
        try:
            self.ibkr.connectTWS()
        except Exception as e:
            logger.error(f"Failed to connect to IBKR: {str(e)}")
        
        # Load watchlist
        self.load_watchlist()
        
        # Schedule periodic tasks
        self.schedule_tasks()
        
        logger.info("System initialized successfully")
        
    def load_watchlist(self):
        """Load the watchlist of stocks to monitor"""
        # This would typically come from a config file or database
        # Hardcoded for demonstration
        self.watchlist = [
            {'ticker': 'AAPL', 'sector': 'Technology', 'type': 'AI/Tech'},
            {'ticker': 'NVDA', 'sector': 'Technology', 'type': 'AI/Tech'},
            {'ticker': 'MSFT', 'sector': 'Technology', 'type': 'AI/Tech'},
            {'ticker': 'GOOGL', 'sector': 'Technology', 'type': 'AI/Tech'},
            {'ticker': 'AMZN', 'sector': 'Technology', 'type': 'AI/Tech'},
            {'ticker': 'TSLA', 'sector': 'Consumer Discretionary', 'type': 'AI/Tech'},
            {'ticker': 'META', 'sector': 'Technology', 'type': 'AI/Tech'},
            {'ticker': 'JNJ', 'sector': 'Healthcare', 'type': 'Biotech'},
            {'ticker': 'PFE', 'sector': 'Healthcare', 'type': 'Biotech'},
            {'ticker': 'MRNA', 'sector': 'Healthcare', 'type': 'Biotech'},
            {'ticker': 'BIIB', 'sector': 'Healthcare', 'type': 'Biotech'},
            {'ticker': 'REGN', 'sector': 'Healthcare', 'type': 'Biotech'},
            {'ticker': 'GLD', 'sector': 'Commodities', 'type': 'Precious Metals'},
            {'ticker': 'SLV', 'sector': 'Commodities', 'type': 'Precious Metals'},
            {'ticker': 'NST.AX', 'sector': 'Materials', 'type': 'Precious Metals'}
        ]
        
    def fetch_historical_data(self, ticker, period='1y', interval='1d'):
        """Fetch historical price data for a stock"""
        try:
            data = yf.download(ticker, period=period, interval=interval)
            return data
        except Exception as e:
            logger.error(f"Error fetching data for {ticker}: {str(e)}")
            return pd.DataFrame()
    
    def analyze_stock(self, ticker):
        """Run complete analysis on a single stock"""
        logger.info(f"Analyzing {ticker}...")
        
        # 1. Fetch historical data
        hist_data = self.fetch_historical_data(ticker)
        if hist_data.empty:
            logger.warning(f"No data available for {ticker}")
            return None
            
        # 2. Calculate technical indicators
        tech_data = self.tech_analyzer.calculate_indicators(hist_data.reset_index())
        
        # 3. Generate technical signals
        signals = self.tech_analyzer.generate_signals(tech_data)
        
        # 4. Fetch news and analyze sentiment
        news = self.news_analyzer.fetch_company_news(ticker)
        sentiment_scores = []
        for item in news:
            sentiment = self.news_analyzer.analyze_sentiment(item['title'])
            item['sentiment'] = sentiment
            sentiment_scores.append(sentiment['compound'])
            
        avg_sentiment = sum(sentiment_scores) / len(sentiment_scores) if sentiment_scores else 0
        
        # 5. ML prediction
        prediction = None
        if not tech_data.empty and len(tech_data) > 50:  # Need sufficient data
            # In real implementation, you'd have a proper target variable
            # This is simplified for demonstration
            target = (tech_data['close'].shift(-5) > tech_data['close']).astype(int)
            target = target.fillna(0)
            
            # Only predict if we have a trained model
            if hasattr(self.ml_predictor.model, 'predict_proba'):
                ml_features = self.ml_predictor.prepare_features(tech_data)
                prediction = self.ml_predictor.predict(tech_data)[-1] if not ml_features.empty else None
            
            # Periodically retrain the model
            if datetime.now().day == 1:  # First day of month
                self.ml_predictor.train(tech_data, target)
        
        # 6. Generate dashboard components
        chart_file = self.dashboard.generate_technical_chart(ticker, tech_data)
        
        # 7. Compile analysis results
        analysis_result = {
            'ticker': ticker,
            'last_price': hist_data['Close'].iloc[-1],
            'change_pct': ((hist_data['Close'].iloc[-1] / hist_data['Close'].iloc[-2]) - 1) * 100,
            'technical_signals': signals,
            'avg_sentiment': avg_sentiment,
            'sentiment_label': self._interpret_sentiment(avg_sentiment),
            'recent_news': news[:3],  # Top 3 news items
            'ml_prediction': prediction,
            'chart_file': chart_file
        }
        
        return analysis_result
    
    def _interpret_sentiment(self, score):
        """Interpret sentiment score"""
        if score >= 0.5:
            return "Very Positive"
        elif score >= 0.1:
            return "Positive"
        elif score > -0.1:
            return "Neutral"
        elif score > -0.5:
            return "Negative"
        else:
            return "Very Negative"
    
    def generate_daily_report(self):
        """Generate a comprehensive daily report"""
        logger.info("Generating daily report...")
        
        # 1. Analyze all stocks in watchlist
        stock_analyses = {}
        for stock in self.watchlist:
            ticker = stock['ticker']
            analysis = self.analyze_stock(ticker)
            if analysis:
                stock_analyses[ticker] = analysis
        
        # 2. Sector analysis
        sector_analysis = self.industry_analyzer.analyze_sector_trend()
        sector_chart = self.industry_analyzer.visualize_sector_performance()
        
        # 3. Portfolio summary
        portfolio_chart = self.dashboard.generate_portfolio_summary({})  # Placeholder
        
        # 4. Generate trading recommendations
        recommendations = self._generate_recommendations(stock_analyses, sector_analysis)
        
        # 5. Compile complete report
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        report = {
            'timestamp': timestamp,
            'stock_analyses': stock_analyses,
            'sector_analysis': sector_analysis,
            'recommendations': recommendations,
            'charts': {
                'portfolio': portfolio_chart,
                'sectors': sector_chart
            }
        }
        
        # Save report to file
        report_file = f"reports/daily_report_{datetime.now().strftime('%Y%m%d')}.json"
        os.makedirs(os.path.dirname(report_file), exist_ok=True)
        with open(report_file, 'w') as f:
            import json
            json.dump(report, f, indent=2, default=str)
        
        logger.info(f"Daily report generated and saved to {report_file}")
        return report
    
    def _generate_recommendations(self, stock_analyses, sector_analysis):
        """Generate trading recommendations based on analyses"""
        recommendations = []
        
        # Find stocks with strong buy signals
        for ticker, analysis in stock_analyses.items():
            score = 0
            reasons = []
            
            # Technical indicators
            if analysis['technical_signals']['RSI'] == 'OVERSOLD - Potential Buy':
                score += 2
                reasons.append("RSI indicates oversold")
            
            if analysis['technical_signals']['MACD'] == 'BULLISH CROSSOVER - Buy Signal':
                score += 2
                reasons.append("MACD shows bullish crossover")
            
            if analysis['technical_signals']['BB'] == 'BELOW LOWER BAND - Potential Buy':
                score += 1
                reasons.append("Price below lower Bollinger Band")
            
            if analysis['technical_signals']['MA_CROSS'] == 'GOLDEN CROSS (MA20 above MA50) - Bullish':
                score += 2
                reasons.append("Golden Cross pattern")
            
            # Sentiment
            if analysis['sentiment_label'] in ['Positive', 'Very Positive']:
                score += 1
                reasons.append(f"News sentiment is {analysis['sentiment_label']}")
            
            # ML prediction
            if analysis['ml_prediction'] is not None and analysis['ml_prediction'] > 0.7:
                score += 2
                reasons.append(f"ML model predicts a high chance of price increase ({analysis['ml_prediction']:.1%})")
            
            # Strong buy recommendation
            if score >= 5:
                recommendations.append({
                    'ticker': ticker,
                    'action': 'BUY',
                    'confidence': 'HIGH',
                    'reasons': reasons
                })
            # Moderate buy recommendation
            elif score >= 3:
                recommendations.append({
                    'ticker': ticker,
                    'action': 'BUY',
                    'confidence': 'MEDIUM',
                    'reasons': reasons
                })
            
            # Sell recommendations
            score = 0
            reasons = []
            
            if analysis['technical_signals']['RSI'] == 'OVERBOUGHT - Potential Sell':
                score += 2
                reasons.append("RSI indicates overbought")
            
            if analysis['technical_signals']['MACD'] == 'BEARISH CROSSOVER - Sell Signal':
                score += 2
                reasons.append("MACD shows bearish crossover")
            
            if analysis['technical_signals']['BB'] == 'ABOVE UPPER BAND - Potential Sell':
                score += 1
                reasons.append("Price above upper Bollinger Band")
            
            if analysis['technical_signals']['MA_CROSS'] == 'DEATH CROSS (MA20 below MA50) - Bearish':
                score += 2
                reasons.append("Death Cross pattern")
            
            if analysis['sentiment_label'] in ['Negative', 'Very Negative']:
                score += 1
                reasons.append(f"News sentiment is {analysis['sentiment_label']}")
            
            if analysis['ml_prediction'] is not None and analysis['ml_prediction'] < 0.3:
                score += 2
                reasons.append(f"ML model predicts a high chance of price decrease ({1-analysis['ml_prediction']:.1%})")
            
            # Strong sell recommendation
            if score >= 5:
                recommendations.append({
                    'ticker': ticker,
                    'action': 'SELL',
                    'confidence': 'HIGH',
                    'reasons': reasons
                })
            # Moderate sell recommendation
            elif score >= 3:
                recommendations.append({
                    'ticker': ticker,
                    'action': 'SELL',
                    'confidence': 'MEDIUM',
                    'reasons': reasons
                })
        
        return recommendations
    
    def schedule_tasks(self):
        """Schedule periodic tasks"""
        # Daily report at market close
        schedule.every().day.at("16:30").do(self.generate_daily_report)
        
        # Update sector analysis twice a day
        schedule.every().day.at("10:00").do(self.industry_analyzer.fetch_sector_performance)
        schedule.every().day.at("14:00").do(self.industry_analyzer.fetch_sector_performance)
        
        # Check for breaking news every hour
        schedule.every(1).hours.do(self.check_breaking_news)
        
        # Run the scheduler in a background thread
        import threading
        scheduler_thread = threading.Thread(target=self._run_scheduler)
        scheduler_thread.daemon = True
        scheduler_thread.start()
    
    def _run_scheduler(self):
        """Run the scheduler continuously"""
        while True:
            schedule.run_pending()
            time.sleep(60)
    
    def check_breaking_news(self):
        """Check for breaking news that might affect the portfolio"""
        logger.info("Checking for breaking news...")
        
        # This is a placeholder. In a real implementation, you'd use a proper
        # news API with filtering capabilities for urgent/breaking news.
        
        urgent_news = []
        for stock in self.watchlist:
            ticker = stock['ticker']
            news = self.news_analyzer.fetch_company_news(ticker, num_articles=3)
            
            for item in news:
                sentiment = self.news_analyzer.analyze_sentiment(item['title'])
                
                # Consider news with very strong sentiment as potentially urgent
                if abs(sentiment['compound']) > 0.6:
                    urgent_news.append({
                        'ticker': ticker,
                        'title': item['title'],
                        'url': item['url'],
                        'sentiment': sentiment['compound']
                    })
        
        if urgent_news:
            logger.warning(f"Found {len(urgent_news)} urgent news items!")
            # In a real implementation, you might send email/SMS alerts
            
        return urgent_news
    
    def run(self):
        """Main entry point to run the system"""
        self.initialize()
        
        # Generate initial report
        self.generate_daily_report()
        
        logger.info("Trading Monitor System running. Press Ctrl+C to exit.")
        
        try:
            # Keep the main thread alive
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            logger.info("System shutdown requested.")
        except Exception as e:
            logger.error(f"Unexpected error: {str(e)}")
        finally:
            logger.info("Shutting down Trading Monitor System...")
            # Cleanup
            if self.ibkr:
                self.ibkr.disconnect()

# Example usage
if __name__ == "__main__":
    monitor = TradingMonitorSystem()
    monitor.run()
