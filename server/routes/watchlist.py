from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional, Dict, Any
from datetime import datetime
import json
import sqlite3
from pathlib import Path
import uuid
from pydantic import BaseModel, Field

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

# Database connection
def get_db_connection():
    db_path = Path(__file__).parent.parent.parent / "prisma" / "dev.db"
    return sqlite3.connect(str(db_path))

# Database operations
def create_watchlist_tables():
    """Create watchlist tables if they don't exist"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Create watchlists table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS watchlists (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            owner_id TEXT NOT NULL,
            is_public BOOLEAN DEFAULT FALSE,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
    """)
    
    # Create watchlist items table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS watchlist_items (
            id TEXT PRIMARY KEY,
            watchlist_id TEXT NOT NULL,
            symbol TEXT NOT NULL,
            name TEXT NOT NULL,
            price REAL NOT NULL,
            change_24h REAL DEFAULT 0,
            market_cap REAL,
            notes TEXT,
            added_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (watchlist_id) REFERENCES watchlists (id) ON DELETE CASCADE
        )
    """)
    
    # Create watchlist shares table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS watchlist_shares (
            id TEXT PRIMARY KEY,
            watchlist_id TEXT NOT NULL,
            owner_id TEXT NOT NULL,
            shared_with_id TEXT NOT NULL,
            is_read_only BOOLEAN DEFAULT FALSE,
            shared_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (watchlist_id) REFERENCES watchlists (id) ON DELETE CASCADE,
            UNIQUE(watchlist_id, shared_with_id)
        )
    """)
    
    conn.commit()
    conn.close()

def get_watchlist_by_id(watchlist_id: str, user_id: str) -> Optional[Watchlist]:
    """Get watchlist by ID with permission check"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Check if user owns the watchlist or has access to it
    cursor.execute("""
        SELECT w.*, 
               (CASE WHEN w.owner_id = ? THEN 1 ELSE 0 END) as is_owner,
               (CASE WHEN ws.is_read_only = 1 THEN 1 ELSE 0 END) as is_read_only
        FROM watchlists w
        LEFT JOIN watchlist_shares ws ON w.id = ws.watchlist_id AND ws.shared_with_id = ?
        WHERE w.id = ? AND (w.owner_id = ? OR ws.shared_with_id = ? OR w.is_public = 1)
    """, (user_id, user_id, watchlist_id, user_id, user_id))
    
    row = cursor.fetchone()
    if not row:
        conn.close()
        return None
    
    # Get watchlist items
    cursor.execute("""
        SELECT symbol, name, price, change_24h, market_cap, notes, added_at
        FROM watchlist_items
        WHERE watchlist_id = ?
        ORDER BY added_at DESC
    """, (watchlist_id,))
    
    items_data = cursor.fetchall()
    items = [
        WatchlistItem(
            symbol=item[0],
            name=item[1],
            price=item[2],
            change_24h=item[3],
            market_cap=item[4],
            notes=item[5],
            addedAt=item[6]
        )
        for item in items_data
    ]
    
    # Get shared users
    cursor.execute("""
        SELECT shared_with_id
        FROM watchlist_shares
        WHERE watchlist_id = ?
    """, (watchlist_id,))
    
    shared_with = [row[0] for row in cursor.fetchall()]
    
    conn.close()
    
    return Watchlist(
        id=row[0],
        name=row[1],
        description=row[2],
        items=items,
        ownerId=row[3],
        sharedWith=shared_with,
        isPublic=bool(row[4]),
        isReadOnly=bool(row[6]) if row[5] == 0 else False,  # Only read-only if not owner
        createdAt=row[5],
        updatedAt=row[6]
    )

# API Endpoints
@router.get("/watchlist")
async def get_user_watchlists(
    user_id: str = Query(..., description="User ID"),
    include_shared: bool = Query(True, description="Include shared watchlists")
):
    """Get user's watchlists including owned and shared"""
    try:
        create_watchlist_tables()
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get owned watchlists
        cursor.execute("""
            SELECT id, name, description, owner_id, is_public, created_at, updated_at
            FROM watchlists
            WHERE owner_id = ?
            ORDER BY updated_at DESC
        """, (user_id,))
        
        owned_watchlists = []
        for row in cursor.fetchall():
            watchlist = get_watchlist_by_id(row[0], user_id)
            if watchlist:
                owned_watchlists.append(watchlist.dict())
        
        result = {
            "owned": owned_watchlists,
            "shared": []
        }
        
        if include_shared:
            # Get shared watchlists
            cursor.execute("""
                SELECT w.id, w.name, w.description, w.owner_id, w.is_public, 
                       w.created_at, w.updated_at, ws.shared_at, ws.is_read_only
                FROM watchlists w
                JOIN watchlist_shares ws ON w.id = ws.watchlist_id
                WHERE ws.shared_with_id = ?
                ORDER BY ws.shared_at DESC
            """, (user_id,))
            
            shared_watchlists = []
            for row in cursor.fetchall():
                watchlist = get_watchlist_by_id(row[0], user_id)
                if watchlist:
                    shared_watchlists.append({
                        "watchlist": watchlist.dict(),
                        "sharedBy": row[3],
                        "sharedAt": row[7],
                        "canEdit": not bool(row[8])
                    })
            
            result["shared"] = shared_watchlists
        
        conn.close()
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
        create_watchlist_tables()
        
        watchlist_id = str(uuid.uuid4())
        created_at = datetime.now().isoformat()
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Create watchlist
        cursor.execute("""
            INSERT INTO watchlists (id, name, description, owner_id, is_public, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            watchlist_id,
            request.name,
            request.description,
            user_id,
            request.isPublic,
            created_at,
            created_at
        ))
        
        # Add items if provided
        for item in request.items:
            item_id = str(uuid.uuid4())
            cursor.execute("""
                INSERT INTO watchlist_items 
                (id, watchlist_id, symbol, name, price, change_24h, market_cap, notes, added_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                item_id,
                watchlist_id,
                item.symbol,
                item.name,
                item.price,
                item.change_24h,
                item.market_cap,
                item.notes,
                item.addedAt
            ))
        
        conn.commit()
        conn.close()
        
        # Return created watchlist
        watchlist = get_watchlist_by_id(watchlist_id, user_id)
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
        create_watchlist_tables()
        
        # Check if user has edit permission
        watchlist = get_watchlist_by_id(watchlist_id, user_id)
        if not watchlist:
            raise HTTPException(status_code=404, detail="Watchlist not found")
        
        if watchlist.ownerId != user_id and watchlist.isReadOnly:
            raise HTTPException(status_code=403, detail="No permission to edit this watchlist")
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Update watchlist
        update_fields = []
        update_values = []
        
        if request.name is not None:
            update_fields.append("name = ?")
            update_values.append(request.name)
        
        if request.description is not None:
            update_fields.append("description = ?")
            update_values.append(request.description)
        
        if request.isPublic is not None:
            update_fields.append("is_public = ?")
            update_values.append(request.isPublic)
        
        if update_fields:
            update_fields.append("updated_at = ?")
            update_values.append(datetime.now().isoformat())
            update_values.append(watchlist_id)
            
            cursor.execute(f"""
                UPDATE watchlists 
                SET {', '.join(update_fields)}
                WHERE id = ?
            """, update_values)
        
        # Update items if provided
        if request.items is not None:
            # Delete existing items
            cursor.execute("DELETE FROM watchlist_items WHERE watchlist_id = ?", (watchlist_id,))
            
            # Add new items
            for item in request.items:
                item_id = str(uuid.uuid4())
                cursor.execute("""
                    INSERT INTO watchlist_items 
                    (id, watchlist_id, symbol, name, price, change_24h, market_cap, notes, added_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    item_id,
                    watchlist_id,
                    item.symbol,
                    item.name,
                    item.price,
                    item.change_24h,
                    item.market_cap,
                    item.notes,
                    item.addedAt
                ))
        
        conn.commit()
        conn.close()
        
        # Return updated watchlist
        updated_watchlist = get_watchlist_by_id(watchlist_id, user_id)
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
        create_watchlist_tables()
        
        # Check if user owns the watchlist
        watchlist = get_watchlist_by_id(watchlist_id, user_id)
        if not watchlist:
            raise HTTPException(status_code=404, detail="Watchlist not found")
        
        if watchlist.ownerId != user_id:
            raise HTTPException(status_code=403, detail="Only the owner can delete this watchlist")
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Delete watchlist (items and shares will be deleted by CASCADE)
        cursor.execute("DELETE FROM watchlists WHERE id = ?", (watchlist_id,))
        
        conn.commit()
        conn.close()
        
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
        create_watchlist_tables()
        
        # Check if user owns the watchlist
        watchlist = get_watchlist_by_id(request.watchlistId, user_id)
        if not watchlist:
            raise HTTPException(status_code=404, detail="Watchlist not found")
        
        if watchlist.ownerId != user_id:
            raise HTTPException(status_code=403, detail="Only the owner can share this watchlist")
        
        # Check if already shared with this user
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT id FROM watchlist_shares
            WHERE watchlist_id = ? AND shared_with_id = ?
        """, (request.watchlistId, request.recipientId))
        
        if cursor.fetchone():
            raise HTTPException(status_code=400, detail="Watchlist already shared with this user")
        
        # Create share record
        share_id = str(uuid.uuid4())
        shared_at = datetime.now().isoformat()
        
        cursor.execute("""
            INSERT INTO watchlist_shares (id, watchlist_id, owner_id, shared_with_id, is_read_only, shared_at)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (
            share_id,
            request.watchlistId,
            user_id,
            request.recipientId,
            request.readOnly,
            shared_at
        ))
        
        conn.commit()
        conn.close()
        
        return {
            "message": "Watchlist shared successfully",
            "shareId": share_id,
            "sharedAt": shared_at,
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
        create_watchlist_tables()
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT w.id, w.name, w.description, w.owner_id, w.is_public, 
                   w.created_at, w.updated_at, ws.shared_at, ws.is_read_only
            FROM watchlists w
            JOIN watchlist_shares ws ON w.id = ws.watchlist_id
            WHERE ws.shared_with_id = ?
            ORDER BY ws.shared_at DESC
        """, (user_id,))
        
        shared_watchlists = []
        for row in cursor.fetchall():
            watchlist = get_watchlist_by_id(row[0], user_id)
            if watchlist:
                shared_watchlists.append({
                    "watchlist": watchlist.dict(),
                    "sharedBy": row[3],
                    "sharedAt": row[7],
                    "canEdit": not bool(row[8])
                })
        
        conn.close()
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
        create_watchlist_tables()
        
        # Check if user owns the watchlist
        watchlist = get_watchlist_by_id(watchlist_id, user_id)
        if not watchlist:
            raise HTTPException(status_code=404, detail="Watchlist not found")
        
        if watchlist.ownerId != user_id:
            raise HTTPException(status_code=403, detail="Only the owner can unshare this watchlist")
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Remove share record
        cursor.execute("""
            DELETE FROM watchlist_shares
            WHERE watchlist_id = ? AND shared_with_id = ?
        """, (watchlist_id, recipient_id))
        
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Share record not found")
        
        conn.commit()
        conn.close()
        
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
        create_watchlist_tables()
        
        watchlist = get_watchlist_by_id(watchlist_id, user_id)
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
        create_watchlist_tables()
        
        watchlist = get_watchlist_by_id(watchlist_id, user_id)
        if not watchlist:
            raise HTTPException(status_code=404, detail="Watchlist not found or access denied")
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get all shares for this watchlist
        cursor.execute("""
            SELECT shared_with_id, is_read_only, shared_at
            FROM watchlist_shares
            WHERE watchlist_id = ?
        """, (watchlist_id,))
        
        shares = []
        for row in cursor.fetchall():
            shares.append({
                "userId": row[0],
                "readOnly": bool(row[1]),
                "sharedAt": row[2]
            })
        
        conn.close()
        
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