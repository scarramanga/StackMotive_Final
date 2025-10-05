from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional, Dict, Any
from datetime import datetime
import json
import uuid
from pydantic import BaseModel, Field
from database import get_db_connection

router = APIRouter()

# Pydantic models for request/response
class WatchlistItem(BaseModel):
    symbol: str
    name: str
    price: float
    change_24h: float
    market_cap: Optional[float] = None
    addedAt: str
    notes: Optional[str] = None

class Watchlist(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    items: List[WatchlistItem]
    ownerId: str
    sharedWith: List[str] = Field(default_factory=list)
    isPublic: bool = False
    isReadOnly: bool = False
    createdAt: str
    updatedAt: str

class WatchlistCreateRequest(BaseModel):
    name: str
    description: Optional[str] = None
    items: List[WatchlistItem] = Field(default_factory=list)
    isPublic: bool = False

class WatchlistUpdateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    items: Optional[List[WatchlistItem]] = None
    isPublic: Optional[bool] = None

class WatchlistShareRequest(BaseModel):
    watchlistId: str
    recipientId: str
    readOnly: bool = False

class SharedWatchlistResponse(BaseModel):
    watchlist: Watchlist
    sharedBy: str
    sharedAt: str
    canEdit: bool

async def get_watchlist_by_id(watchlist_id: str, user_id: str) -> Optional[Watchlist]:
    """Get watchlist by ID with permission check"""
    async with get_db_connection() as conn:
        row = await conn.fetchrow("""
            SELECT w.id, w.name, w.description, w.owner_id, w.is_public, w.created_at, w.updated_at,
                   (CASE WHEN w.owner_id = $2 THEN 1 ELSE 0 END) as is_owner,
                   (CASE WHEN ws.is_read_only = true THEN 1 ELSE 0 END) as is_read_only
            FROM watchlists w
            LEFT JOIN watchlist_shares ws ON w.id = ws.watchlist_id AND ws.shared_with_id = $2
            WHERE w.id = $1 AND (w.owner_id = $2 OR ws.shared_with_id = $2 OR w.is_public = true)
        """, watchlist_id, user_id)
        
        if not row:
            return None
        
        items_data = await conn.fetch("""
            SELECT symbol, name, price, change_24h, market_cap, notes, added_at
            FROM watchlist_items
            WHERE watchlist_id = $1
            ORDER BY added_at DESC
        """, watchlist_id)
        
        items = [
            WatchlistItem(
                symbol=item['symbol'],
                name=item['name'],
                price=item['price'],
                change_24h=item['change_24h'],
                market_cap=item['market_cap'],
                notes=item['notes'],
                addedAt=item['added_at'].isoformat() if hasattr(item['added_at'], 'isoformat') else str(item['added_at'])
            )
            for item in items_data
        ]
        
        shared_data = await conn.fetch("""
            SELECT shared_with_id
            FROM watchlist_shares
            WHERE watchlist_id = $1
        """, watchlist_id)
        
        shared_with = [r['shared_with_id'] for r in shared_data]
        
        return Watchlist(
            id=row['id'],
            name=row['name'],
            description=row['description'],
            items=items,
            ownerId=row['owner_id'],
            sharedWith=shared_with,
            isPublic=bool(row['is_public']),
            isReadOnly=bool(row['is_read_only']) if row['is_owner'] == 0 else False,
            createdAt=row['created_at'].isoformat() if hasattr(row['created_at'], 'isoformat') else str(row['created_at']),
            updatedAt=row['updated_at'].isoformat() if hasattr(row['updated_at'], 'isoformat') else str(row['updated_at'])
        )

# API Endpoints
@router.get("/watchlist")
async def get_user_watchlists(
    user_id: str = Query(..., description="User ID"),
    include_shared: bool = Query(True, description="Include shared watchlists")
):
    """Get user's watchlists including owned and shared"""
    try:
        async with get_db_connection() as conn:
            owned_rows = await conn.fetch("""
                SELECT id, name, description, owner_id, is_public, created_at, updated_at
                FROM watchlists
                WHERE owner_id = $1
                ORDER BY updated_at DESC
            """, user_id)
            
            owned_watchlists = []
            for row in owned_rows:
                watchlist = await get_watchlist_by_id(row['id'], user_id)
                if watchlist:
                    owned_watchlists.append(watchlist.dict())
            
            result = {
                "owned": owned_watchlists,
                "shared": []
            }
            
            if include_shared:
                shared_rows = await conn.fetch("""
                    SELECT w.id, w.name, w.description, w.owner_id, w.is_public, 
                           w.created_at, w.updated_at, ws.shared_at, ws.is_read_only
                    FROM watchlists w
                    JOIN watchlist_shares ws ON w.id = ws.watchlist_id
                    WHERE ws.shared_with_id = $1
                    ORDER BY ws.shared_at DESC
                """, user_id)
                
                shared_watchlists = []
                for row in shared_rows:
                    watchlist = await get_watchlist_by_id(row['id'], user_id)
                    if watchlist:
                        shared_watchlists.append({
                            "watchlist": watchlist.dict(),
                            "sharedBy": row['owner_id'],
                            "sharedAt": row['shared_at'].isoformat() if hasattr(row['shared_at'], 'isoformat') else str(row['shared_at']),
                            "canEdit": not bool(row['is_read_only'])
                        })
                
                result["shared"] = shared_watchlists
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get watchlists: {str(e)}")

@router.post("/watchlist")
async def create_watchlist(
    request: WatchlistCreateRequest,
    user_id: str = Query(..., description="User ID")
):
    """Create a new watchlist"""
    try:
        watchlist_id = str(uuid.uuid4())
        created_at = datetime.now()
        
        async with get_db_connection() as conn:
            await conn.execute("""
                INSERT INTO watchlists (id, name, description, owner_id, is_public, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
            """,
                watchlist_id,
                request.name,
                request.description,
                user_id,
                request.isPublic,
                created_at,
                created_at
            )
            
            for item in request.items:
                item_id = str(uuid.uuid4())
                await conn.execute("""
                    INSERT INTO watchlist_items 
                    (id, watchlist_id, symbol, name, price, change_24h, market_cap, notes, added_at)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                """,
                    item_id,
                    watchlist_id,
                    item.symbol,
                    item.name,
                    item.price,
                    item.change_24h,
                    item.market_cap,
                    item.notes,
                    datetime.fromisoformat(item.addedAt) if isinstance(item.addedAt, str) else item.addedAt
                )
        
        watchlist = await get_watchlist_by_id(watchlist_id, user_id)
        return watchlist.dict() if watchlist else None
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create watchlist: {str(e)}")

@router.put("/watchlist/{watchlist_id}")
async def update_watchlist(
    watchlist_id: str,
    request: WatchlistUpdateRequest,
    user_id: str = Query(..., description="User ID")
):
    """Update a watchlist"""
    try:
        watchlist = await get_watchlist_by_id(watchlist_id, user_id)
        if not watchlist:
            raise HTTPException(status_code=404, detail="Watchlist not found")
        
        if watchlist.ownerId != user_id and watchlist.isReadOnly:
            raise HTTPException(status_code=403, detail="No permission to edit this watchlist")
        
        async with get_db_connection() as conn:
            update_fields = []
            param_idx = 2
            params = [watchlist_id]
            
            if request.name is not None:
                update_fields.append(f"name = ${param_idx}")
                params.append(request.name)
                param_idx += 1
            
            if request.description is not None:
                update_fields.append(f"description = ${param_idx}")
                params.append(request.description)
                param_idx += 1
            
            if request.isPublic is not None:
                update_fields.append(f"is_public = ${param_idx}")
                params.append(request.isPublic)
                param_idx += 1
            
            if update_fields:
                update_fields.append(f"updated_at = ${param_idx}")
                params.append(datetime.now())
                
                await conn.execute(f"""
                    UPDATE watchlists 
                    SET {', '.join(update_fields)}
                    WHERE id = $1
                """, *params)
            
            if request.items is not None:
                await conn.execute("DELETE FROM watchlist_items WHERE watchlist_id = $1", watchlist_id)
                
                for item in request.items:
                    item_id = str(uuid.uuid4())
                    await conn.execute("""
                        INSERT INTO watchlist_items 
                        (id, watchlist_id, symbol, name, price, change_24h, market_cap, notes, added_at)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                    """,
                        item_id,
                        watchlist_id,
                        item.symbol,
                        item.name,
                        item.price,
                        item.change_24h,
                        item.market_cap,
                        item.notes,
                        datetime.fromisoformat(item.addedAt) if isinstance(item.addedAt, str) else item.addedAt
                    )
        
        updated_watchlist = await get_watchlist_by_id(watchlist_id, user_id)
        return updated_watchlist.dict() if updated_watchlist else None
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update watchlist: {str(e)}")

@router.delete("/watchlist/{watchlist_id}")
async def delete_watchlist(
    watchlist_id: str,
    user_id: str = Query(..., description="User ID")
):
    """Delete a watchlist"""
    try:
        watchlist = await get_watchlist_by_id(watchlist_id, user_id)
        if not watchlist:
            raise HTTPException(status_code=404, detail="Watchlist not found")
        
        if watchlist.ownerId != user_id:
            raise HTTPException(status_code=403, detail="Only the owner can delete this watchlist")
        
        async with get_db_connection() as conn:
            await conn.execute("DELETE FROM watchlists WHERE id = $1", watchlist_id)
        
        return {"message": "Watchlist deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete watchlist: {str(e)}")

@router.post("/watchlist/share")
async def share_watchlist(
    request: WatchlistShareRequest,
    user_id: str = Query(..., description="User ID")
):
    """Share a watchlist with another user"""
    try:
        watchlist = await get_watchlist_by_id(request.watchlistId, user_id)
        if not watchlist:
            raise HTTPException(status_code=404, detail="Watchlist not found")
        
        if watchlist.ownerId != user_id:
            raise HTTPException(status_code=403, detail="Only the owner can share this watchlist")
        
        async with get_db_connection() as conn:
            existing = await conn.fetchrow("""
                SELECT id FROM watchlist_shares
                WHERE watchlist_id = $1 AND shared_with_id = $2
            """, request.watchlistId, request.recipientId)
            
            if existing:
                raise HTTPException(status_code=400, detail="Watchlist already shared with this user")
            
            share_id = str(uuid.uuid4())
            shared_at = datetime.now()
            
            await conn.execute("""
                INSERT INTO watchlist_shares (id, watchlist_id, owner_id, shared_with_id, is_read_only, shared_at)
                VALUES ($1, $2, $3, $4, $5, $6)
            """,
                share_id,
                request.watchlistId,
                user_id,
                request.recipientId,
                request.readOnly,
                shared_at
            )
        
        return {
            "message": "Watchlist shared successfully",
            "shareId": share_id,
            "sharedAt": shared_at.isoformat(),
            "readOnly": request.readOnly
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to share watchlist: {str(e)}")

@router.get("/watchlist/shared/{user_id}")
async def get_shared_watchlists(
    user_id: str,
    current_user_id: str = Query(..., description="Current user ID")
):
    """Get all watchlists shared with a user"""
    try:
        async with get_db_connection() as conn:
            rows = await conn.fetch("""
                SELECT w.id, w.name, w.description, w.owner_id, w.is_public, 
                       w.created_at, w.updated_at, ws.shared_at, ws.is_read_only
                FROM watchlists w
                JOIN watchlist_shares ws ON w.id = ws.watchlist_id
                WHERE ws.shared_with_id = $1
                ORDER BY ws.shared_at DESC
            """, user_id)
            
            shared_watchlists = []
            for row in rows:
                watchlist = await get_watchlist_by_id(row['id'], user_id)
                if watchlist:
                    shared_watchlists.append({
                        "watchlist": watchlist.dict(),
                        "sharedBy": row['owner_id'],
                        "sharedAt": row['shared_at'].isoformat() if hasattr(row['shared_at'], 'isoformat') else str(row['shared_at']),
                        "canEdit": not bool(row['is_read_only'])
                    })
        
        return shared_watchlists
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get shared watchlists: {str(e)}")

@router.delete("/watchlist/share/{watchlist_id}/{recipient_id}")
async def unshare_watchlist(
    watchlist_id: str,
    recipient_id: str,
    user_id: str = Query(..., description="User ID")
):
    """Remove sharing access for a watchlist"""
    try:
        watchlist = await get_watchlist_by_id(watchlist_id, user_id)
        if not watchlist:
            raise HTTPException(status_code=404, detail="Watchlist not found")
        
        if watchlist.ownerId != user_id:
            raise HTTPException(status_code=403, detail="Only the owner can unshare this watchlist")
        
        async with get_db_connection() as conn:
            result = await conn.execute("""
                DELETE FROM watchlist_shares
                WHERE watchlist_id = $1 AND shared_with_id = $2
            """, watchlist_id, recipient_id)
            
            if result == "DELETE 0":
                raise HTTPException(status_code=404, detail="Share record not found")
        
        return {"message": "Watchlist unshared successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to unshare watchlist: {str(e)}")

@router.get("/watchlist/{watchlist_id}")
async def get_watchlist(
    watchlist_id: str,
    user_id: str = Query(..., description="User ID")
):
    """Get a specific watchlist"""
    try:
        watchlist = await get_watchlist_by_id(watchlist_id, user_id)
        if not watchlist:
            raise HTTPException(status_code=404, detail="Watchlist not found or access denied")
        
        return watchlist.dict()
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get watchlist: {str(e)}")

@router.get("/watchlist/{watchlist_id}/permissions")
async def get_watchlist_permissions(
    watchlist_id: str,
    user_id: str = Query(..., description="User ID")
):
    """Get permissions for a watchlist"""
    try:
        watchlist = await get_watchlist_by_id(watchlist_id, user_id)
        if not watchlist:
            raise HTTPException(status_code=404, detail="Watchlist not found or access denied")
        
        async with get_db_connection() as conn:
            rows = await conn.fetch("""
                SELECT shared_with_id, is_read_only, shared_at
                FROM watchlist_shares
                WHERE watchlist_id = $1
            """, watchlist_id)
            
            shares = []
            for row in rows:
                shares.append({
                    "userId": row['shared_with_id'],
                    "readOnly": bool(row['is_read_only']),
                    "sharedAt": row['shared_at'].isoformat() if hasattr(row['shared_at'], 'isoformat') else str(row['shared_at'])
                })
        
        return {
            "watchlistId": watchlist_id,
            "ownerId": watchlist.ownerId,
            "isPublic": watchlist.isPublic,
            "shares": shares,
            "userPermissions": {
                "canEdit": watchlist.ownerId == user_id or not watchlist.isReadOnly,
                "canDelete": watchlist.ownerId == user_id,
                "canShare": watchlist.ownerId == user_id,
                "isOwner": watchlist.ownerId == user_id
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get permissions: {str(e)}")        