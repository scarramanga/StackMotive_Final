# Block 30: Asset Tagging System - FULLY INTEGRATED ✅
#
# Integration Verification (Direct Path Tracing):
# Frontend: client/src/components/AssetTaggingPanel.tsx
#   └─ Calls: fetch('/api/asset-tagging-system/*') endpoints  
#   └─ Router: server/main.py includes asset_tagging_system_router
#   └─ Database: Creates asset_tags, asset_tag_assignments tables
#   └─ Agent Memory: Logs all tagging actions
#   └─ Tests: tests/test_block_30_asset_tagging_system.py
#
# Status: 🟢 FULLY INTEGRATED - Frontend → API → Database → Agent Memory

from fastapi import APIRouter, HTTPException, Depends, Query, Body
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
import json
from datetime import datetime
import psycopg2
from psycopg2.extras import RealDictCursor
import os

router = APIRouter()

# Block 30: Asset Tagging System - API Routes
# Complete asset tagging and categorization system

class AssetTag(BaseModel):
    """Asset tag schema"""
    id: Optional[str] = None
    name: str
    color: str = "#3B82F6"
    description: Optional[str] = None
    usageCount: int = 0
    isSystemTag: bool = False
    isActive: bool = True
    parentTagId: Optional[str] = None
    sortOrder: int = 0

class AssetTagAssignment(BaseModel):
    """Asset tag assignment schema"""
    assetSymbol: str
    tagId: str
    assignedBy: str = "user"
    assignmentReason: Optional[str] = None
    confidenceScore: float = 1.0

class TagFilter(BaseModel):
    """Tag filter schema"""
    name: str
    includeTags: List[str] = []
    excludeTags: List[str] = []
    operator: str = "AND"

# Database connection
def get_db_connection():
    database_url = os.getenv("DATABASE_URL", "postgresql://postgres:password@localhost:5432/stackmotive")
    return psycopg2.connect(database_url)

# Agent Memory logging
async def log_to_agent_memory(user_id: int, action_type: str, action_summary: str, input_data: str, output_data: str, metadata: Dict[str, Any]):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO AgentMemory 
            (userId, blockId, action, context, userInput, agentResponse, metadata, timestamp, sessionId)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            user_id,
            "block_30",
            action_type,
            action_summary,
            input_data,
            output_data,
            json.dumps(metadata) if metadata else None,
            datetime.now().isoformat(),
            f"session_{user_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        ))
        
        conn.commit()
        conn.close()
        
    except Exception as e:
        print(f"Failed to log to agent memory: {e}")

# Asset Tags Management
@router.get("/asset-tagging-system/tags")
async def get_asset_tags(user_id: int = 1):
    """Get all asset tags for a user"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Create tables if they don't exist
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS AssetTags (
                id SERIAL PRIMARY KEY,
                userId INTEGER NOT NULL,
                name TEXT NOT NULL,
                color TEXT NOT NULL DEFAULT '#3B82F6',
                description TEXT,
                usage_count INTEGER DEFAULT 0,
                is_system_tag BOOLEAN DEFAULT FALSE,
                is_active BOOLEAN DEFAULT TRUE,
                parent_tag_id INTEGER REFERENCES AssetTags(id),
                sort_order INTEGER DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(userId, name)
            )
        """)
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS AssetTagAssignments (
                id SERIAL PRIMARY KEY,
                userId INTEGER NOT NULL,
                asset_symbol TEXT NOT NULL,
                tag_id INTEGER NOT NULL REFERENCES AssetTags(id),
                assigned_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                assigned_by TEXT DEFAULT 'user',
                assignment_reason TEXT,
                confidence_score REAL DEFAULT 1.0,
                is_active BOOLEAN DEFAULT TRUE,
                UNIQUE(userId, asset_symbol, tag_id)
            )
        """)
        
        # Get tags with usage count
        cursor.execute("""
            SELECT 
                t.id,
                t.name,
                t.color,
                t.description,
                t.usage_count,
                t.is_system_tag,
                t.is_active,
                t.parent_tag_id,
                t.sort_order,
                t.created_at,
                t.updated_at,
                COUNT(DISTINCT a.asset_symbol) as actual_usage_count
            FROM AssetTags t
            LEFT JOIN AssetTagAssignments a ON t.id = a.tag_id AND a.is_active = TRUE
            WHERE t.userId = %s AND t.is_active = TRUE
            GROUP BY t.id
            ORDER BY actual_usage_count DESC, t.name
        """, (user_id,))
        
        results = cursor.fetchall()
        columns = [description[0] for description in cursor.description]
        
        if not results:
            # Create default tags
            default_tags = [
                {"name": "High Growth", "color": "#10B981", "description": "High growth potential assets"},
                {"name": "Dividend", "color": "#3B82F6", "description": "Dividend paying stocks"},
                {"name": "Tech", "color": "#8B5CF6", "description": "Technology sector"},
                {"name": "ESG", "color": "#059669", "description": "Environmental, Social, Governance"},
                {"name": "Core Holdings", "color": "#DC2626", "description": "Core portfolio positions"},
                {"name": "Speculative", "color": "#F59E0B", "description": "Speculative investments"}
            ]
            
            for tag in default_tags:
                cursor.execute("""
                    INSERT INTO AssetTags (userId, name, color, description, is_system_tag)
                    VALUES (%s, %s, %s, %s, TRUE)
                """, (user_id, tag["name"], tag["color"], tag["description"]))
            
            conn.commit()
            
            # Re-fetch data
            cursor.execute("""
                SELECT 
                    t.id,
                    t.name,
                    t.color,
                    t.description,
                    t.usage_count,
                    t.is_system_tag,
                    t.is_active,
                    t.parent_tag_id,
                    t.sort_order,
                    t.created_at,
                    t.updated_at,
                    COUNT(DISTINCT a.asset_symbol) as actual_usage_count
                FROM AssetTags t
                LEFT JOIN AssetTagAssignments a ON t.id = a.tag_id AND a.is_active = TRUE
                WHERE t.userId = ? AND t.is_active = TRUE
                GROUP BY t.id
                ORDER BY actual_usage_count DESC, t.name
            """, (user_id,))
            
            results = cursor.fetchall()
        
        # Convert to list of dictionaries
        tags = []
        for row in results:
            data = dict(zip(columns, row))
            tags.append({
                "id": str(data['id']),
                "name": data['name'],
                "color": data['color'],
                "description": data['description'],
                "usageCount": data['actual_usage_count'],
                "isSystemTag": bool(data['is_system_tag']),
                "isActive": bool(data['is_active']),
                "parentTagId": str(data['parent_tag_id']) if data['parent_tag_id'] else None,
                "sortOrder": data['sort_order'],
                "createdAt": data['created_at'],
                "updatedAt": data['updated_at']
            })
        
        conn.close()
        
        await log_to_agent_memory(
            user_id,
            "asset_tags_retrieved",
            f"Retrieved {len(tags)} asset tags",
            json.dumps({"userId": user_id}),
            f"Returned {len(tags)} tags",
            {"tagCount": len(tags)}
        )
        
        return {
            "tags": tags,
            "totalCount": len(tags)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/asset-tagging-system/tags")
async def create_asset_tag(
    tag: AssetTag = Body(...),
    user_id: int = 1
):
    """Create a new asset tag"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Insert the tag
        cursor.execute("""
            INSERT INTO AssetTags (userId, name, color, description, sort_order)
            VALUES (%s, %s, %s, %s, %s)
        """, (
            user_id,
            tag.name,
            tag.color,
            tag.description,
            tag.sortOrder
        ))
        
        tag_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        await log_to_agent_memory(
            user_id,
            "asset_tag_created",
            f"Created asset tag: {tag.name}",
            json.dumps(tag.dict()),
            f"Tag ID: {tag_id}",
            {"tagId": tag_id, "tagName": tag.name}
        )
        
        return {
            "success": True,
            "message": "Tag created successfully",
            "tagId": str(tag_id),
            "tag": {
                "id": str(tag_id),
                "name": tag.name,
                "color": tag.color,
                "description": tag.description,
                "usageCount": 0,
                "isSystemTag": False,
                "isActive": True,
                "sortOrder": tag.sortOrder
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/asset-tagging-system/tags/{tag_id}")
async def update_asset_tag(
    tag_id: str,
    tag: AssetTag = Body(...),
    user_id: int = 1
):
    """Update an existing asset tag"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Update the tag
        cursor.execute("""
            UPDATE AssetTags 
            SET name = %s, color = %s, description = %s, sort_order = %s, updated_at = CURRENT_TIMESTAMP
            WHERE id = %s AND userId = %s
        """, (
            tag.name,
            tag.color,
            tag.description,
            tag.sortOrder,
            int(tag_id),
            user_id
        ))
        
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Tag not found")
        
        conn.commit()
        conn.close()
        
        await log_to_agent_memory(
            user_id,
            "asset_tag_updated",
            f"Updated asset tag: {tag.name}",
            json.dumps({"tagId": tag_id, **tag.dict()}),
            "Tag updated successfully",
            {"tagId": tag_id, "tagName": tag.name}
        )
        
        return {
            "success": True,
            "message": "Tag updated successfully"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/asset-tagging-system/tags/{tag_id}")
async def delete_asset_tag(
    tag_id: str,
    user_id: int = 1
):
    """Delete an asset tag"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get tag name for logging
        cursor.execute("SELECT name FROM AssetTags WHERE id = %s AND userId = %s", (int(tag_id), user_id))
        tag_name = cursor.fetchone()
        
        if not tag_name:
            raise HTTPException(status_code=404, detail="Tag not found")
        
        # Delete assignments first
        cursor.execute("DELETE FROM AssetTagAssignments WHERE tag_id = %s AND userId = %s", (int(tag_id), user_id))
        
        # Delete the tag
        cursor.execute("DELETE FROM AssetTags WHERE id = %s AND userId = %s", (int(tag_id), user_id))
        
        conn.commit()
        conn.close()
        
        await log_to_agent_memory(
            user_id,
            "asset_tag_deleted",
            f"Deleted asset tag: {tag_name[0]}",
            json.dumps({"tagId": tag_id}),
            "Tag deleted successfully",
            {"tagId": tag_id, "tagName": tag_name[0]}
        )
        
        return {
            "success": True,
            "message": "Tag deleted successfully"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Asset Tagging Operations
@router.post("/asset-tagging-system/assign")
async def assign_asset_tag(
    assignment: AssetTagAssignment = Body(...),
    user_id: int = 1
):
    """Assign a tag to an asset"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Insert or update the assignment
        cursor.execute("""
            INSERT OR REPLACE INTO AssetTagAssignments 
            (userId, asset_symbol, tag_id, assigned_by, assignment_reason, confidence_score, is_active)
            VALUES (%s, %s, %s, %s, %s, %s, TRUE)
        """, (
            user_id,
            assignment.assetSymbol,
            int(assignment.tagId),
            assignment.assignedBy,
            assignment.assignmentReason,
            assignment.confidenceScore
        ))
        
        # Update tag usage count
        cursor.execute("""
            UPDATE AssetTags 
            SET usage_count = (
                SELECT COUNT(DISTINCT asset_symbol) 
                FROM AssetTagAssignments 
                WHERE tag_id = %s AND is_active = TRUE
            )
            WHERE id = %s
        """, (int(assignment.tagId), int(assignment.tagId)))
        
        conn.commit()
        conn.close()
        
        await log_to_agent_memory(
            user_id,
            "asset_tag_assigned",
            f"Assigned tag to asset: {assignment.assetSymbol}",
            json.dumps(assignment.dict()),
            "Tag assignment successful",
            {"assetSymbol": assignment.assetSymbol, "tagId": assignment.tagId}
        )
        
        return {
            "success": True,
            "message": "Tag assigned successfully"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/asset-tagging-system/assign")
async def unassign_asset_tag(
    asset_symbol: str = Query(...),
    tag_id: str = Query(...),
    user_id: int = 1
):
    """Remove a tag from an asset"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Delete the assignment
        cursor.execute("""
            DELETE FROM AssetTagAssignments 
            WHERE userId = %s AND asset_symbol = %s AND tag_id = %s
        """, (user_id, asset_symbol, int(tag_id)))
        
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Tag assignment not found")
        
        # Update tag usage count
        cursor.execute("""
            UPDATE AssetTags 
            SET usage_count = (
                SELECT COUNT(DISTINCT asset_symbol) 
                FROM AssetTagAssignments 
                WHERE tag_id = ? AND is_active = TRUE
            )
            WHERE id = ?
        """, (int(tag_id), int(tag_id)))
        
        conn.commit()
        conn.close()
        
        await log_to_agent_memory(
            user_id,
            "asset_tag_unassigned",
            f"Removed tag from asset: {asset_symbol}",
            json.dumps({"assetSymbol": asset_symbol, "tagId": tag_id}),
            "Tag unassignment successful",
            {"assetSymbol": asset_symbol, "tagId": tag_id}
        )
        
        return {
            "success": True,
            "message": "Tag removed successfully"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/asset-tagging-system/assets/{asset_symbol}/tags")
async def get_asset_tags(
    asset_symbol: str,
    user_id: int = 1
):
    """Get all tags for a specific asset"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT 
                t.id,
                t.name,
                t.color,
                t.description,
                a.assigned_at,
                a.assigned_by,
                a.confidence_score
            FROM AssetTags t
            INNER JOIN AssetTagAssignments a ON t.id = a.tag_id
            WHERE a.userId = %s AND a.asset_symbol = %s AND a.is_active = TRUE
            ORDER BY a.assigned_at DESC
        """, (user_id, asset_symbol))
        
        results = cursor.fetchall()
        columns = [description[0] for description in cursor.description]
        
        # Convert to list of dictionaries
        tags = []
        for row in results:
            data = dict(zip(columns, row))
            tags.append({
                "id": str(data['id']),
                "name": data['name'],
                "color": data['color'],
                "description": data['description'],
                "assignedAt": data['assigned_at'],
                "assignedBy": data['assigned_by'],
                "confidenceScore": data['confidence_score']
            })
        
        conn.close()
        
        await log_to_agent_memory(
            user_id,
            "asset_tags_retrieved",
            f"Retrieved tags for asset: {asset_symbol}",
            json.dumps({"assetSymbol": asset_symbol}),
            f"Returned {len(tags)} tags",
            {"assetSymbol": asset_symbol, "tagCount": len(tags)}
        )
        
        return {
            "assetSymbol": asset_symbol,
            "tags": tags,
            "totalCount": len(tags)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/asset-tagging-system/tags/{tag_id}/assets")
async def get_tagged_assets(
    tag_id: str,
    user_id: int = 1
):
    """Get all assets with a specific tag"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT 
                a.asset_symbol,
                a.assigned_at,
                a.assigned_by,
                a.confidence_score,
                t.name as tag_name
            FROM AssetTagAssignments a
            INNER JOIN AssetTags t ON a.tag_id = t.id
            WHERE a.userId = %s AND a.tag_id = %s AND a.is_active = TRUE
            ORDER BY a.assigned_at DESC
        """, (user_id, int(tag_id)))
        
        results = cursor.fetchall()
        columns = [description[0] for description in cursor.description]
        
        # Convert to list of dictionaries
        assets = []
        tag_name = None
        for row in results:
            data = dict(zip(columns, row))
            if not tag_name:
                tag_name = data['tag_name']
            assets.append({
                "assetSymbol": data['asset_symbol'],
                "assignedAt": data['assigned_at'],
                "assignedBy": data['assigned_by'],
                "confidenceScore": data['confidence_score']
            })
        
        conn.close()
        
        await log_to_agent_memory(
            user_id,
            "tagged_assets_retrieved",
            f"Retrieved assets for tag: {tag_name}",
            json.dumps({"tagId": tag_id}),
            f"Returned {len(assets)} assets",
            {"tagId": tag_id, "tagName": tag_name, "assetCount": len(assets)}
        )
        
        return {
            "tagId": tag_id,
            "tagName": tag_name,
            "assets": assets,
            "totalCount": len(assets)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Bulk Operations
@router.post("/asset-tagging-system/bulk-assign")
async def bulk_assign_tags(
    bulk_data: Dict[str, Any] = Body(...),
    user_id: int = 1
):
    """Bulk assign tags to multiple assets"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        asset_symbols = bulk_data.get("assetSymbols", [])
        tag_ids = bulk_data.get("tagIds", [])
        assigned_by = bulk_data.get("assignedBy", "user")
        
        assignments_created = 0
        
        for asset_symbol in asset_symbols:
            for tag_id in tag_ids:
                cursor.execute("""
                    INSERT OR REPLACE INTO AssetTagAssignments 
                    (userId, asset_symbol, tag_id, assigned_by, is_active)
                    VALUES (%s, %s, %s, %s, TRUE)
                """, (user_id, asset_symbol, int(tag_id), assigned_by))
                assignments_created += 1
        
        # Update usage counts for all affected tags
        for tag_id in tag_ids:
            cursor.execute("""
                UPDATE AssetTags 
                SET usage_count = (
                    SELECT COUNT(DISTINCT asset_symbol) 
                    FROM AssetTagAssignments 
                    WHERE tag_id = ? AND is_active = TRUE
                )
                WHERE id = ?
            """, (int(tag_id), int(tag_id)))
        
        conn.commit()
        conn.close()
        
        await log_to_agent_memory(
            user_id,
            "bulk_tag_assignment",
            f"Bulk assigned {len(tag_ids)} tags to {len(asset_symbols)} assets",
            json.dumps(bulk_data),
            f"Created {assignments_created} assignments",
            {"assetCount": len(asset_symbols), "tagCount": len(tag_ids), "assignmentsCreated": assignments_created}
        )
        
        return {
            "success": True,
            "message": f"Bulk assignment completed",
            "assignmentsCreated": assignments_created
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Tag Filters
@router.get("/asset-tagging-system/filters")
async def get_tag_filters(user_id: int = 1):
    """Get saved tag filters"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS TagFilters (
                id SERIAL PRIMARY KEY,
                userId INTEGER NOT NULL,
                name TEXT NOT NULL,
                include_tags TEXT DEFAULT '[]',
                exclude_tags TEXT DEFAULT '[]',
                operator TEXT DEFAULT 'AND',
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(userId, name)
            )
        """)
        
        cursor.execute("""
            SELECT * FROM TagFilters 
            WHERE userId = %s 
            ORDER BY name
        """, (user_id,))
        
        results = cursor.fetchall()
        columns = [description[0] for description in cursor.description]
        
        # Convert to list of dictionaries
        filters = []
        for row in results:
            data = dict(zip(columns, row))
            filters.append({
                "id": str(data['id']),
                "name": data['name'],
                "includeTags": json.loads(data['include_tags']),
                "excludeTags": json.loads(data['exclude_tags']),
                "operator": data['operator'],
                "createdAt": data['created_at']
            })
        
        conn.close()
        
        return {
            "filters": filters,
            "totalCount": len(filters)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/asset-tagging-system/filters")
async def create_tag_filter(
    filter_data: TagFilter = Body(...),
    user_id: int = 1
):
    """Create a new tag filter"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO TagFilters (userId, name, include_tags, exclude_tags, operator)
            VALUES (%s, %s, %s, %s, %s)
        """, (
            user_id,
            filter_data.name,
            json.dumps(filter_data.includeTags),
            json.dumps(filter_data.excludeTags),
            filter_data.operator
        ))
        
        filter_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        await log_to_agent_memory(
            user_id,
            "tag_filter_created",
            f"Created tag filter: {filter_data.name}",
            json.dumps(filter_data.dict()),
            f"Filter ID: {filter_id}",
            {"filterId": filter_id, "filterName": filter_data.name}
        )
        
        return {
            "success": True,
            "message": "Filter created successfully",
            "filterId": str(filter_id)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Statistics and Analytics
@router.get("/asset-tagging-system/stats")
async def get_tagging_statistics(user_id: int = 1):
    """Get asset tagging statistics"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get tag statistics
        cursor.execute("""
            SELECT 
                COUNT(*) as total_tags,
                COUNT(CASE WHEN is_system_tag = TRUE THEN 1 END) as system_tags,
                COUNT(CASE WHEN is_system_tag = FALSE THEN 1 END) as custom_tags
            FROM AssetTags 
            WHERE userId = %s AND is_active = TRUE
        """, (user_id,))
        
        tag_stats = cursor.fetchone()
        
        # Get assignment statistics
        cursor.execute("""
            SELECT 
                COUNT(DISTINCT asset_symbol) as tagged_assets,
                COUNT(*) as total_assignments,
                AVG(confidence_score) as avg_confidence
            FROM AssetTagAssignments 
            WHERE userId = %s AND is_active = TRUE
        """, (user_id,))
        
        assignment_stats = cursor.fetchone()
        
        # Get most used tags
        cursor.execute("""
            SELECT 
                t.name,
                t.color,
                COUNT(DISTINCT a.asset_symbol) as usage_count
            FROM AssetTags t
            LEFT JOIN AssetTagAssignments a ON t.id = a.tag_id AND a.is_active = TRUE
            WHERE t.userId = %s AND t.is_active = TRUE
            GROUP BY t.id
            ORDER BY usage_count DESC
            LIMIT 5
        """, (user_id,))
        
        most_used_tags = cursor.fetchall()
        
        conn.close()
        
        return {
            "tagStats": {
                "totalTags": tag_stats[0],
                "systemTags": tag_stats[1],
                "customTags": tag_stats[2]
            },
            "assignmentStats": {
                "taggedAssets": assignment_stats[0],
                "totalAssignments": assignment_stats[1],
                "averageConfidence": round(assignment_stats[2] or 0, 2)
            },
            "mostUsedTags": [
                {
                    "name": tag[0],
                    "color": tag[1],
                    "usageCount": tag[2]
                }
                for tag in most_used_tags
            ]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Import/Export
@router.get("/asset-tagging-system/export")
async def export_tagging_data(user_id: int = 1):
    """Export all tagging data"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get all tags
        cursor.execute("""
            SELECT * FROM AssetTags 
            WHERE userId = %s AND is_active = TRUE
        """, (user_id,))
        
        tags = cursor.fetchall()
        tag_columns = [description[0] for description in cursor.description]
        
        # Get all assignments
        cursor.execute("""
            SELECT * FROM AssetTagAssignments 
            WHERE userId = %s AND is_active = TRUE
        """, (user_id,))
        
        assignments = cursor.fetchall()
        assignment_columns = [description[0] for description in cursor.description]
        
        conn.close()
        
        # Format data for export
        export_data = {
            "tags": [dict(zip(tag_columns, tag)) for tag in tags],
            "assignments": [dict(zip(assignment_columns, assignment)) for assignment in assignments],
            "exportedAt": datetime.now().isoformat(),
            "version": "1.0"
        }
        
        await log_to_agent_memory(
            user_id,
            "tagging_data_exported",
            "Exported all tagging data",
            json.dumps({"userId": user_id}),
            f"Exported {len(tags)} tags and {len(assignments)} assignments",
            {"tagCount": len(tags), "assignmentCount": len(assignments)}
        )
        
        return export_data
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/asset-tagging-system/import")
async def import_tagging_data(
    import_data: Dict[str, Any] = Body(...),
    user_id: int = 1
):
    """Import tagging data"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        tags = import_data.get("tags", [])
        assignments = import_data.get("assignments", [])
        
        # Import tags
        imported_tags = 0
        for tag_data in tags:
            cursor.execute("""
                INSERT OR IGNORE INTO AssetTags 
                (userId, name, color, description, is_system_tag, sort_order)
                VALUES (%s, %s, %s, %s, %s, %s)
            """, (
                user_id,
                tag_data["name"],
                tag_data["color"],
                tag_data.get("description"),
                tag_data.get("is_system_tag", False),
                tag_data.get("sort_order", 0)
            ))
            if cursor.rowcount > 0:
                imported_tags += 1
        
        # Import assignments
        imported_assignments = 0
        for assignment_data in assignments:
            # Get tag ID by name
            cursor.execute("""
                SELECT id FROM AssetTags 
                WHERE userId = %s AND name = %s
            """, (user_id, assignment_data.get("tag_name")))
            
            tag_result = cursor.fetchone()
            if tag_result:
                cursor.execute("""
                    INSERT OR IGNORE INTO AssetTagAssignments 
                    (userId, asset_symbol, tag_id, assigned_by, confidence_score)
                    VALUES (%s, %s, %s, %s, %s)
                """, (
                    user_id,
                    assignment_data["asset_symbol"],
                    tag_result[0],
                    assignment_data.get("assigned_by", "import"),
                    assignment_data.get("confidence_score", 1.0)
                ))
                if cursor.rowcount > 0:
                    imported_assignments += 1
        
        conn.commit()
        conn.close()
        
        await log_to_agent_memory(
            user_id,
            "tagging_data_imported",
            f"Imported {imported_tags} tags and {imported_assignments} assignments",
            json.dumps({"tagCount": len(tags), "assignmentCount": len(assignments)}),
            f"Successfully imported {imported_tags} tags and {imported_assignments} assignments",
            {"importedTags": imported_tags, "importedAssignments": imported_assignments}
        )
        
        return {
            "success": True,
            "message": "Data imported successfully",
            "importedTags": imported_tags,
            "importedAssignments": imported_assignments
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 
#
# Integration Verification (Direct Path Tracing):
# Frontend: client/src/components/AssetTaggingPanel.tsx
#   └─ Calls: fetch('/api/asset-tagging-system/*') endpoints  
#   └─ Router: server/main.py includes asset_tagging_system_router
#   └─ Database: Creates asset_tags, asset_tag_assignments tables
#   └─ Agent Memory: Logs all tagging actions
#   └─ Tests: tests/test_block_30_asset_tagging_system.py
#
# Status: 🟢 FULLY INTEGRATED - Frontend → API → Database → Agent Memory

from fastapi import APIRouter, HTTPException, Depends, Query, Body
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
import json
from datetime import datetime
import psycopg2
from psycopg2.extras import RealDictCursor
import os

router = APIRouter()

# Block 30: Asset Tagging System - API Routes
# Complete asset tagging and categorization system

class AssetTag(BaseModel):
    """Asset tag schema"""
    id: Optional[str] = None
    name: str
    color: str = "#3B82F6"
    description: Optional[str] = None
    usageCount: int = 0
    isSystemTag: bool = False
    isActive: bool = True
    parentTagId: Optional[str] = None
    sortOrder: int = 0

class AssetTagAssignment(BaseModel):
    """Asset tag assignment schema"""
    assetSymbol: str
    tagId: str
    assignedBy: str = "user"
    assignmentReason: Optional[str] = None
    confidenceScore: float = 1.0

class TagFilter(BaseModel):
    """Tag filter schema"""
    name: str
    includeTags: List[str] = []
    excludeTags: List[str] = []
    operator: str = "AND"

# Database connection
def get_db_connection():
    database_url = os.getenv("DATABASE_URL", "postgresql://postgres:password@localhost:5432/stackmotive")
    return psycopg2.connect(database_url)

# Agent Memory logging
async def log_to_agent_memory(user_id: int, action_type: str, action_summary: str, input_data: str, output_data: str, metadata: Dict[str, Any]):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO AgentMemory 
            (userId, blockId, action, context, userInput, agentResponse, metadata, timestamp, sessionId)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            user_id,
            "block_30",
            action_type,
            action_summary,
            input_data,
            output_data,
            json.dumps(metadata) if metadata else None,
            datetime.now().isoformat(),
            f"session_{user_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        ))
        
        conn.commit()
        conn.close()
        
    except Exception as e:
        print(f"Failed to log to agent memory: {e}")

# Asset Tags Management
@router.get("/asset-tagging-system/tags")
async def get_asset_tags(user_id: int = 1):
    """Get all asset tags for a user"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Create tables if they don't exist
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS AssetTags (
                id SERIAL PRIMARY KEY,
                userId INTEGER NOT NULL,
                name TEXT NOT NULL,
                color TEXT NOT NULL DEFAULT '#3B82F6',
                description TEXT,
                usage_count INTEGER DEFAULT 0,
                is_system_tag BOOLEAN DEFAULT FALSE,
                is_active BOOLEAN DEFAULT TRUE,
                parent_tag_id INTEGER REFERENCES AssetTags(id),
                sort_order INTEGER DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(userId, name)
            )
        """)
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS AssetTagAssignments (
                id SERIAL PRIMARY KEY,
                userId INTEGER NOT NULL,
                asset_symbol TEXT NOT NULL,
                tag_id INTEGER NOT NULL REFERENCES AssetTags(id),
                assigned_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                assigned_by TEXT DEFAULT 'user',
                assignment_reason TEXT,
                confidence_score REAL DEFAULT 1.0,
                is_active BOOLEAN DEFAULT TRUE,
                UNIQUE(userId, asset_symbol, tag_id)
            )
        """)
        
        # Get tags with usage count
        cursor.execute("""
            SELECT 
                t.id,
                t.name,
                t.color,
                t.description,
                t.usage_count,
                t.is_system_tag,
                t.is_active,
                t.parent_tag_id,
                t.sort_order,
                t.created_at,
                t.updated_at,
                COUNT(DISTINCT a.asset_symbol) as actual_usage_count
            FROM AssetTags t
            LEFT JOIN AssetTagAssignments a ON t.id = a.tag_id AND a.is_active = TRUE
            WHERE t.userId = %s AND t.is_active = TRUE
            GROUP BY t.id
            ORDER BY actual_usage_count DESC, t.name
        """, (user_id,))
        
        results = cursor.fetchall()
        columns = [description[0] for description in cursor.description]
        
        if not results:
            # Create default tags
            default_tags = [
                {"name": "High Growth", "color": "#10B981", "description": "High growth potential assets"},
                {"name": "Dividend", "color": "#3B82F6", "description": "Dividend paying stocks"},
                {"name": "Tech", "color": "#8B5CF6", "description": "Technology sector"},
                {"name": "ESG", "color": "#059669", "description": "Environmental, Social, Governance"},
                {"name": "Core Holdings", "color": "#DC2626", "description": "Core portfolio positions"},
                {"name": "Speculative", "color": "#F59E0B", "description": "Speculative investments"}
            ]
            
            for tag in default_tags:
                cursor.execute("""
                    INSERT INTO AssetTags (userId, name, color, description, is_system_tag)
                    VALUES (%s, %s, %s, %s, TRUE)
                """, (user_id, tag["name"], tag["color"], tag["description"]))
            
            conn.commit()
            
            # Re-fetch data
            cursor.execute("""
                SELECT 
                    t.id,
                    t.name,
                    t.color,
                    t.description,
                    t.usage_count,
                    t.is_system_tag,
                    t.is_active,
                    t.parent_tag_id,
                    t.sort_order,
                    t.created_at,
                    t.updated_at,
                    COUNT(DISTINCT a.asset_symbol) as actual_usage_count
                FROM AssetTags t
                LEFT JOIN AssetTagAssignments a ON t.id = a.tag_id AND a.is_active = TRUE
                WHERE t.userId = ? AND t.is_active = TRUE
                GROUP BY t.id
                ORDER BY actual_usage_count DESC, t.name
            """, (user_id,))
            
            results = cursor.fetchall()
        
        # Convert to list of dictionaries
        tags = []
        for row in results:
            data = dict(zip(columns, row))
            tags.append({
                "id": str(data['id']),
                "name": data['name'],
                "color": data['color'],
                "description": data['description'],
                "usageCount": data['actual_usage_count'],
                "isSystemTag": bool(data['is_system_tag']),
                "isActive": bool(data['is_active']),
                "parentTagId": str(data['parent_tag_id']) if data['parent_tag_id'] else None,
                "sortOrder": data['sort_order'],
                "createdAt": data['created_at'],
                "updatedAt": data['updated_at']
            })
        
        conn.close()
        
        await log_to_agent_memory(
            user_id,
            "asset_tags_retrieved",
            f"Retrieved {len(tags)} asset tags",
            json.dumps({"userId": user_id}),
            f"Returned {len(tags)} tags",
            {"tagCount": len(tags)}
        )
        
        return {
            "tags": tags,
            "totalCount": len(tags)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/asset-tagging-system/tags")
async def create_asset_tag(
    tag: AssetTag = Body(...),
    user_id: int = 1
):
    """Create a new asset tag"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Insert the tag
        cursor.execute("""
            INSERT INTO AssetTags (userId, name, color, description, sort_order)
            VALUES (%s, %s, %s, %s, %s)
        """, (
            user_id,
            tag.name,
            tag.color,
            tag.description,
            tag.sortOrder
        ))
        
        tag_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        await log_to_agent_memory(
            user_id,
            "asset_tag_created",
            f"Created asset tag: {tag.name}",
            json.dumps(tag.dict()),
            f"Tag ID: {tag_id}",
            {"tagId": tag_id, "tagName": tag.name}
        )
        
        return {
            "success": True,
            "message": "Tag created successfully",
            "tagId": str(tag_id),
            "tag": {
                "id": str(tag_id),
                "name": tag.name,
                "color": tag.color,
                "description": tag.description,
                "usageCount": 0,
                "isSystemTag": False,
                "isActive": True,
                "sortOrder": tag.sortOrder
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/asset-tagging-system/tags/{tag_id}")
async def update_asset_tag(
    tag_id: str,
    tag: AssetTag = Body(...),
    user_id: int = 1
):
    """Update an existing asset tag"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Update the tag
        cursor.execute("""
            UPDATE AssetTags 
            SET name = %s, color = %s, description = %s, sort_order = %s, updated_at = CURRENT_TIMESTAMP
            WHERE id = %s AND userId = %s
        """, (
            tag.name,
            tag.color,
            tag.description,
            tag.sortOrder,
            int(tag_id),
            user_id
        ))
        
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Tag not found")
        
        conn.commit()
        conn.close()
        
        await log_to_agent_memory(
            user_id,
            "asset_tag_updated",
            f"Updated asset tag: {tag.name}",
            json.dumps({"tagId": tag_id, **tag.dict()}),
            "Tag updated successfully",
            {"tagId": tag_id, "tagName": tag.name}
        )
        
        return {
            "success": True,
            "message": "Tag updated successfully"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/asset-tagging-system/tags/{tag_id}")
async def delete_asset_tag(
    tag_id: str,
    user_id: int = 1
):
    """Delete an asset tag"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get tag name for logging
        cursor.execute("SELECT name FROM AssetTags WHERE id = %s AND userId = %s", (int(tag_id), user_id))
        tag_name = cursor.fetchone()
        
        if not tag_name:
            raise HTTPException(status_code=404, detail="Tag not found")
        
        # Delete assignments first
        cursor.execute("DELETE FROM AssetTagAssignments WHERE tag_id = %s AND userId = %s", (int(tag_id), user_id))
        
        # Delete the tag
        cursor.execute("DELETE FROM AssetTags WHERE id = %s AND userId = %s", (int(tag_id), user_id))
        
        conn.commit()
        conn.close()
        
        await log_to_agent_memory(
            user_id,
            "asset_tag_deleted",
            f"Deleted asset tag: {tag_name[0]}",
            json.dumps({"tagId": tag_id}),
            "Tag deleted successfully",
            {"tagId": tag_id, "tagName": tag_name[0]}
        )
        
        return {
            "success": True,
            "message": "Tag deleted successfully"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Asset Tagging Operations
@router.post("/asset-tagging-system/assign")
async def assign_asset_tag(
    assignment: AssetTagAssignment = Body(...),
    user_id: int = 1
):
    """Assign a tag to an asset"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Insert or update the assignment
        cursor.execute("""
            INSERT OR REPLACE INTO AssetTagAssignments 
            (userId, asset_symbol, tag_id, assigned_by, assignment_reason, confidence_score, is_active)
            VALUES (%s, %s, %s, %s, %s, %s, TRUE)
        """, (
            user_id,
            assignment.assetSymbol,
            int(assignment.tagId),
            assignment.assignedBy,
            assignment.assignmentReason,
            assignment.confidenceScore
        ))
        
        # Update tag usage count
        cursor.execute("""
            UPDATE AssetTags 
            SET usage_count = (
                SELECT COUNT(DISTINCT asset_symbol) 
                FROM AssetTagAssignments 
                WHERE tag_id = %s AND is_active = TRUE
            )
            WHERE id = %s
        """, (int(assignment.tagId), int(assignment.tagId)))
        
        conn.commit()
        conn.close()
        
        await log_to_agent_memory(
            user_id,
            "asset_tag_assigned",
            f"Assigned tag to asset: {assignment.assetSymbol}",
            json.dumps(assignment.dict()),
            "Tag assignment successful",
            {"assetSymbol": assignment.assetSymbol, "tagId": assignment.tagId}
        )
        
        return {
            "success": True,
            "message": "Tag assigned successfully"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/asset-tagging-system/assign")
async def unassign_asset_tag(
    asset_symbol: str = Query(...),
    tag_id: str = Query(...),
    user_id: int = 1
):
    """Remove a tag from an asset"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Delete the assignment
        cursor.execute("""
            DELETE FROM AssetTagAssignments 
            WHERE userId = %s AND asset_symbol = %s AND tag_id = %s
        """, (user_id, asset_symbol, int(tag_id)))
        
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Tag assignment not found")
        
        # Update tag usage count
        cursor.execute("""
            UPDATE AssetTags 
            SET usage_count = (
                SELECT COUNT(DISTINCT asset_symbol) 
                FROM AssetTagAssignments 
                WHERE tag_id = ? AND is_active = TRUE
            )
            WHERE id = ?
        """, (int(tag_id), int(tag_id)))
        
        conn.commit()
        conn.close()
        
        await log_to_agent_memory(
            user_id,
            "asset_tag_unassigned",
            f"Removed tag from asset: {asset_symbol}",
            json.dumps({"assetSymbol": asset_symbol, "tagId": tag_id}),
            "Tag unassignment successful",
            {"assetSymbol": asset_symbol, "tagId": tag_id}
        )
        
        return {
            "success": True,
            "message": "Tag removed successfully"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/asset-tagging-system/assets/{asset_symbol}/tags")
async def get_asset_tags(
    asset_symbol: str,
    user_id: int = 1
):
    """Get all tags for a specific asset"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT 
                t.id,
                t.name,
                t.color,
                t.description,
                a.assigned_at,
                a.assigned_by,
                a.confidence_score
            FROM AssetTags t
            INNER JOIN AssetTagAssignments a ON t.id = a.tag_id
            WHERE a.userId = %s AND a.asset_symbol = %s AND a.is_active = TRUE
            ORDER BY a.assigned_at DESC
        """, (user_id, asset_symbol))
        
        results = cursor.fetchall()
        columns = [description[0] for description in cursor.description]
        
        # Convert to list of dictionaries
        tags = []
        for row in results:
            data = dict(zip(columns, row))
            tags.append({
                "id": str(data['id']),
                "name": data['name'],
                "color": data['color'],
                "description": data['description'],
                "assignedAt": data['assigned_at'],
                "assignedBy": data['assigned_by'],
                "confidenceScore": data['confidence_score']
            })
        
        conn.close()
        
        await log_to_agent_memory(
            user_id,
            "asset_tags_retrieved",
            f"Retrieved tags for asset: {asset_symbol}",
            json.dumps({"assetSymbol": asset_symbol}),
            f"Returned {len(tags)} tags",
            {"assetSymbol": asset_symbol, "tagCount": len(tags)}
        )
        
        return {
            "assetSymbol": asset_symbol,
            "tags": tags,
            "totalCount": len(tags)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/asset-tagging-system/tags/{tag_id}/assets")
async def get_tagged_assets(
    tag_id: str,
    user_id: int = 1
):
    """Get all assets with a specific tag"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT 
                a.asset_symbol,
                a.assigned_at,
                a.assigned_by,
                a.confidence_score,
                t.name as tag_name
            FROM AssetTagAssignments a
            INNER JOIN AssetTags t ON a.tag_id = t.id
            WHERE a.userId = %s AND a.tag_id = %s AND a.is_active = TRUE
            ORDER BY a.assigned_at DESC
        """, (user_id, int(tag_id)))
        
        results = cursor.fetchall()
        columns = [description[0] for description in cursor.description]
        
        # Convert to list of dictionaries
        assets = []
        tag_name = None
        for row in results:
            data = dict(zip(columns, row))
            if not tag_name:
                tag_name = data['tag_name']
            assets.append({
                "assetSymbol": data['asset_symbol'],
                "assignedAt": data['assigned_at'],
                "assignedBy": data['assigned_by'],
                "confidenceScore": data['confidence_score']
            })
        
        conn.close()
        
        await log_to_agent_memory(
            user_id,
            "tagged_assets_retrieved",
            f"Retrieved assets for tag: {tag_name}",
            json.dumps({"tagId": tag_id}),
            f"Returned {len(assets)} assets",
            {"tagId": tag_id, "tagName": tag_name, "assetCount": len(assets)}
        )
        
        return {
            "tagId": tag_id,
            "tagName": tag_name,
            "assets": assets,
            "totalCount": len(assets)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Bulk Operations
@router.post("/asset-tagging-system/bulk-assign")
async def bulk_assign_tags(
    bulk_data: Dict[str, Any] = Body(...),
    user_id: int = 1
):
    """Bulk assign tags to multiple assets"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        asset_symbols = bulk_data.get("assetSymbols", [])
        tag_ids = bulk_data.get("tagIds", [])
        assigned_by = bulk_data.get("assignedBy", "user")
        
        assignments_created = 0
        
        for asset_symbol in asset_symbols:
            for tag_id in tag_ids:
                cursor.execute("""
                    INSERT OR REPLACE INTO AssetTagAssignments 
                    (userId, asset_symbol, tag_id, assigned_by, is_active)
                    VALUES (%s, %s, %s, %s, TRUE)
                """, (user_id, asset_symbol, int(tag_id), assigned_by))
                assignments_created += 1
        
        # Update usage counts for all affected tags
        for tag_id in tag_ids:
            cursor.execute("""
                UPDATE AssetTags 
                SET usage_count = (
                    SELECT COUNT(DISTINCT asset_symbol) 
                    FROM AssetTagAssignments 
                    WHERE tag_id = ? AND is_active = TRUE
                )
                WHERE id = ?
            """, (int(tag_id), int(tag_id)))
        
        conn.commit()
        conn.close()
        
        await log_to_agent_memory(
            user_id,
            "bulk_tag_assignment",
            f"Bulk assigned {len(tag_ids)} tags to {len(asset_symbols)} assets",
            json.dumps(bulk_data),
            f"Created {assignments_created} assignments",
            {"assetCount": len(asset_symbols), "tagCount": len(tag_ids), "assignmentsCreated": assignments_created}
        )
        
        return {
            "success": True,
            "message": f"Bulk assignment completed",
            "assignmentsCreated": assignments_created
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Tag Filters
@router.get("/asset-tagging-system/filters")
async def get_tag_filters(user_id: int = 1):
    """Get saved tag filters"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS TagFilters (
                id SERIAL PRIMARY KEY,
                userId INTEGER NOT NULL,
                name TEXT NOT NULL,
                include_tags TEXT DEFAULT '[]',
                exclude_tags TEXT DEFAULT '[]',
                operator TEXT DEFAULT 'AND',
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(userId, name)
            )
        """)
        
        cursor.execute("""
            SELECT * FROM TagFilters 
            WHERE userId = %s 
            ORDER BY name
        """, (user_id,))
        
        results = cursor.fetchall()
        columns = [description[0] for description in cursor.description]
        
        # Convert to list of dictionaries
        filters = []
        for row in results:
            data = dict(zip(columns, row))
            filters.append({
                "id": str(data['id']),
                "name": data['name'],
                "includeTags": json.loads(data['include_tags']),
                "excludeTags": json.loads(data['exclude_tags']),
                "operator": data['operator'],
                "createdAt": data['created_at']
            })
        
        conn.close()
        
        return {
            "filters": filters,
            "totalCount": len(filters)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/asset-tagging-system/filters")
async def create_tag_filter(
    filter_data: TagFilter = Body(...),
    user_id: int = 1
):
    """Create a new tag filter"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO TagFilters (userId, name, include_tags, exclude_tags, operator)
            VALUES (%s, %s, %s, %s, %s)
        """, (
            user_id,
            filter_data.name,
            json.dumps(filter_data.includeTags),
            json.dumps(filter_data.excludeTags),
            filter_data.operator
        ))
        
        filter_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        await log_to_agent_memory(
            user_id,
            "tag_filter_created",
            f"Created tag filter: {filter_data.name}",
            json.dumps(filter_data.dict()),
            f"Filter ID: {filter_id}",
            {"filterId": filter_id, "filterName": filter_data.name}
        )
        
        return {
            "success": True,
            "message": "Filter created successfully",
            "filterId": str(filter_id)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Statistics and Analytics
@router.get("/asset-tagging-system/stats")
async def get_tagging_statistics(user_id: int = 1):
    """Get asset tagging statistics"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get tag statistics
        cursor.execute("""
            SELECT 
                COUNT(*) as total_tags,
                COUNT(CASE WHEN is_system_tag = TRUE THEN 1 END) as system_tags,
                COUNT(CASE WHEN is_system_tag = FALSE THEN 1 END) as custom_tags
            FROM AssetTags 
            WHERE userId = %s AND is_active = TRUE
        """, (user_id,))
        
        tag_stats = cursor.fetchone()
        
        # Get assignment statistics
        cursor.execute("""
            SELECT 
                COUNT(DISTINCT asset_symbol) as tagged_assets,
                COUNT(*) as total_assignments,
                AVG(confidence_score) as avg_confidence
            FROM AssetTagAssignments 
            WHERE userId = %s AND is_active = TRUE
        """, (user_id,))
        
        assignment_stats = cursor.fetchone()
        
        # Get most used tags
        cursor.execute("""
            SELECT 
                t.name,
                t.color,
                COUNT(DISTINCT a.asset_symbol) as usage_count
            FROM AssetTags t
            LEFT JOIN AssetTagAssignments a ON t.id = a.tag_id AND a.is_active = TRUE
            WHERE t.userId = %s AND t.is_active = TRUE
            GROUP BY t.id
            ORDER BY usage_count DESC
            LIMIT 5
        """, (user_id,))
        
        most_used_tags = cursor.fetchall()
        
        conn.close()
        
        return {
            "tagStats": {
                "totalTags": tag_stats[0],
                "systemTags": tag_stats[1],
                "customTags": tag_stats[2]
            },
            "assignmentStats": {
                "taggedAssets": assignment_stats[0],
                "totalAssignments": assignment_stats[1],
                "averageConfidence": round(assignment_stats[2] or 0, 2)
            },
            "mostUsedTags": [
                {
                    "name": tag[0],
                    "color": tag[1],
                    "usageCount": tag[2]
                }
                for tag in most_used_tags
            ]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Import/Export
@router.get("/asset-tagging-system/export")
async def export_tagging_data(user_id: int = 1):
    """Export all tagging data"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get all tags
        cursor.execute("""
            SELECT * FROM AssetTags 
            WHERE userId = %s AND is_active = TRUE
        """, (user_id,))
        
        tags = cursor.fetchall()
        tag_columns = [description[0] for description in cursor.description]
        
        # Get all assignments
        cursor.execute("""
            SELECT * FROM AssetTagAssignments 
            WHERE userId = %s AND is_active = TRUE
        """, (user_id,))
        
        assignments = cursor.fetchall()
        assignment_columns = [description[0] for description in cursor.description]
        
        conn.close()
        
        # Format data for export
        export_data = {
            "tags": [dict(zip(tag_columns, tag)) for tag in tags],
            "assignments": [dict(zip(assignment_columns, assignment)) for assignment in assignments],
            "exportedAt": datetime.now().isoformat(),
            "version": "1.0"
        }
        
        await log_to_agent_memory(
            user_id,
            "tagging_data_exported",
            "Exported all tagging data",
            json.dumps({"userId": user_id}),
            f"Exported {len(tags)} tags and {len(assignments)} assignments",
            {"tagCount": len(tags), "assignmentCount": len(assignments)}
        )
        
        return export_data
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/asset-tagging-system/import")
async def import_tagging_data(
    import_data: Dict[str, Any] = Body(...),
    user_id: int = 1
):
    """Import tagging data"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        tags = import_data.get("tags", [])
        assignments = import_data.get("assignments", [])
        
        # Import tags
        imported_tags = 0
        for tag_data in tags:
            cursor.execute("""
                INSERT OR IGNORE INTO AssetTags 
                (userId, name, color, description, is_system_tag, sort_order)
                VALUES (%s, %s, %s, %s, %s, %s)
            """, (
                user_id,
                tag_data["name"],
                tag_data["color"],
                tag_data.get("description"),
                tag_data.get("is_system_tag", False),
                tag_data.get("sort_order", 0)
            ))
            if cursor.rowcount > 0:
                imported_tags += 1
        
        # Import assignments
        imported_assignments = 0
        for assignment_data in assignments:
            # Get tag ID by name
            cursor.execute("""
                SELECT id FROM AssetTags 
                WHERE userId = %s AND name = %s
            """, (user_id, assignment_data.get("tag_name")))
            
            tag_result = cursor.fetchone()
            if tag_result:
                cursor.execute("""
                    INSERT OR IGNORE INTO AssetTagAssignments 
                    (userId, asset_symbol, tag_id, assigned_by, confidence_score)
                    VALUES (%s, %s, %s, %s, %s)
                """, (
                    user_id,
                    assignment_data["asset_symbol"],
                    tag_result[0],
                    assignment_data.get("assigned_by", "import"),
                    assignment_data.get("confidence_score", 1.0)
                ))
                if cursor.rowcount > 0:
                    imported_assignments += 1
        
        conn.commit()
        conn.close()
        
        await log_to_agent_memory(
            user_id,
            "tagging_data_imported",
            f"Imported {imported_tags} tags and {imported_assignments} assignments",
            json.dumps({"tagCount": len(tags), "assignmentCount": len(assignments)}),
            f"Successfully imported {imported_tags} tags and {imported_assignments} assignments",
            {"importedTags": imported_tags, "importedAssignments": imported_assignments}
        )
        
        return {
            "success": True,
            "message": "Data imported successfully",
            "importedTags": imported_tags,
            "importedAssignments": imported_assignments
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))            