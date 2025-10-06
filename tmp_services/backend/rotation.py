from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import json
import psycopg2
from psycopg2.extras import RealDictCursor
import os
import uuid
import random
from pydantic import BaseModel, Field

router = APIRouter()

# Pydantic models for rotation overlay data
class OverlayAsset(BaseModel):
    symbol: str
    allocation: float
    signal: str = Field(..., pattern=r"^(buy|sell|hold)$")
    confidence: float = Field(..., ge=0, le=100)

class RotationTiming(BaseModel):
    lastRotation: str
    nextRotation: Optional[str] = None
    cooldownEnds: Optional[str] = None
    frequency: str = Field(..., pattern=r"^(daily|weekly|monthly|signal_based)$")

class OverlayPerformance(BaseModel):
    totalReturn: float
    winRate: float = Field(..., ge=0, le=100)
    avgRotationReturn: float
    maxDrawdown: float

class OverlayMetadata(BaseModel):
    createdAt: str
    updatedAt: str
    rotationCount: int
    isUserDefined: bool

class RotationOverlay(BaseModel):
    id: str
    name: str
    description: str
    status: str = Field(..., pattern=r"^(active|cooling_down|triggered|paused)$")
    currentWeight: float
    targetWeight: float
    signalStrength: float = Field(..., ge=0, le=100)
    trustScore: float = Field(..., ge=0, le=100)
    rotationTiming: RotationTiming
    performance: OverlayPerformance
    assets: List[OverlayAsset]
    metadata: OverlayMetadata

class OverlayComparison(BaseModel):
    portfolioValue: float
    overlayValue: float
    difference: float
    differencePercent: float
    recommendation: str = Field(..., pattern=r"^(rotate|hold|pause)$")

class OverlaySummary(BaseModel):
    totalOverlays: int
    activeOverlays: int
    avgTrustScore: float
    pendingRotations: int
    totalPerformance: float

class RotationOverlayResponse(BaseModel):
    overlays: List[RotationOverlay]
    summary: OverlaySummary
    comparison: OverlayComparison
    lastUpdated: str

# Database connection
def get_db_connection():
    database_url = os.getenv("DATABASE_URL", "postgresql://postgres:password@localhost:5432/stackmotive")
    return psycopg2.connect(database_url)

# Database operations
def create_rotation_overlay_tables():
    """Create rotation overlay tables if they don't exist"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Create rotation overlays table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS rotation_overlays (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            vault_id TEXT,
            name TEXT NOT NULL,
            description TEXT,
            status TEXT NOT NULL DEFAULT 'active',
            current_weight REAL DEFAULT 0,
            target_weight REAL DEFAULT 0,
            signal_strength REAL DEFAULT 0,
            trust_score REAL DEFAULT 0,
            total_return REAL DEFAULT 0,
            win_rate REAL DEFAULT 0,
            avg_rotation_return REAL DEFAULT 0,
            max_drawdown REAL DEFAULT 0,
            rotation_count INTEGER DEFAULT 0,
            is_user_defined BOOLEAN DEFAULT FALSE,
            frequency TEXT DEFAULT 'signal_based',
            last_rotation TEXT,
            next_rotation TEXT,
            cooldown_ends TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
    """)
    
    # Create overlay assets table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS overlay_assets (
            id TEXT PRIMARY KEY,
            overlay_id TEXT NOT NULL,
            symbol TEXT NOT NULL,
            allocation REAL NOT NULL,
            signal TEXT NOT NULL DEFAULT 'hold',
            confidence REAL DEFAULT 50,
            FOREIGN KEY (overlay_id) REFERENCES rotation_overlays (id) ON DELETE CASCADE
        )
    """)
    
    conn.commit()
    conn.close()

def generate_demo_overlays(user_id: str, vault_id: Optional[str] = None) -> List[RotationOverlay]:
    """Generate realistic demo overlay data"""
    
    demo_overlays = [
        {
            "name": "Momentum Rotation",
            "description": "Rotates based on 30-day momentum indicators",
            "status": "active",
            "frequency": "weekly",
            "assets": [
                {"symbol": "AAPL", "allocation": 25.0, "signal": "buy", "confidence": 85},
                {"symbol": "MSFT", "allocation": 20.0, "signal": "hold", "confidence": 70},
                {"symbol": "GOOGL", "allocation": 15.0, "signal": "buy", "confidence": 80},
                {"symbol": "VTI", "allocation": 40.0, "signal": "hold", "confidence": 75}
            ]
        },
        {
            "name": "Sector Rotation",
            "description": "Dynamic sector allocation based on macro signals",
            "status": "triggered",
            "frequency": "monthly",
            "assets": [
                {"symbol": "XLF", "allocation": 30.0, "signal": "sell", "confidence": 60},
                {"symbol": "XLK", "allocation": 35.0, "signal": "buy", "confidence": 90},
                {"symbol": "XLI", "allocation": 20.0, "signal": "hold", "confidence": 55},
                {"symbol": "XLE", "allocation": 15.0, "signal": "sell", "confidence": 65}
            ]
        },
        {
            "name": "Mean Reversion",
            "description": "Contrarian strategy targeting oversold assets",
            "status": "cooling_down",
            "frequency": "signal_based",
            "assets": [
                {"symbol": "BTC", "allocation": 40.0, "signal": "buy", "confidence": 95},
                {"symbol": "ETH", "allocation": 30.0, "signal": "buy", "confidence": 85},
                {"symbol": "SOL", "allocation": 20.0, "signal": "hold", "confidence": 70},
                {"symbol": "USDC", "allocation": 10.0, "signal": "hold", "confidence": 100}
            ]
        },
        {
            "name": "Risk Parity",
            "description": "Equal risk contribution across asset classes",
            "status": "paused",
            "frequency": "daily",
            "assets": [
                {"symbol": "SPY", "allocation": 25.0, "signal": "hold", "confidence": 80},
                {"symbol": "TLT", "allocation": 25.0, "signal": "sell", "confidence": 70},
                {"symbol": "GLD", "allocation": 25.0, "signal": "buy", "confidence": 75},
                {"symbol": "VNQ", "allocation": 25.0, "signal": "hold", "confidence": 60}
            ]
        }
    ]
    
    overlays = []
    
    for i, overlay_data in enumerate(demo_overlays):
        # Generate realistic performance metrics
        total_return = random.uniform(-15, 45)
        win_rate = random.uniform(45, 85)
        avg_rotation_return = random.uniform(-5, 12)
        max_drawdown = random.uniform(5, 25)
        rotation_count = random.randint(5, 50)
        
        # Calculate trust score based on performance
        trust_score = min(100, max(0, 
            (win_rate * 0.4) + 
            (max(0, total_return) * 0.3) + 
            (100 - max_drawdown) * 0.2 + 
            (min(rotation_count / 20, 1) * 10)
        ))
        
        # Generate timing data
        last_rotation = datetime.now() - timedelta(days=random.randint(1, 30))
        
        if overlay_data["status"] == "cooling_down":
            cooldown_ends = datetime.now() + timedelta(hours=random.randint(2, 48))
            next_rotation = cooldown_ends + timedelta(days=1)
        elif overlay_data["status"] == "active":
            next_rotation = datetime.now() + timedelta(days=random.randint(1, 7))
            cooldown_ends = None
        else:
            next_rotation = None
            cooldown_ends = None
        
        overlay = RotationOverlay(
            id=str(uuid.uuid4()),
            name=overlay_data["name"],
            description=overlay_data["description"],
            status=overlay_data["status"],
            currentWeight=random.uniform(15, 35),
            targetWeight=random.uniform(20, 40),
            signalStrength=random.uniform(60, 95),
            trustScore=trust_score,
            rotationTiming=RotationTiming(
                lastRotation=last_rotation.isoformat(),
                nextRotation=next_rotation.isoformat() if next_rotation else None,
                cooldownEnds=cooldown_ends.isoformat() if cooldown_ends else None,
                frequency=overlay_data["frequency"]
            ),
            performance=OverlayPerformance(
                totalReturn=total_return,
                winRate=win_rate,
                avgRotationReturn=avg_rotation_return,
                maxDrawdown=max_drawdown
            ),
            assets=[OverlayAsset(**asset) for asset in overlay_data["assets"]],
            metadata=OverlayMetadata(
                createdAt=(datetime.now() - timedelta(days=random.randint(30, 365))).isoformat(),
                updatedAt=datetime.now().isoformat(),
                rotationCount=rotation_count,
                isUserDefined=random.choice([True, False])
            )
        )
        
        overlays.append(overlay)
    
    return overlays

@router.get("/overlays")
async def get_rotation_overlays(
    userId: str = Query(..., description="User ID"),
    vaultId: Optional[str] = Query(None, description="Vault ID")
) -> RotationOverlayResponse:
    """
    Get all rotation overlays for a user with summary and comparison data
    """
    try:
        create_rotation_overlay_tables()
        
        # For demo purposes, generate realistic overlay data
        overlays = generate_demo_overlays(userId, vaultId)
        
        # Calculate summary statistics
        total_overlays = len(overlays)
        active_overlays = len([o for o in overlays if o.status == 'active'])
        avg_trust_score = sum(o.trustScore for o in overlays) / total_overlays if total_overlays > 0 else 0
        pending_rotations = len([o for o in overlays if o.status in ['triggered', 'cooling_down']])
        total_performance = sum(o.performance.totalReturn for o in overlays) / total_overlays if total_overlays > 0 else 0
        
        summary = OverlaySummary(
            totalOverlays=total_overlays,
            activeOverlays=active_overlays,
            avgTrustScore=avg_trust_score,
            pendingRotations=pending_rotations,
            totalPerformance=total_performance
        )
        
        # Calculate portfolio vs overlay comparison
        portfolio_value = 125000.0  # Demo portfolio value
        overlay_value = sum(o.currentWeight * portfolio_value / 100 for o in overlays)
        difference = overlay_value - portfolio_value
        difference_percent = (difference / portfolio_value) * 100 if portfolio_value > 0 else 0
        
        # Determine recommendation
        if abs(difference_percent) > 10:
            recommendation = "rotate"
        elif abs(difference_percent) > 5:
            recommendation = "hold"
        else:
            recommendation = "pause"
        
        comparison = OverlayComparison(
            portfolioValue=portfolio_value,
            overlayValue=overlay_value,
            difference=difference,
            differencePercent=difference_percent,
            recommendation=recommendation
        )
        
        return RotationOverlayResponse(
            overlays=overlays,
            summary=summary,
            comparison=comparison,
            lastUpdated=datetime.now().isoformat()
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch rotation overlays: {str(e)}")

@router.get("/overlays/{overlay_id}")
async def get_overlay_details(overlay_id: str) -> RotationOverlay:
    """Get detailed information for a specific overlay"""
    try:
        # For demo purposes, generate a single overlay
        overlays = generate_demo_overlays("demo_user")
        overlay = next((o for o in overlays if o.id == overlay_id), None)
        
        if not overlay:
            # Generate a new overlay if not found
            overlay = overlays[0] if overlays else None
            
        if not overlay:
            raise HTTPException(status_code=404, detail="Overlay not found")
        
        return overlay
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch overlay details: {str(e)}")

@router.patch("/overlays/{overlay_id}/status")
async def update_overlay_status(
    overlay_id: str,
    status_data: Dict[str, str]
):
    """Update the status of a rotation overlay"""
    try:
        status = status_data.get("status")
        if status not in ["active", "cooling_down", "triggered", "paused"]:
            raise HTTPException(status_code=400, detail="Invalid status")
        
        # In a real implementation, this would update the database
        # For demo purposes, we'll just return success
        
        return {
            "success": True,
            "message": f"Overlay status updated to {status}",
            "overlayId": overlay_id,
            "newStatus": status,
            "updatedAt": datetime.now().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update overlay status: {str(e)}")

@router.post("/overlays/{overlay_id}/rotate")
async def trigger_rotation(
    overlay_id: str,
    rotation_data: Dict[str, bool]
):
    """Trigger a manual rotation for an overlay"""
    try:
        force = rotation_data.get("force", False)
        
        # In a real implementation, this would trigger the rotation logic
        # For demo purposes, we'll simulate the rotation
        
        return {
            "success": True,
            "message": f"Rotation {'forced' if force else 'triggered'} for overlay",
            "overlayId": overlay_id,
            "rotationId": str(uuid.uuid4()),
            "triggeredAt": datetime.now().isoformat(),
            "force": force
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to trigger rotation: {str(e)}")

@router.get("/overlays/{overlay_id}/history")
async def get_rotation_history(
    overlay_id: str,
    limit: int = Query(20, description="Number of history records to return")
):
    """Get rotation history for a specific overlay"""
    try:
        # Generate demo rotation history
        history = []
        
        for i in range(min(limit, 10)):  # Demo with up to 10 records
            rotation_date = datetime.now() - timedelta(days=i * 7)
            
            history.append({
                "id": str(uuid.uuid4()),
                "overlayId": overlay_id,
                "rotationDate": rotation_date.isoformat(),
                "returnPercent": random.uniform(-8, 15),
                "assetsRotated": random.randint(2, 5),
                "triggerReason": random.choice([
                    "Signal threshold reached",
                    "Scheduled rotation",
                    "Manual trigger",
                    "Risk management",
                    "Market condition change"
                ]),
                "executionTime": random.uniform(0.5, 3.0),  # seconds
                "success": random.choice([True, True, True, False])  # 75% success rate
            })
        
        return history
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch rotation history: {str(e)}")      