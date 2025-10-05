from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import Base, engine
from auth import get_current_user

# Import MVP routes
from routes.dca_stop_loss import router as dca_stop_loss_router
from routes.institutional_flow import router as institutional_flow_router
from routes.market_data import router as market_data_router
from routes.market_events import router as market_events_router
from routes.notification_dispatcher import router as notification_dispatcher_router
from routes.portfolio import router as portfolio_router
from routes.rebalance_risk import router as rebalance_risk_router
from routes.rebalance_scheduler import router as rebalance_scheduler_router
from routes.user import router as user_router
from routes.watchlist import router as watchlist_router

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI()

# Basic CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "healthy"}

# Include MVP routes
app.include_router(user_router, prefix="/api", tags=["user"])
app.include_router(portfolio_router, prefix="/api/portfolio", tags=["portfolio"])
app.include_router(market_data_router, prefix="/api/market", tags=["market"])
app.include_router(market_events_router, prefix="/api/market/events", tags=["market"])
app.include_router(institutional_flow_router, prefix="/api/institutional", tags=["institutional"])
app.include_router(notification_dispatcher_router, prefix="/api/notifications", tags=["notifications"])
app.include_router(dca_stop_loss_router, prefix="/api/trade-automation", tags=["automation"])
app.include_router(rebalance_risk_router, prefix="/api/risk", tags=["risk"])
app.include_router(rebalance_scheduler_router, prefix="/api/rebalance", tags=["rebalance"])
app.include_router(watchlist_router, prefix="/api/watchlist", tags=["watchlist"])
# Retail Investor Protection Routes
from server.protection import protection_routes
from server.alerts import alert_routes  
from server.monitoring import monitoring_routes
from server.streams import stream_routes

app.include_router(protection_routes.router, prefix='/api/protection', tags=['Protection'])
app.include_router(alert_routes.router, prefix='/api/alerts', tags=['Alerts'])
app.include_router(monitoring_routes.router, prefix='/api/monitoring', tags=['Monitoring'])
app.include_router(stream_routes.router, prefix='/api/streams', tags=['Streams'])

