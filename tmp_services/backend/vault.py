# Block 24: Vault Integration (Obsidian)
from fastapi import APIRouter, Request, HTTPException, Depends, Query, Response
from sqlalchemy.orm import Session
from server.models.vault import SovereignVaultEntry, Base
from server.logic.db import get_db
from typing import List, Optional
import uuid
import datetime
import json

router = APIRouter()

@router.post('/api/vault/sovereign')
def add_sovereign_entry(request: Request, db: Session = Depends(get_db)):
    data = request.json()
    user_id = data.get('user_id')
    asset = data.get('asset')
    amount = data.get('amount')
    notes = data.get('notes', '')
    if not user_id or not asset or amount is None:
        raise HTTPException(status_code=400, detail='Missing required fields')
    entry = SovereignVaultEntry(
        id=uuid.uuid4(),
        user_id=user_id,
        asset=asset,
        amount=amount,
        notes=notes,
        created_at=datetime.datetime.utcnow(),
        updated_at=datetime.datetime.utcnow(),
    )
    db.add(entry)
    db.commit()
    # TODO: Audit log
    return {"success": True, "id": str(entry.id)}

@router.get('/api/vault/sovereign')
def list_sovereign_entries(user_id: str = Query(...), db: Session = Depends(get_db)):
    entries = db.query(SovereignVaultEntry).filter_by(user_id=user_id).all()
    return [
        {
            "id": str(e.id),
            "asset": e.asset,
            "amount": e.amount,
            "notes": e.notes,
            "created_at": e.created_at.isoformat(),
            "updated_at": e.updated_at.isoformat(),
        }
        for e in entries
    ]

@router.get('/api/vault/sovereign/export')
def export_sovereign_entries(user_id: str = Query(...), format: Optional[str] = Query('json'), db: Session = Depends(get_db)):
    entries = db.query(SovereignVaultEntry).filter_by(user_id=user_id).all()
    if format == 'markdown':
        md = '# Sovereign Asset Vault\n\n'
        for e in entries:
            md += f'- **Asset:** {e.asset}\n  - Amount: {e.amount}\n  - Notes: {e.notes or "-"}\n  - Created: {e.created_at.isoformat()}\n  - Updated: {e.updated_at.isoformat()}\n\n'
        return Response(content=md, media_type='text/markdown')
    # Default: JSON
    return [
        {
            "id": str(e.id),
            "asset": e.asset,
            "amount": e.amount,
            "notes": e.notes,
            "created_at": e.created_at.isoformat(),
            "updated_at": e.updated_at.isoformat(),
        }
        for e in entries
    ]
# TODO: Add Obsidian/local sync in future 