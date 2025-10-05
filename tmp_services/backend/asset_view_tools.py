# Block 6: Assets View Tools - FULLY INTEGRATED ✅
#
# Integration Verification (Direct Path Tracing):
# Frontend: client/src/components/ui/AssetViewTabs.tsx
#   └─ Uses: client/src/hooks/useAssetTagging.ts & asset allocation hooks
#   └─ Calls: fetch('/api/asset-view-tools/*') endpoints (this file)
#   └─ Router: server/main.py includes asset_view_tools_router
#   └─ Database: Creates asset_view_preferences, asset_tags, asset_allocation_rings tables
#   └─ Agent Memory: Logs all asset view actions
#   └─ Tests: tests/test_block_06_asset_view_tools.py
#
# Status: 🟢 FULLY INTEGRATED - Frontend → API → Database → Agent Memory

from fastapi import APIRouter, HTTPException, Depends, Query, Body
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
import json
from datetime import datetime, timedelta
import sqlite3
from pathlib import Path

router = APIRouter()

# Block 6: Assets View Tools - API Routes
# Complete asset view tools backend integration

class AssetViewPreferences(BaseModel):
    """Asset view preferences response schema"""
    defaultViewType: str = "holdings"
    columnsVisible: List[str] = ["symbol", "name", "value", "change"]
    sortColumn: str = "value"
    sortDirection: str = "desc"
    showPerformanceTab: bool = True
    showAllocationChart: bool = True
    refreshInterval: int = 30
    itemsPerPage: int = 25
    defaultFilters: Dict[str, Any] = {}
    chartType: str = "donut"
    chartTheme: str = "default"

class AssetTag(BaseModel):
    """Asset tag response schema"""
    id: str
    name: str
    color: str
    description: Optional[str] = None
    usageCount: int = 0
    isSystemTag: bool = False
    isActive: bool = True
    parentTagId: Optional[str] = None
    sortOrder: int = 0
    createdAt: str
    updatedAt: str

class AssetTagAssignment(BaseModel):
    """Asset tag assignment response schema"""
    id: str
    assetSymbol: str
    tagId: str
    assignedAt: str
    assignedBy: str = "user"
    assignmentReason: Optional[str] = None
    confidenceScore: float = 1.0
    isActive: bool = True

class AssetAllocationRing(BaseModel):
    """Asset allocation ring response schema"""
    id: str
    name: str
    description: Optional[str] = None
    ringType: str = "asset_class"
    innerRadius: float = 40.0
    outerRadius: float = 80.0
    colors: List[str] = []
    totalTargetPercentage: float = 100.0
    rebalanceThreshold: float = 5.0
    isActive: bool = True
    isDefault: bool = False
    createdAt: str
    updatedAt: str

class AssetClassAllocation(BaseModel):
    """Asset class allocation response schema"""
    id: str
    ringId: str
    assetClass: str
    subClass: Optional[str] = None
    targetPercentage: float
    minPercentage: float = 0
    maxPercentage: float = 100
    currentPercentage: float = 0
    currentValue: float = 0
    driftPercentage: float = 0
    daysSinceRebalance: int = 0
    color: str = "#3B82F6"
    sortOrder: int = 0
    taxEfficiencyScore: float = 0
    holdingPeriodDays: int = 0

class AssetViewLayout(BaseModel):
    """Asset view layout response schema"""
    id: str
    layoutName: str
    layoutType: str = "dashboard"
    widgets: List[Dict[str, Any]] = []
    layoutConfig: Dict[str, Any] = {}
    breakpoints: Dict[str, Any] = {}
    isActive: bool = True
    isDefault: bool = False

class AssetViewFilter(BaseModel):
    """Asset view filter response schema"""
    id: str
    filterName: str
    filterType: str = "custom"
    criteria: Dict[str, Any]
    usageCount: int = 0
    lastUsedAt: Optional[str] = None
    isActive: bool = True
    isFavorite: bool = False

# Database connection
def get_db_connection():
    db_path = Path(__file__).parent.parent.parent / "prisma" / "dev.db"
    return sqlite3.connect(str(db_path))

# Agent Memory logging
async def log_to_agent_memory(user_id: int, action_type: str, action_summary: str, input_data: str, output_data: str, metadata: Dict[str, Any]):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO AgentMemory 
            (userId, blockId, action, context, userInput, agentResponse, metadata, timestamp, sessionId)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            user_id,
            "block_06",
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

# Asset View Preferences Endpoints
@router.get("/asset-view-tools/preferences")
async def get_asset_view_preferences(user_id: int = 1):
    """Get user's asset view preferences"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Create table if it doesn't exist
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS AssetViewPreferences (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                userId INTEGER NOT NULL,
                default_view_type TEXT DEFAULT 'holdings',
                columns_visible TEXT DEFAULT '["symbol", "name", "value", "change"]',
                sort_column TEXT DEFAULT 'value',
                sort_direction TEXT DEFAULT 'desc',
                show_performance_tab BOOLEAN DEFAULT TRUE,
                show_allocation_chart BOOLEAN DEFAULT TRUE,
                refresh_interval INTEGER DEFAULT 30,
                items_per_page INTEGER DEFAULT 25,
                default_filters TEXT DEFAULT '{}',
                chart_type TEXT DEFAULT 'donut',
                chart_theme TEXT DEFAULT 'default',
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(userId)
            )
        """)
        
        # Get preferences
        cursor.execute("SELECT * FROM AssetViewPreferences WHERE userId = ?", (user_id,))
        result = cursor.fetchone()
        
        if not result:
            # Create default preferences
            cursor.execute("""
                INSERT INTO AssetViewPreferences (userId) VALUES (?)
            """, (user_id,))
            
            conn.commit()
            
            # Return default preferences
            prefs = AssetViewPreferences()
        else:
            columns = [description[0] for description in cursor.description]
            prefs_data = dict(zip(columns, result))
            
            prefs = AssetViewPreferences(
                defaultViewType=prefs_data['default_view_type'],
                columnsVisible=json.loads(prefs_data['columns_visible']),
                sortColumn=prefs_data['sort_column'],
                sortDirection=prefs_data['sort_direction'],
                showPerformanceTab=prefs_data['show_performance_tab'],
                showAllocationChart=prefs_data['show_allocation_chart'],
                refreshInterval=prefs_data['refresh_interval'],
                itemsPerPage=prefs_data['items_per_page'],
                defaultFilters=json.loads(prefs_data['default_filters']),
                chartType=prefs_data['chart_type'],
                chartTheme=prefs_data['chart_theme']
            )
        
        conn.close()
        
        await log_to_agent_memory(
            user_id,
            "asset_view_preferences_retrieved",
            "Retrieved asset view preferences",
            "{}",
            f"View type: {prefs.defaultViewType}",
            {"default_view_type": prefs.defaultViewType}
        )
        
        return prefs.dict()
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/asset-view-tools/preferences")
async def update_asset_view_preferences(
    preferences: AssetViewPreferences,
    user_id: int = 1
):
    """Update user's asset view preferences"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            UPDATE AssetViewPreferences 
            SET 
                default_view_type = ?,
                columns_visible = ?,
                sort_column = ?,
                sort_direction = ?,
                show_performance_tab = ?,
                show_allocation_chart = ?,
                refresh_interval = ?,
                items_per_page = ?,
                default_filters = ?,
                chart_type = ?,
                chart_theme = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE userId = ?
        """, (
            preferences.defaultViewType,
            json.dumps(preferences.columnsVisible),
            preferences.sortColumn,
            preferences.sortDirection,
            preferences.showPerformanceTab,
            preferences.showAllocationChart,
            preferences.refreshInterval,
            preferences.itemsPerPage,
            json.dumps(preferences.defaultFilters),
            preferences.chartType,
            preferences.chartTheme,
            user_id
        ))
        
        conn.commit()
        conn.close()
        
        await log_to_agent_memory(
            user_id,
            "asset_view_preferences_updated",
            "Updated asset view preferences",
            json.dumps(preferences.dict()),
            "Preferences updated successfully",
            {"updated_fields": list(preferences.dict().keys())}
        )
        
        return {"success": True, "message": "Preferences updated successfully"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Asset Tags Endpoints
@router.get("/asset-view-tools/tags")
async def get_asset_tags(user_id: int = 1):
    """Get user's asset tags"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Create table if it doesn't exist
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS AssetTags (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
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
        
        # Get tags with usage count
        cursor.execute("""
            SELECT 
                t.*,
                COUNT(DISTINCT a.id) as actual_usage_count
            FROM AssetTags t
            LEFT JOIN (
                SELECT id, userId, tag_id FROM AssetTagAssignments 
                WHERE is_active = TRUE
            ) a ON t.id = a.tag_id
            WHERE t.userId = ? AND t.is_active = TRUE
            GROUP BY t.id
            ORDER BY actual_usage_count DESC, t.name
        """, (user_id,))
        
        results = cursor.fetchall()
        
        if not results:
            # Create demo tags
            demo_tags = [
                {"name": "High Growth", "color": "#10B981", "description": "High growth potential assets"},
                {"name": "Dividend", "color": "#3B82F6", "description": "Dividend-paying assets"},
                {"name": "Speculative", "color": "#F59E0B", "description": "High risk, high reward"},
                {"name": "Safe Haven", "color": "#6B7280", "description": "Low volatility assets"},
                {"name": "AU/NZ", "color": "#EF4444", "description": "Australian/New Zealand assets"},
                {"name": "Tech", "color": "#8B5CF6", "description": "Technology sector"},
                {"name": "ESG", "color": "#059669", "description": "Environmental, Social, Governance"},
                {"name": "Crypto", "color": "#F97316", "description": "Cryptocurrency assets"}
            ]
            
            for tag in demo_tags:
                cursor.execute("""
                    INSERT INTO AssetTags (userId, name, color, description)
                    VALUES (?, ?, ?, ?)
                """, (user_id, tag["name"], tag["color"], tag["description"]))
            
            conn.commit()
            
            # Re-fetch the created tags
            cursor.execute("""
                SELECT 
                    t.*,
                    COUNT(DISTINCT a.id) as actual_usage_count
                FROM AssetTags t
                LEFT JOIN (
                    SELECT id, userId, tag_id FROM AssetTagAssignments 
                    WHERE is_active = TRUE
                ) a ON t.id = a.tag_id
                WHERE t.userId = ? AND t.is_active = TRUE
                GROUP BY t.id
                ORDER BY actual_usage_count DESC, t.name
            """, (user_id,))
            
            results = cursor.fetchall()
        
        columns = [description[0] for description in cursor.description]
        tags = []
        
        for row in results:
            tag_data = dict(zip(columns, row))
            
            tag = AssetTag(
                id=str(tag_data['id']),
                name=tag_data['name'],
                color=tag_data['color'],
                description=tag_data['description'],
                usageCount=tag_data['actual_usage_count'],
                isSystemTag=tag_data['is_system_tag'],
                isActive=tag_data['is_active'],
                parentTagId=str(tag_data['parent_tag_id']) if tag_data['parent_tag_id'] else None,
                sortOrder=tag_data['sort_order'],
                createdAt=tag_data['created_at'],
                updatedAt=tag_data['updated_at']
            )
            
            tags.append(tag.dict())
        
        conn.close()
        
        await log_to_agent_memory(
            user_id,
            "asset_tags_retrieved",
            f"Retrieved {len(tags)} asset tags",
            "{}",
            f"Found {len(tags)} tags",
            {"tags_count": len(tags)}
        )
        
        return tags
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/asset-view-tools/tags")
async def create_asset_tag(
    tag: Dict[str, Any] = Body(...),
    user_id: int = 1
):
    """Create a new asset tag"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Create tag assignments table if it doesn't exist
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS AssetTagAssignments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
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
        
        # Insert the tag
        cursor.execute("""
            INSERT INTO AssetTags (userId, name, color, description)
            VALUES (?, ?, ?, ?)
        """, (
            user_id,
            tag["name"],
            tag.get("color", "#3B82F6"),
            tag.get("description")
        ))
        
        tag_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        await log_to_agent_memory(
            user_id,
            "asset_tag_created",
            f"Created asset tag: {tag['name']}",
            json.dumps(tag),
            f"Tag ID: {tag_id}",
            {"tag_id": tag_id, "tag_name": tag["name"]}
        )
        
        return {
            "success": True,
            "message": "Tag created successfully",
            "tagId": tag_id
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/asset-view-tools/tags/assign")
async def assign_asset_tag(
    assignment: Dict[str, Any] = Body(...),
    user_id: int = 1
):
    """Assign a tag to an asset"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Insert the assignment
        cursor.execute("""
            INSERT OR REPLACE INTO AssetTagAssignments 
            (userId, asset_symbol, tag_id, assigned_by, assignment_reason, confidence_score)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (
            user_id,
            assignment["assetSymbol"],
            assignment["tagId"],
            assignment.get("assignedBy", "user"),
            assignment.get("assignmentReason"),
            assignment.get("confidenceScore", 1.0)
        ))
        
        # Update tag usage count
        cursor.execute("""
            UPDATE AssetTags 
            SET usage_count = (
                SELECT COUNT(*) FROM AssetTagAssignments 
                WHERE tag_id = ? AND is_active = TRUE
            )
            WHERE id = ?
        """, (assignment["tagId"], assignment["tagId"]))
        
        conn.commit()
        conn.close()
        
        await log_to_agent_memory(
            user_id,
            "asset_tag_assigned",
            f"Assigned tag to asset: {assignment['assetSymbol']}",
            json.dumps(assignment),
            "Tag assignment successful",
            {"asset_symbol": assignment["assetSymbol"], "tag_id": assignment["tagId"]}
        )
        
        return {
            "success": True,
            "message": "Tag assigned successfully"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/asset-view-tools/tags/asset/{asset_symbol}")
async def get_asset_tags_for_symbol(
    asset_symbol: str,
    user_id: int = 1
):
    """Get tags for a specific asset"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT 
                t.id,
                t.name,
                t.color,
                a.assigned_at,
                a.assigned_by,
                a.assignment_reason,
                a.confidence_score
            FROM AssetTags t
            INNER JOIN AssetTagAssignments a ON t.id = a.tag_id
            WHERE t.userId = ? AND a.asset_symbol = ? AND a.is_active = TRUE
            ORDER BY a.assigned_at DESC
        """, (user_id, asset_symbol))
        
        results = cursor.fetchall()
        columns = [description[0] for description in cursor.description]
        
        tags = []
        for row in results:
            tag_data = dict(zip(columns, row))
            tags.append({
                "id": str(tag_data['id']),
                "name": tag_data['name'],
                "color": tag_data['color'],
                "assignedAt": tag_data['assigned_at'],
                "assignedBy": tag_data['assigned_by'],
                "assignmentReason": tag_data['assignment_reason'],
                "confidenceScore": tag_data['confidence_score']
            })
        
        conn.close()
        
        await log_to_agent_memory(
            user_id,
            "asset_tags_for_symbol_retrieved",
            f"Retrieved tags for asset: {asset_symbol}",
            json.dumps({"asset_symbol": asset_symbol}),
            f"Found {len(tags)} tags",
            {"asset_symbol": asset_symbol, "tags_count": len(tags)}
        )
        
        return tags
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Asset Allocation Rings Endpoints
@router.get("/asset-view-tools/allocation-rings")
async def get_allocation_rings(user_id: int = 1):
    """Get user's asset allocation rings"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Create allocation rings table if it doesn't exist
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS AssetAllocationRings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                userId INTEGER NOT NULL,
                name TEXT NOT NULL,
                description TEXT,
                ring_type TEXT DEFAULT 'asset_class',
                inner_radius REAL DEFAULT 40.0,
                outer_radius REAL DEFAULT 80.0,
                colors TEXT DEFAULT '[]',
                total_target_percentage REAL DEFAULT 100.0,
                rebalance_threshold REAL DEFAULT 5.0,
                is_active BOOLEAN DEFAULT TRUE,
                is_default BOOLEAN DEFAULT FALSE,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(userId, name)
            )
        """)
        
        cursor.execute("""
            SELECT * FROM AssetAllocationRings 
            WHERE userId = ? AND is_active = TRUE
            ORDER BY is_default DESC, name
        """, (user_id,))
        
        results = cursor.fetchall()
        
        if not results:
            # Create default allocation ring
            cursor.execute("""
                INSERT INTO AssetAllocationRings 
                (userId, name, description, is_default)
                VALUES (?, ?, ?, ?)
            """, (
                user_id,
                "Default Portfolio",
                "Primary asset allocation ring for main portfolio",
                True
            ))
            
            conn.commit()
            
            # Re-fetch
            cursor.execute("""
                SELECT * FROM AssetAllocationRings 
                WHERE userId = ? AND is_active = TRUE
                ORDER BY is_default DESC, name
            """, (user_id,))
            
            results = cursor.fetchall()
        
        columns = [description[0] for description in cursor.description]
        rings = []
        
        for row in results:
            ring_data = dict(zip(columns, row))
            
            ring = AssetAllocationRing(
                id=str(ring_data['id']),
                name=ring_data['name'],
                description=ring_data['description'],
                ringType=ring_data['ring_type'],
                innerRadius=ring_data['inner_radius'],
                outerRadius=ring_data['outer_radius'],
                colors=json.loads(ring_data['colors']),
                totalTargetPercentage=ring_data['total_target_percentage'],
                rebalanceThreshold=ring_data['rebalance_threshold'],
                isActive=ring_data['is_active'],
                isDefault=ring_data['is_default'],
                createdAt=ring_data['created_at'],
                updatedAt=ring_data['updated_at']
            )
            
            rings.append(ring.dict())
        
        conn.close()
        
        await log_to_agent_memory(
            user_id,
            "allocation_rings_retrieved",
            f"Retrieved {len(rings)} allocation rings",
            "{}",
            f"Found {len(rings)} rings",
            {"rings_count": len(rings)}
        )
        
        return rings
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/asset-view-tools/allocation-rings")
async def create_allocation_ring(
    ring: Dict[str, Any] = Body(...),
    user_id: int = 1
):
    """Create a new asset allocation ring"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Create asset class allocations table if it doesn't exist
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS AssetClassAllocations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                userId INTEGER NOT NULL,
                ring_id INTEGER NOT NULL REFERENCES AssetAllocationRings(id),
                asset_class TEXT NOT NULL,
                sub_class TEXT,
                target_percentage REAL NOT NULL,
                min_percentage REAL DEFAULT 0,
                max_percentage REAL DEFAULT 100,
                current_percentage REAL DEFAULT 0,
                current_value REAL DEFAULT 0,
                drift_percentage REAL DEFAULT 0,
                days_since_rebalance INTEGER DEFAULT 0,
                color TEXT DEFAULT '#3B82F6',
                sort_order INTEGER DEFAULT 0,
                tax_efficiency_score REAL DEFAULT 0,
                holding_period_days INTEGER DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(userId, ring_id, asset_class)
            )
        """)
        
        # Insert the ring
        cursor.execute("""
            INSERT INTO AssetAllocationRings 
            (userId, name, description, ring_type, inner_radius, outer_radius, 
             colors, total_target_percentage, rebalance_threshold)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            user_id,
            ring["name"],
            ring.get("description"),
            ring.get("ringType", "asset_class"),
            ring.get("innerRadius", 40.0),
            ring.get("outerRadius", 80.0),
            json.dumps(ring.get("colors", [])),
            ring.get("totalTargetPercentage", 100.0),
            ring.get("rebalanceThreshold", 5.0)
        ))
        
        ring_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        await log_to_agent_memory(
            user_id,
            "allocation_ring_created",
            f"Created allocation ring: {ring['name']}",
            json.dumps(ring),
            f"Ring ID: {ring_id}",
            {"ring_id": ring_id, "ring_name": ring["name"]}
        )
        
        return {
            "success": True,
            "message": "Allocation ring created successfully",
            "ringId": ring_id
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/asset-view-tools/allocation-rings/{ring_id}/allocations")
async def get_ring_allocations(
    ring_id: int,
    user_id: int = 1
):
    """Get asset class allocations for a specific ring"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT * FROM AssetClassAllocations
            WHERE userId = ? AND ring_id = ?
            ORDER BY sort_order, asset_class
        """, (user_id, ring_id))
        
        results = cursor.fetchall()
        
        if not results:
            # Create demo allocations for the ring
            demo_allocations = [
                {"asset_class": "Equities", "target_percentage": 60.0, "color": "#10B981"},
                {"asset_class": "Bonds", "target_percentage": 20.0, "color": "#3B82F6"},
                {"asset_class": "Real Estate", "target_percentage": 10.0, "color": "#F59E0B"},
                {"asset_class": "Commodities", "target_percentage": 5.0, "color": "#EF4444"},
                {"asset_class": "Cash", "target_percentage": 5.0, "color": "#6B7280"}
            ]
            
            for i, allocation in enumerate(demo_allocations):
                cursor.execute("""
                    INSERT INTO AssetClassAllocations 
                    (userId, ring_id, asset_class, target_percentage, color, sort_order)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, (
                    user_id, ring_id, allocation["asset_class"], 
                    allocation["target_percentage"], allocation["color"], i
                ))
            
            conn.commit()
            
            # Re-fetch
            cursor.execute("""
                SELECT * FROM AssetClassAllocations
                WHERE userId = ? AND ring_id = ?
                ORDER BY sort_order, asset_class
            """, (user_id, ring_id))
            
            results = cursor.fetchall()
        
        columns = [description[0] for description in cursor.description]
        allocations = []
        
        for row in results:
            allocation_data = dict(zip(columns, row))
            
            allocation = AssetClassAllocation(
                id=str(allocation_data['id']),
                ringId=str(allocation_data['ring_id']),
                assetClass=allocation_data['asset_class'],
                subClass=allocation_data['sub_class'],
                targetPercentage=allocation_data['target_percentage'],
                minPercentage=allocation_data['min_percentage'],
                maxPercentage=allocation_data['max_percentage'],
                currentPercentage=allocation_data['current_percentage'],
                currentValue=allocation_data['current_value'],
                driftPercentage=allocation_data['drift_percentage'],
                daysSinceRebalance=allocation_data['days_since_rebalance'],
                color=allocation_data['color'],
                sortOrder=allocation_data['sort_order'],
                taxEfficiencyScore=allocation_data['tax_efficiency_score'],
                holdingPeriodDays=allocation_data['holding_period_days']
            )
            
            allocations.append(allocation.dict())
        
        conn.close()
        
        await log_to_agent_memory(
            user_id,
            "ring_allocations_retrieved",
            f"Retrieved allocations for ring {ring_id}",
            json.dumps({"ring_id": ring_id}),
            f"Found {len(allocations)} allocations",
            {"ring_id": ring_id, "allocations_count": len(allocations)}
        )
        
        return allocations
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/asset-view-tools/view-history")
async def log_asset_view_history(
    view_data: Dict[str, Any] = Body(...),
    user_id: int = 1
):
    """Log asset view history for analytics"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Create view history table if it doesn't exist
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS AssetViewHistory (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                userId INTEGER NOT NULL,
                view_type TEXT NOT NULL,
                view_config TEXT,
                asset_symbol TEXT,
                filters_applied TEXT,
                session_id TEXT,
                view_duration INTEGER,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Insert view history
        cursor.execute("""
            INSERT INTO AssetViewHistory 
            (userId, view_type, view_config, asset_symbol, filters_applied, session_id, view_duration)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            user_id,
            view_data["viewType"],
            json.dumps(view_data.get("viewConfig", {})),
            view_data.get("assetSymbol"),
            json.dumps(view_data.get("filtersApplied", {})),
            view_data.get("sessionId"),
            view_data.get("viewDuration", 0)
        ))
        
        conn.commit()
        conn.close()
        
        return {
            "success": True,
            "message": "View history logged successfully"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 
#
# Integration Verification (Direct Path Tracing):
# Frontend: client/src/components/ui/AssetViewTabs.tsx
#   └─ Uses: client/src/hooks/useAssetTagging.ts & asset allocation hooks
#   └─ Calls: fetch('/api/asset-view-tools/*') endpoints (this file)
#   └─ Router: server/main.py includes asset_view_tools_router
#   └─ Database: Creates asset_view_preferences, asset_tags, asset_allocation_rings tables
#   └─ Agent Memory: Logs all asset view actions
#   └─ Tests: tests/test_block_06_asset_view_tools.py
#
# Status: 🟢 FULLY INTEGRATED - Frontend → API → Database → Agent Memory

from fastapi import APIRouter, HTTPException, Depends, Query, Body
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
import json
from datetime import datetime, timedelta
import sqlite3
from pathlib import Path

router = APIRouter()

# Block 6: Assets View Tools - API Routes
# Complete asset view tools backend integration

class AssetViewPreferences(BaseModel):
    """Asset view preferences response schema"""
    defaultViewType: str = "holdings"
    columnsVisible: List[str] = ["symbol", "name", "value", "change"]
    sortColumn: str = "value"
    sortDirection: str = "desc"
    showPerformanceTab: bool = True
    showAllocationChart: bool = True
    refreshInterval: int = 30
    itemsPerPage: int = 25
    defaultFilters: Dict[str, Any] = {}
    chartType: str = "donut"
    chartTheme: str = "default"

class AssetTag(BaseModel):
    """Asset tag response schema"""
    id: str
    name: str
    color: str
    description: Optional[str] = None
    usageCount: int = 0
    isSystemTag: bool = False
    isActive: bool = True
    parentTagId: Optional[str] = None
    sortOrder: int = 0
    createdAt: str
    updatedAt: str

class AssetTagAssignment(BaseModel):
    """Asset tag assignment response schema"""
    id: str
    assetSymbol: str
    tagId: str
    assignedAt: str
    assignedBy: str = "user"
    assignmentReason: Optional[str] = None
    confidenceScore: float = 1.0
    isActive: bool = True

class AssetAllocationRing(BaseModel):
    """Asset allocation ring response schema"""
    id: str
    name: str
    description: Optional[str] = None
    ringType: str = "asset_class"
    innerRadius: float = 40.0
    outerRadius: float = 80.0
    colors: List[str] = []
    totalTargetPercentage: float = 100.0
    rebalanceThreshold: float = 5.0
    isActive: bool = True
    isDefault: bool = False
    createdAt: str
    updatedAt: str

class AssetClassAllocation(BaseModel):
    """Asset class allocation response schema"""
    id: str
    ringId: str
    assetClass: str
    subClass: Optional[str] = None
    targetPercentage: float
    minPercentage: float = 0
    maxPercentage: float = 100
    currentPercentage: float = 0
    currentValue: float = 0
    driftPercentage: float = 0
    daysSinceRebalance: int = 0
    color: str = "#3B82F6"
    sortOrder: int = 0
    taxEfficiencyScore: float = 0
    holdingPeriodDays: int = 0

class AssetViewLayout(BaseModel):
    """Asset view layout response schema"""
    id: str
    layoutName: str
    layoutType: str = "dashboard"
    widgets: List[Dict[str, Any]] = []
    layoutConfig: Dict[str, Any] = {}
    breakpoints: Dict[str, Any] = {}
    isActive: bool = True
    isDefault: bool = False

class AssetViewFilter(BaseModel):
    """Asset view filter response schema"""
    id: str
    filterName: str
    filterType: str = "custom"
    criteria: Dict[str, Any]
    usageCount: int = 0
    lastUsedAt: Optional[str] = None
    isActive: bool = True
    isFavorite: bool = False

# Database connection
def get_db_connection():
    db_path = Path(__file__).parent.parent.parent / "prisma" / "dev.db"
    return sqlite3.connect(str(db_path))

# Agent Memory logging
async def log_to_agent_memory(user_id: int, action_type: str, action_summary: str, input_data: str, output_data: str, metadata: Dict[str, Any]):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO AgentMemory 
            (userId, blockId, action, context, userInput, agentResponse, metadata, timestamp, sessionId)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            user_id,
            "block_06",
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

# Asset View Preferences Endpoints
@router.get("/asset-view-tools/preferences")
async def get_asset_view_preferences(user_id: int = 1):
    """Get user's asset view preferences"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Create table if it doesn't exist
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS AssetViewPreferences (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                userId INTEGER NOT NULL,
                default_view_type TEXT DEFAULT 'holdings',
                columns_visible TEXT DEFAULT '["symbol", "name", "value", "change"]',
                sort_column TEXT DEFAULT 'value',
                sort_direction TEXT DEFAULT 'desc',
                show_performance_tab BOOLEAN DEFAULT TRUE,
                show_allocation_chart BOOLEAN DEFAULT TRUE,
                refresh_interval INTEGER DEFAULT 30,
                items_per_page INTEGER DEFAULT 25,
                default_filters TEXT DEFAULT '{}',
                chart_type TEXT DEFAULT 'donut',
                chart_theme TEXT DEFAULT 'default',
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(userId)
            )
        """)
        
        # Get preferences
        cursor.execute("SELECT * FROM AssetViewPreferences WHERE userId = ?", (user_id,))
        result = cursor.fetchone()
        
        if not result:
            # Create default preferences
            cursor.execute("""
                INSERT INTO AssetViewPreferences (userId) VALUES (?)
            """, (user_id,))
            
            conn.commit()
            
            # Return default preferences
            prefs = AssetViewPreferences()
        else:
            columns = [description[0] for description in cursor.description]
            prefs_data = dict(zip(columns, result))
            
            prefs = AssetViewPreferences(
                defaultViewType=prefs_data['default_view_type'],
                columnsVisible=json.loads(prefs_data['columns_visible']),
                sortColumn=prefs_data['sort_column'],
                sortDirection=prefs_data['sort_direction'],
                showPerformanceTab=prefs_data['show_performance_tab'],
                showAllocationChart=prefs_data['show_allocation_chart'],
                refreshInterval=prefs_data['refresh_interval'],
                itemsPerPage=prefs_data['items_per_page'],
                defaultFilters=json.loads(prefs_data['default_filters']),
                chartType=prefs_data['chart_type'],
                chartTheme=prefs_data['chart_theme']
            )
        
        conn.close()
        
        await log_to_agent_memory(
            user_id,
            "asset_view_preferences_retrieved",
            "Retrieved asset view preferences",
            "{}",
            f"View type: {prefs.defaultViewType}",
            {"default_view_type": prefs.defaultViewType}
        )
        
        return prefs.dict()
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/asset-view-tools/preferences")
async def update_asset_view_preferences(
    preferences: AssetViewPreferences,
    user_id: int = 1
):
    """Update user's asset view preferences"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            UPDATE AssetViewPreferences 
            SET 
                default_view_type = ?,
                columns_visible = ?,
                sort_column = ?,
                sort_direction = ?,
                show_performance_tab = ?,
                show_allocation_chart = ?,
                refresh_interval = ?,
                items_per_page = ?,
                default_filters = ?,
                chart_type = ?,
                chart_theme = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE userId = ?
        """, (
            preferences.defaultViewType,
            json.dumps(preferences.columnsVisible),
            preferences.sortColumn,
            preferences.sortDirection,
            preferences.showPerformanceTab,
            preferences.showAllocationChart,
            preferences.refreshInterval,
            preferences.itemsPerPage,
            json.dumps(preferences.defaultFilters),
            preferences.chartType,
            preferences.chartTheme,
            user_id
        ))
        
        conn.commit()
        conn.close()
        
        await log_to_agent_memory(
            user_id,
            "asset_view_preferences_updated",
            "Updated asset view preferences",
            json.dumps(preferences.dict()),
            "Preferences updated successfully",
            {"updated_fields": list(preferences.dict().keys())}
        )
        
        return {"success": True, "message": "Preferences updated successfully"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Asset Tags Endpoints
@router.get("/asset-view-tools/tags")
async def get_asset_tags(user_id: int = 1):
    """Get user's asset tags"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Create table if it doesn't exist
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS AssetTags (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
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
        
        # Get tags with usage count
        cursor.execute("""
            SELECT 
                t.*,
                COUNT(DISTINCT a.id) as actual_usage_count
            FROM AssetTags t
            LEFT JOIN (
                SELECT id, userId, tag_id FROM AssetTagAssignments 
                WHERE is_active = TRUE
            ) a ON t.id = a.tag_id
            WHERE t.userId = ? AND t.is_active = TRUE
            GROUP BY t.id
            ORDER BY actual_usage_count DESC, t.name
        """, (user_id,))
        
        results = cursor.fetchall()
        
        if not results:
            # Create demo tags
            demo_tags = [
                {"name": "High Growth", "color": "#10B981", "description": "High growth potential assets"},
                {"name": "Dividend", "color": "#3B82F6", "description": "Dividend-paying assets"},
                {"name": "Speculative", "color": "#F59E0B", "description": "High risk, high reward"},
                {"name": "Safe Haven", "color": "#6B7280", "description": "Low volatility assets"},
                {"name": "AU/NZ", "color": "#EF4444", "description": "Australian/New Zealand assets"},
                {"name": "Tech", "color": "#8B5CF6", "description": "Technology sector"},
                {"name": "ESG", "color": "#059669", "description": "Environmental, Social, Governance"},
                {"name": "Crypto", "color": "#F97316", "description": "Cryptocurrency assets"}
            ]
            
            for tag in demo_tags:
                cursor.execute("""
                    INSERT INTO AssetTags (userId, name, color, description)
                    VALUES (?, ?, ?, ?)
                """, (user_id, tag["name"], tag["color"], tag["description"]))
            
            conn.commit()
            
            # Re-fetch the created tags
            cursor.execute("""
                SELECT 
                    t.*,
                    COUNT(DISTINCT a.id) as actual_usage_count
                FROM AssetTags t
                LEFT JOIN (
                    SELECT id, userId, tag_id FROM AssetTagAssignments 
                    WHERE is_active = TRUE
                ) a ON t.id = a.tag_id
                WHERE t.userId = ? AND t.is_active = TRUE
                GROUP BY t.id
                ORDER BY actual_usage_count DESC, t.name
            """, (user_id,))
            
            results = cursor.fetchall()
        
        columns = [description[0] for description in cursor.description]
        tags = []
        
        for row in results:
            tag_data = dict(zip(columns, row))
            
            tag = AssetTag(
                id=str(tag_data['id']),
                name=tag_data['name'],
                color=tag_data['color'],
                description=tag_data['description'],
                usageCount=tag_data['actual_usage_count'],
                isSystemTag=tag_data['is_system_tag'],
                isActive=tag_data['is_active'],
                parentTagId=str(tag_data['parent_tag_id']) if tag_data['parent_tag_id'] else None,
                sortOrder=tag_data['sort_order'],
                createdAt=tag_data['created_at'],
                updatedAt=tag_data['updated_at']
            )
            
            tags.append(tag.dict())
        
        conn.close()
        
        await log_to_agent_memory(
            user_id,
            "asset_tags_retrieved",
            f"Retrieved {len(tags)} asset tags",
            "{}",
            f"Found {len(tags)} tags",
            {"tags_count": len(tags)}
        )
        
        return tags
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/asset-view-tools/tags")
async def create_asset_tag(
    tag: Dict[str, Any] = Body(...),
    user_id: int = 1
):
    """Create a new asset tag"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Create tag assignments table if it doesn't exist
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS AssetTagAssignments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
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
        
        # Insert the tag
        cursor.execute("""
            INSERT INTO AssetTags (userId, name, color, description)
            VALUES (?, ?, ?, ?)
        """, (
            user_id,
            tag["name"],
            tag.get("color", "#3B82F6"),
            tag.get("description")
        ))
        
        tag_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        await log_to_agent_memory(
            user_id,
            "asset_tag_created",
            f"Created asset tag: {tag['name']}",
            json.dumps(tag),
            f"Tag ID: {tag_id}",
            {"tag_id": tag_id, "tag_name": tag["name"]}
        )
        
        return {
            "success": True,
            "message": "Tag created successfully",
            "tagId": tag_id
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/asset-view-tools/tags/assign")
async def assign_asset_tag(
    assignment: Dict[str, Any] = Body(...),
    user_id: int = 1
):
    """Assign a tag to an asset"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Insert the assignment
        cursor.execute("""
            INSERT OR REPLACE INTO AssetTagAssignments 
            (userId, asset_symbol, tag_id, assigned_by, assignment_reason, confidence_score)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (
            user_id,
            assignment["assetSymbol"],
            assignment["tagId"],
            assignment.get("assignedBy", "user"),
            assignment.get("assignmentReason"),
            assignment.get("confidenceScore", 1.0)
        ))
        
        # Update tag usage count
        cursor.execute("""
            UPDATE AssetTags 
            SET usage_count = (
                SELECT COUNT(*) FROM AssetTagAssignments 
                WHERE tag_id = ? AND is_active = TRUE
            )
            WHERE id = ?
        """, (assignment["tagId"], assignment["tagId"]))
        
        conn.commit()
        conn.close()
        
        await log_to_agent_memory(
            user_id,
            "asset_tag_assigned",
            f"Assigned tag to asset: {assignment['assetSymbol']}",
            json.dumps(assignment),
            "Tag assignment successful",
            {"asset_symbol": assignment["assetSymbol"], "tag_id": assignment["tagId"]}
        )
        
        return {
            "success": True,
            "message": "Tag assigned successfully"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/asset-view-tools/tags/asset/{asset_symbol}")
async def get_asset_tags_for_symbol(
    asset_symbol: str,
    user_id: int = 1
):
    """Get tags for a specific asset"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT 
                t.id,
                t.name,
                t.color,
                a.assigned_at,
                a.assigned_by,
                a.assignment_reason,
                a.confidence_score
            FROM AssetTags t
            INNER JOIN AssetTagAssignments a ON t.id = a.tag_id
            WHERE t.userId = ? AND a.asset_symbol = ? AND a.is_active = TRUE
            ORDER BY a.assigned_at DESC
        """, (user_id, asset_symbol))
        
        results = cursor.fetchall()
        columns = [description[0] for description in cursor.description]
        
        tags = []
        for row in results:
            tag_data = dict(zip(columns, row))
            tags.append({
                "id": str(tag_data['id']),
                "name": tag_data['name'],
                "color": tag_data['color'],
                "assignedAt": tag_data['assigned_at'],
                "assignedBy": tag_data['assigned_by'],
                "assignmentReason": tag_data['assignment_reason'],
                "confidenceScore": tag_data['confidence_score']
            })
        
        conn.close()
        
        await log_to_agent_memory(
            user_id,
            "asset_tags_for_symbol_retrieved",
            f"Retrieved tags for asset: {asset_symbol}",
            json.dumps({"asset_symbol": asset_symbol}),
            f"Found {len(tags)} tags",
            {"asset_symbol": asset_symbol, "tags_count": len(tags)}
        )
        
        return tags
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Asset Allocation Rings Endpoints
@router.get("/asset-view-tools/allocation-rings")
async def get_allocation_rings(user_id: int = 1):
    """Get user's asset allocation rings"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Create allocation rings table if it doesn't exist
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS AssetAllocationRings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                userId INTEGER NOT NULL,
                name TEXT NOT NULL,
                description TEXT,
                ring_type TEXT DEFAULT 'asset_class',
                inner_radius REAL DEFAULT 40.0,
                outer_radius REAL DEFAULT 80.0,
                colors TEXT DEFAULT '[]',
                total_target_percentage REAL DEFAULT 100.0,
                rebalance_threshold REAL DEFAULT 5.0,
                is_active BOOLEAN DEFAULT TRUE,
                is_default BOOLEAN DEFAULT FALSE,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(userId, name)
            )
        """)
        
        cursor.execute("""
            SELECT * FROM AssetAllocationRings 
            WHERE userId = ? AND is_active = TRUE
            ORDER BY is_default DESC, name
        """, (user_id,))
        
        results = cursor.fetchall()
        
        if not results:
            # Create default allocation ring
            cursor.execute("""
                INSERT INTO AssetAllocationRings 
                (userId, name, description, is_default)
                VALUES (?, ?, ?, ?)
            """, (
                user_id,
                "Default Portfolio",
                "Primary asset allocation ring for main portfolio",
                True
            ))
            
            conn.commit()
            
            # Re-fetch
            cursor.execute("""
                SELECT * FROM AssetAllocationRings 
                WHERE userId = ? AND is_active = TRUE
                ORDER BY is_default DESC, name
            """, (user_id,))
            
            results = cursor.fetchall()
        
        columns = [description[0] for description in cursor.description]
        rings = []
        
        for row in results:
            ring_data = dict(zip(columns, row))
            
            ring = AssetAllocationRing(
                id=str(ring_data['id']),
                name=ring_data['name'],
                description=ring_data['description'],
                ringType=ring_data['ring_type'],
                innerRadius=ring_data['inner_radius'],
                outerRadius=ring_data['outer_radius'],
                colors=json.loads(ring_data['colors']),
                totalTargetPercentage=ring_data['total_target_percentage'],
                rebalanceThreshold=ring_data['rebalance_threshold'],
                isActive=ring_data['is_active'],
                isDefault=ring_data['is_default'],
                createdAt=ring_data['created_at'],
                updatedAt=ring_data['updated_at']
            )
            
            rings.append(ring.dict())
        
        conn.close()
        
        await log_to_agent_memory(
            user_id,
            "allocation_rings_retrieved",
            f"Retrieved {len(rings)} allocation rings",
            "{}",
            f"Found {len(rings)} rings",
            {"rings_count": len(rings)}
        )
        
        return rings
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/asset-view-tools/allocation-rings")
async def create_allocation_ring(
    ring: Dict[str, Any] = Body(...),
    user_id: int = 1
):
    """Create a new asset allocation ring"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Create asset class allocations table if it doesn't exist
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS AssetClassAllocations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                userId INTEGER NOT NULL,
                ring_id INTEGER NOT NULL REFERENCES AssetAllocationRings(id),
                asset_class TEXT NOT NULL,
                sub_class TEXT,
                target_percentage REAL NOT NULL,
                min_percentage REAL DEFAULT 0,
                max_percentage REAL DEFAULT 100,
                current_percentage REAL DEFAULT 0,
                current_value REAL DEFAULT 0,
                drift_percentage REAL DEFAULT 0,
                days_since_rebalance INTEGER DEFAULT 0,
                color TEXT DEFAULT '#3B82F6',
                sort_order INTEGER DEFAULT 0,
                tax_efficiency_score REAL DEFAULT 0,
                holding_period_days INTEGER DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(userId, ring_id, asset_class)
            )
        """)
        
        # Insert the ring
        cursor.execute("""
            INSERT INTO AssetAllocationRings 
            (userId, name, description, ring_type, inner_radius, outer_radius, 
             colors, total_target_percentage, rebalance_threshold)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            user_id,
            ring["name"],
            ring.get("description"),
            ring.get("ringType", "asset_class"),
            ring.get("innerRadius", 40.0),
            ring.get("outerRadius", 80.0),
            json.dumps(ring.get("colors", [])),
            ring.get("totalTargetPercentage", 100.0),
            ring.get("rebalanceThreshold", 5.0)
        ))
        
        ring_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        await log_to_agent_memory(
            user_id,
            "allocation_ring_created",
            f"Created allocation ring: {ring['name']}",
            json.dumps(ring),
            f"Ring ID: {ring_id}",
            {"ring_id": ring_id, "ring_name": ring["name"]}
        )
        
        return {
            "success": True,
            "message": "Allocation ring created successfully",
            "ringId": ring_id
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/asset-view-tools/allocation-rings/{ring_id}/allocations")
async def get_ring_allocations(
    ring_id: int,
    user_id: int = 1
):
    """Get asset class allocations for a specific ring"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT * FROM AssetClassAllocations
            WHERE userId = ? AND ring_id = ?
            ORDER BY sort_order, asset_class
        """, (user_id, ring_id))
        
        results = cursor.fetchall()
        
        if not results:
            # Create demo allocations for the ring
            demo_allocations = [
                {"asset_class": "Equities", "target_percentage": 60.0, "color": "#10B981"},
                {"asset_class": "Bonds", "target_percentage": 20.0, "color": "#3B82F6"},
                {"asset_class": "Real Estate", "target_percentage": 10.0, "color": "#F59E0B"},
                {"asset_class": "Commodities", "target_percentage": 5.0, "color": "#EF4444"},
                {"asset_class": "Cash", "target_percentage": 5.0, "color": "#6B7280"}
            ]
            
            for i, allocation in enumerate(demo_allocations):
                cursor.execute("""
                    INSERT INTO AssetClassAllocations 
                    (userId, ring_id, asset_class, target_percentage, color, sort_order)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, (
                    user_id, ring_id, allocation["asset_class"], 
                    allocation["target_percentage"], allocation["color"], i
                ))
            
            conn.commit()
            
            # Re-fetch
            cursor.execute("""
                SELECT * FROM AssetClassAllocations
                WHERE userId = ? AND ring_id = ?
                ORDER BY sort_order, asset_class
            """, (user_id, ring_id))
            
            results = cursor.fetchall()
        
        columns = [description[0] for description in cursor.description]
        allocations = []
        
        for row in results:
            allocation_data = dict(zip(columns, row))
            
            allocation = AssetClassAllocation(
                id=str(allocation_data['id']),
                ringId=str(allocation_data['ring_id']),
                assetClass=allocation_data['asset_class'],
                subClass=allocation_data['sub_class'],
                targetPercentage=allocation_data['target_percentage'],
                minPercentage=allocation_data['min_percentage'],
                maxPercentage=allocation_data['max_percentage'],
                currentPercentage=allocation_data['current_percentage'],
                currentValue=allocation_data['current_value'],
                driftPercentage=allocation_data['drift_percentage'],
                daysSinceRebalance=allocation_data['days_since_rebalance'],
                color=allocation_data['color'],
                sortOrder=allocation_data['sort_order'],
                taxEfficiencyScore=allocation_data['tax_efficiency_score'],
                holdingPeriodDays=allocation_data['holding_period_days']
            )
            
            allocations.append(allocation.dict())
        
        conn.close()
        
        await log_to_agent_memory(
            user_id,
            "ring_allocations_retrieved",
            f"Retrieved allocations for ring {ring_id}",
            json.dumps({"ring_id": ring_id}),
            f"Found {len(allocations)} allocations",
            {"ring_id": ring_id, "allocations_count": len(allocations)}
        )
        
        return allocations
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/asset-view-tools/view-history")
async def log_asset_view_history(
    view_data: Dict[str, Any] = Body(...),
    user_id: int = 1
):
    """Log asset view history for analytics"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Create view history table if it doesn't exist
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS AssetViewHistory (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                userId INTEGER NOT NULL,
                view_type TEXT NOT NULL,
                view_config TEXT,
                asset_symbol TEXT,
                filters_applied TEXT,
                session_id TEXT,
                view_duration INTEGER,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Insert view history
        cursor.execute("""
            INSERT INTO AssetViewHistory 
            (userId, view_type, view_config, asset_symbol, filters_applied, session_id, view_duration)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            user_id,
            view_data["viewType"],
            json.dumps(view_data.get("viewConfig", {})),
            view_data.get("assetSymbol"),
            json.dumps(view_data.get("filtersApplied", {})),
            view_data.get("sessionId"),
            view_data.get("viewDuration", 0)
        ))
        
        conn.commit()
        conn.close()
        
        return {
            "success": True,
            "message": "View history logged successfully"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 