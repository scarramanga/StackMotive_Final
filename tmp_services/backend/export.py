from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from datetime import datetime, timezone
import uuid
import hashlib
import json
from pydantic import BaseModel, Field
import psycopg2
from psycopg2.extras import RealDictCursor
import os

router = APIRouter()

# Pydantic models for request/response
class SnapshotExportRequest(BaseModel):
    userId: str
    type: str = Field(..., description="Export type: CSV, JSON, ZIP, PDF, PNG")
    metadata: dict = Field(default_factory=dict, description="Export metadata")
    hash: str = Field(..., description="Content hash for verification")
    exportMethod: str = Field(..., description="Export method: manual, scheduled")

class SnapshotExportResponse(BaseModel):
    id: str
    userId: str
    type: str
    metadata: dict
    hash: str
    exportMethod: str
    exportedAt: datetime
    status: str = "completed"

class SnapshotExportHistoryResponse(BaseModel):
    id: str
    userId: str
    type: str
    metadata: dict
    hash: str
    exportMethod: str
    exportedAt: datetime
    status: str
    fileSize: Optional[int] = None
    downloadCount: int = 0

# Database connection
def get_db_connection():
    database_url = os.getenv("DATABASE_URL", "postgresql://postgres:password@localhost:5432/stackmotive")
    return psycopg2.connect(database_url)

# Database operations
def create_snapshot_export_history_table():
    """Create snapshot export history table if it doesn't exist"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS snapshot_export_history (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            export_type TEXT NOT NULL,
            metadata TEXT NOT NULL,
            content_hash TEXT NOT NULL,
            export_method TEXT NOT NULL,
            exported_at TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'completed',
            file_size INTEGER,
            download_count INTEGER DEFAULT 0,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
    """)
    
    conn.commit()
    conn.close()

# API Endpoints
@router.post("/export/snapshot")
async def create_snapshot_export(
    export_request: SnapshotExportRequest,
    user_id: int = 1  # TODO: Get from authentication
):
    """
    Log a snapshot export operation
    
    This endpoint is called after successful export to log the operation
    for audit trail and history tracking.
    """
    try:
        # Validate export type
        valid_types = ["CSV", "JSON", "ZIP", "PDF", "PNG"]
        if export_request.type not in valid_types:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid export type. Must be one of: {', '.join(valid_types)}"
            )
        
        # Validate export method
        valid_methods = ["manual", "scheduled"]
        if export_request.exportMethod not in valid_methods:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid export method. Must be one of: {', '.join(valid_methods)}"
            )
        
        # Ensure table exists
        create_snapshot_export_history_table()
        
        # Create export record
        export_id = str(uuid.uuid4())
        exported_at = datetime.now(timezone.utc).isoformat()
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO snapshot_export_history 
            (id, user_id, export_type, metadata, content_hash, export_method, exported_at, status)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            export_id,
            export_request.userId,
            export_request.type,
            json.dumps(export_request.metadata),
            export_request.hash,
            export_request.exportMethod,
            exported_at,
            "completed"
        ))
        
        conn.commit()
        conn.close()
        
        return {
            "id": export_id,
            "userId": export_request.userId,
            "type": export_request.type,
            "metadata": export_request.metadata,
            "hash": export_request.hash,
            "exportMethod": export_request.exportMethod,
            "exportedAt": exported_at,
            "status": "completed"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to log export: {str(e)}"
        )

@router.get("/export/history/{user_id}")
async def get_export_history_for_user(
    user_id: str,
    limit: int = Query(50, description="Number of records to return"),
    current_user_id: int = 1  # TODO: Get from authentication
):
    """
    Get export history for a specific user
    
    Returns chronologically ordered list of export operations
    with metadata and audit information.
    """
    try:
        # Ensure table exists
        create_snapshot_export_history_table()
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT id, user_id, export_type, metadata, content_hash, export_method, 
                   exported_at, status, file_size, download_count
            FROM snapshot_export_history 
            WHERE user_id = %s 
            ORDER BY exported_at DESC 
            LIMIT %s
        """, (user_id, limit))
        
        rows = cursor.fetchall()
        conn.close()
        
        history = []
        for row in rows:
            history.append({
                "id": row[0],
                "userId": row[1],
                "type": row[2],
                "metadata": json.loads(row[3]) if row[3] else {},
                "hash": row[4],
                "exportMethod": row[5],
                "exportedAt": row[6],
                "status": row[7],
                "fileSize": row[8],
                "downloadCount": row[9] or 0
            })
        
        return history
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve export history: {str(e)}"
        )

@router.get("/export/stats/{user_id}")
async def get_export_stats(
    user_id: str,
    current_user_id: int = 1  # TODO: Get from authentication
):
    """
    Get export statistics for a user
    
    Returns summary statistics about export activity.
    """
    try:
        # Ensure table exists
        create_snapshot_export_history_table()
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT 
                COUNT(*) as total_exports,
                COUNT(DISTINCT export_type) as unique_types,
                SUM(CASE WHEN export_method = 'manual' THEN 1 ELSE 0 END) as manual_exports,
                SUM(CASE WHEN export_method = 'scheduled' THEN 1 ELSE 0 END) as scheduled_exports,
                MAX(exported_at) as last_export,
                AVG(file_size) as avg_file_size
            FROM snapshot_export_history 
            WHERE user_id = %s
        """, (user_id,))
        
        row = cursor.fetchone()
        conn.close()
        
        if not row:
            return {
                "totalExports": 0,
                "uniqueTypes": 0,
                "manualExports": 0,
                "scheduledExports": 0,
                "lastExport": None,
                "avgFileSize": None
            }
        
        return {
            "totalExports": row[0] or 0,
            "uniqueTypes": row[1] or 0,
            "manualExports": row[2] or 0,
            "scheduledExports": row[3] or 0,
            "lastExport": row[4],
            "avgFileSize": row[5]
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve export stats: {str(e)}"
        )              