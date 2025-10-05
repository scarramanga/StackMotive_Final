from fastapi import APIRouter, Depends, Query, Response, Body, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
import csv
import io
from server.database import get_db
from server.auth import get_current_user
from server.models.user import User
from server.models.signal_models import TradingSignal, RebalanceAction
from sqlalchemy import select, and_, or_, func
from datetime import datetime

router = APIRouter()

# --- Audit logging utility ---
def audit_log(user_id: int, action: str, details: dict, db: Session):
    # Implement your audit logging here (or call your existing audit logger)
    # For now, just print (replace with real audit log insert)
    print(f"AUDIT: user={user_id} action={action} details={details}")

# --- Helper: Query signal log with filters and join rebalance actions ---
def query_signal_log(db: Session, user_id: int, asset: Optional[str], overlay: Optional[str], trigger: Optional[str], limit: int = 100, offset: int = 0):
    # Build base query
    query = db.query(TradingSignal).filter(TradingSignal.userId == user_id)
    if asset:
        query = query.filter(TradingSignal.symbol == asset)
    if overlay:
        query = query.filter(TradingSignal.technicalIndicators["overlay"].astext == overlay)
    if trigger:
        query = query.filter(TradingSignal.technicalIndicators["trigger"].astext == trigger)
    query = query.order_by(TradingSignal.generatedAt.desc()).limit(limit).offset(offset)
    signals = query.all()
    # Fetch rebalance actions for these signals (if any)
    signal_ids = [s.id for s in signals]
    rebalances = db.query(RebalanceAction).filter(RebalanceAction.userId == user_id, RebalanceAction.recommendationId.in_(signal_ids)).all()
    # Map rebalances by signal id
    rebalance_map = {r.recommendationId: r for r in rebalances}
    # Attach rebalance info to signals
    for s in signals:
        s.rebalance = rebalance_map.get(s.id)
    return signals

# --- GET: Fetch signal log (filterable, paginated) ---
@router.get("/api/signal-log", tags=["Signal Log"])
def get_signal_log(
    asset: Optional[str] = Query(None),
    overlay: Optional[str] = Query(None),
    trigger: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    signals = query_signal_log(db, user.id, asset, overlay, trigger, limit, offset)
    audit_log(user.id, "fetch_signal_log", {"asset": asset, "overlay": overlay, "trigger": trigger, "limit": limit, "offset": offset}, db)
    # Serialize for response
    def serialize_signal(s):
        return {
            "id": s.id,
            "symbol": s.symbol,
            "action": s.action,
            "signalStrength": float(s.signalStrength) if s.signalStrength is not None else None,
            "technicalIndicators": s.technicalIndicators,
            "status": s.status,
            "generatedAt": s.generatedAt,
            "executedAt": s.executedAt,
            "notes": s.notes,
            "rebalance": {
                "id": s.rebalance.id,
                "actionType": s.rebalance.actionType,
                "amount": float(s.rebalance.amount),
                "executedAt": s.rebalance.executedAt,
                "oldAllocation": float(s.rebalance.oldAllocation),
                "newAllocation": float(s.rebalance.newAllocation),
                "status": s.rebalance.status,
                "notes": s.rebalance.notes
            } if getattr(s, "rebalance", None) else None
        }
    return [serialize_signal(s) for s in signals]

# --- GET: Export signal log as CSV ---
@router.get("/api/signal-log/export", tags=["Signal Log"])
def export_signal_log_csv(
    asset: Optional[str] = Query(None),
    overlay: Optional[str] = Query(None),
    trigger: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    signals = query_signal_log(db, user.id, asset, overlay, trigger, limit=1000, offset=0)
    audit_log(user.id, "export_signal_log_csv", {"asset": asset, "overlay": overlay, "trigger": trigger}, db)
    # Prepare CSV
    output = io.StringIO()
    writer = csv.writer(output)
    header = [
        "id", "symbol", "action", "signalStrength", "status", "generatedAt", "executedAt", "notes",
        "rebalance_id", "rebalance_actionType", "rebalance_amount", "rebalance_executedAt", "rebalance_oldAllocation", "rebalance_newAllocation", "rebalance_status", "rebalance_notes"
    ]
    writer.writerow(header)
    for s in signals:
        r = getattr(s, "rebalance", None)
        writer.writerow([
            s.id, s.symbol, s.action, float(s.signalStrength) if s.signalStrength is not None else None, s.status, s.generatedAt, s.executedAt, s.notes,
            r.id if r else None, r.actionType if r else None, float(r.amount) if r else None, r.executedAt if r else None, float(r.oldAllocation) if r else None, float(r.newAllocation) if r else None, r.status if r else None, r.notes if r else None
        ])
    output.seek(0)
    return Response(content=output.read(), media_type="text/csv", headers={"Content-Disposition": "attachment; filename=signal_log.csv"})

@router.post("/api/signal-log/update", tags=["Signal Log"])
def update_signal_log(
    signal_id: int = Body(...),
    action: str = Body(...),  # 'snooze' or 'override'
    snooze_until: Optional[str] = Body(None),
    override_justification: Optional[str] = Body(None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    # Fetch the signal
    signal = db.query(TradingSignal).filter(TradingSignal.id == signal_id, TradingSignal.userId == user.id).first()
    if not signal:
        raise HTTPException(status_code=404, detail="Signal not found")
    
    if action == 'snooze':
        signal.status = 'snoozed'
        signal.snoozeUntil = snooze_until
    elif action == 'override':
        signal.status = 'overridden'
        signal.overrideJustification = override_justification
        signal.overrideBy = user.id
        signal.overrideAt = datetime.utcnow()
    else:
        raise HTTPException(status_code=400, detail="Invalid action")
        
    db.commit()
    audit_log(user.id, f"signal_{action}", {"signal_id": signal_id}, db)
    # Return updated signal
    updated_signal = db.query(TradingSignal).filter(TradingSignal.id == signal_id).first()
    return {"success": True, "signal": dict(updated_signal) if updated_signal else None} 