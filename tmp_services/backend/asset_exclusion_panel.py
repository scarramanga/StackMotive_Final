# Block 37: Asset Exclusion Panel - FULLY INTEGRATED ✅

from fastapi import APIRouter, HTTPException, Depends, Query, Body
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
import json
from datetime import datetime, date
import psycopg2
from psycopg2.extras import RealDictCursor
import os

router = APIRouter()

# Block 37: Asset Exclusion Panel - API Routes

class AssetExclusion(BaseModel):
    """Asset exclusion schema"""
    assetSymbol: str
    assetName: Optional[str] = None
    assetType: str = "equity"
    exclusionReason: str
    exclusionCategory: str = "manual"
    excludeFromPortfolio: bool = True
    excludeFromTrading: bool = True
    excludeFromWatchlist: bool = False
    excludeFromSuggestions: bool = True
    excludedUntil: Optional[str] = None
    notes: Optional[str] = None

class ExclusionFilter(BaseModel):
    """Exclusion filter schema"""
    filterName: str
    filterDescription: Optional[str] = None
    criteriaType: str
    filterOperator: str
    filterValue: Any
    applyToPortfolio: bool = True
    applyToTrading: bool = True
    applyToWatchlist: bool = False

class BulkExclusionOperation(BaseModel):
    """Bulk exclusion operation schema"""
    operationName: str
    operationType: str
    assetList: List[str]
    operationConfig: Dict[str, Any] = {}

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
            "block_37",
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

# Individual Asset Exclusions
@router.get("/asset-exclusion-panel/exclusions")
async def get_asset_exclusions(
    scope: str = Query("portfolio", description="Exclusion scope: portfolio, trading, watchlist, suggestions"),
    active_only: bool = Query(True, description="Return only active exclusions"),
    user_id: int = 1
):
    """Get all asset exclusions for a user"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Create tables if they don't exist
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS IndividualAssetExclusions (
                id SERIAL PRIMARY KEY,
                userId INTEGER NOT NULL,
                asset_symbol TEXT NOT NULL,
                asset_name TEXT,
                asset_type TEXT DEFAULT 'equity',
                exclusion_reason TEXT NOT NULL,
                exclusion_category TEXT DEFAULT 'manual',
                exclude_from_portfolio BOOLEAN DEFAULT TRUE,
                exclude_from_trading BOOLEAN DEFAULT TRUE,
                exclude_from_watchlist BOOLEAN DEFAULT FALSE,
                exclude_from_suggestions BOOLEAN DEFAULT TRUE,
                excluded_from TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                excluded_until TEXT,
                is_active BOOLEAN DEFAULT TRUE,
                notes TEXT,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(userId, asset_symbol)
            )
        """)
        
        # Build query based on scope
        scope_condition = ""
        if scope == "portfolio":
            scope_condition = "AND exclude_from_portfolio = TRUE"
        elif scope == "trading":
            scope_condition = "AND exclude_from_trading = TRUE"
        elif scope == "watchlist":
            scope_condition = "AND exclude_from_watchlist = TRUE"
        elif scope == "suggestions":
            scope_condition = "AND exclude_from_suggestions = TRUE"
        
        active_condition = "AND is_active = TRUE" if active_only else ""
        
        cursor.execute(f"""
            SELECT * FROM IndividualAssetExclusions 
            WHERE userId = %s {scope_condition} {active_condition}
            AND (excluded_until IS NULL OR excluded_until > CURRENT_TIMESTAMP)
            ORDER BY excluded_from DESC
        """, (user_id,))
        
        results = cursor.fetchall()
        columns = [description[0] for description in cursor.description]
        
        # Convert to list of dictionaries
        exclusions = []
        for row in results:
            data = dict(zip(columns, row))
            exclusions.append({
                "id": str(data['id']),
                "assetSymbol": data['asset_symbol'],
                "assetName": data['asset_name'],
                "assetType": data['asset_type'],
                "exclusionReason": data['exclusion_reason'],
                "exclusionCategory": data['exclusion_category'],
                "excludeFromPortfolio": bool(data['exclude_from_portfolio']),
                "excludeFromTrading": bool(data['exclude_from_trading']),
                "excludeFromWatchlist": bool(data['exclude_from_watchlist']),
                "excludeFromSuggestions": bool(data['exclude_from_suggestions']),
                "excludedFrom": data['excluded_from'],
                "excludedUntil": data['excluded_until'],
                "isActive": bool(data['is_active']),
                "notes": data['notes'],
                "createdAt": data['created_at'],
                "updatedAt": data['updated_at']
            })
        
        conn.close()
        
        await log_to_agent_memory(
            user_id,
            "exclusions_retrieved",
            f"Retrieved asset exclusions for scope: {scope}",
            json.dumps({"scope": scope, "activeOnly": active_only}),
            f"Returned {len(exclusions)} exclusions",
            {"exclusionCount": len(exclusions), "scope": scope}
        )
        
        return {
            "exclusions": exclusions,
            "totalCount": len(exclusions),
            "scope": scope
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/asset-exclusion-panel/exclusions")
async def add_asset_exclusion(
    exclusion: AssetExclusion = Body(...),
    user_id: int = 1
):
    """Add a new asset exclusion"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Insert or update the exclusion
        cursor.execute("""
            INSERT INTO IndividualAssetExclusions 
            (userId, asset_symbol, asset_name, asset_type, exclusion_reason, exclusion_category,
             exclude_from_portfolio, exclude_from_trading, exclude_from_watchlist, exclude_from_suggestions,
             excluded_until, notes, is_active)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, TRUE)
        """, (
            user_id,
            exclusion.assetSymbol,
            exclusion.assetName,
            exclusion.assetType,
            exclusion.exclusionReason,
            exclusion.exclusionCategory,
            exclusion.excludeFromPortfolio,
            exclusion.excludeFromTrading,
            exclusion.excludeFromWatchlist,
            exclusion.excludeFromSuggestions,
            exclusion.excludedUntil,
            exclusion.notes
        ))
        
        exclusion_id = cursor.lastrowid
        
        # Log to exclusion history
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS ExclusionHistory (
                id SERIAL PRIMARY KEY,
                userId INTEGER NOT NULL,
                action_type TEXT NOT NULL,
                exclusion_type TEXT NOT NULL,
                target_identifier TEXT NOT NULL,
                target_name TEXT,
                action_reason TEXT,
                action_timestamp TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                performed_by TEXT DEFAULT 'user'
            )
        """)
        
        cursor.execute("""
            INSERT INTO ExclusionHistory 
            (userId, action_type, exclusion_type, target_identifier, target_name, action_reason)
            VALUES (%s, 'add', 'individual', %s, %s, %s)
        """, (user_id, exclusion.assetSymbol, exclusion.assetSymbol, exclusion.exclusionReason))
        
        conn.commit()
        conn.close()
        
        await log_to_agent_memory(
            user_id,
            "asset_excluded",
            f"Added exclusion for asset: {exclusion.assetSymbol}",
            json.dumps(exclusion.dict()),
            f"Exclusion ID: {exclusion_id}",
            {"exclusionId": exclusion_id, "assetSymbol": exclusion.assetSymbol}
        )
        
        return {
            "success": True,
            "message": "Asset exclusion added successfully",
            "exclusionId": str(exclusion_id)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/asset-exclusion-panel/exclusions/{exclusion_id}")
async def update_asset_exclusion(
    exclusion_id: str,
    exclusion: AssetExclusion = Body(...),
    user_id: int = 1
):
    """Update an existing asset exclusion"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            UPDATE IndividualAssetExclusions 
            SET asset_name = %s, asset_type = %s, exclusion_reason = %s, exclusion_category = %s,
                exclude_from_portfolio = %s, exclude_from_trading = %s, exclude_from_watchlist = %s, exclude_from_suggestions = %s,
                excluded_until = %s, notes = %s, updated_at = CURRENT_TIMESTAMP
            WHERE id = %s AND userId = %s
        """, (
            exclusion.assetName,
            exclusion.assetType,
            exclusion.exclusionReason,
            exclusion.exclusionCategory,
            exclusion.excludeFromPortfolio,
            exclusion.excludeFromTrading,
            exclusion.excludeFromWatchlist,
            exclusion.excludeFromSuggestions,
            exclusion.excludedUntil,
            exclusion.notes,
            int(exclusion_id),
            user_id
        ))
        
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Exclusion not found")
        
        # Log to exclusion history
        cursor.execute("""
            INSERT INTO ExclusionHistory 
            (userId, action_type, exclusion_type, target_identifier, target_name, action_reason)
            VALUES (%s, 'modify', 'individual', %s, %s, %s)
        """, (user_id, exclusion.assetSymbol, exclusion.assetSymbol, "Exclusion updated"))
        
        conn.commit()
        conn.close()
        
        await log_to_agent_memory(
            user_id,
            "asset_exclusion_updated",
            f"Updated exclusion for asset: {exclusion.assetSymbol}",
            json.dumps({"exclusionId": exclusion_id, **exclusion.dict()}),
            "Exclusion updated successfully",
            {"exclusionId": exclusion_id, "assetSymbol": exclusion.assetSymbol}
        )
        
        return {
            "success": True,
            "message": "Asset exclusion updated successfully"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/asset-exclusion-panel/exclusions/{exclusion_id}")
async def remove_asset_exclusion(
    exclusion_id: str,
    reason: str = Query("Manual removal", description="Reason for removing exclusion"),
    user_id: int = 1
):
    """Remove an asset exclusion"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get exclusion details for logging
        cursor.execute("""
            SELECT asset_symbol FROM IndividualAssetExclusions 
            WHERE id = %s AND userId = %s
        """, (int(exclusion_id), user_id))
        
        exclusion_data = cursor.fetchone()
        if not exclusion_data:
            raise HTTPException(status_code=404, detail="Exclusion not found")
        
        asset_symbol = exclusion_data[0]
        
        # Remove the exclusion (set inactive)
        cursor.execute("""
            UPDATE IndividualAssetExclusions 
            SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
            WHERE id = %s AND userId = %s
        """, (int(exclusion_id), user_id))
        
        # Log to exclusion history
        cursor.execute("""
            INSERT INTO ExclusionHistory 
            (userId, action_type, exclusion_type, target_identifier, target_name, action_reason)
            VALUES (%s, 'remove', 'individual', %s, %s, %s)
        """, (user_id, asset_symbol, asset_symbol, reason))
        
        conn.commit()
        conn.close()
        
        await log_to_agent_memory(
            user_id,
            "asset_exclusion_removed",
            f"Removed exclusion for asset: {asset_symbol}",
            json.dumps({"exclusionId": exclusion_id, "reason": reason}),
            "Exclusion removed successfully",
            {"exclusionId": exclusion_id, "assetSymbol": asset_symbol}
        )
        
        return {
            "success": True,
            "message": "Asset exclusion removed successfully"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Criteria-based Exclusion Filters
@router.get("/asset-exclusion-panel/filters")
async def get_exclusion_filters(user_id: int = 1):
    """Get all exclusion filters for a user"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Create table if it doesn't exist
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS CriteriaExclusionFilters (
                id SERIAL PRIMARY KEY,
                userId INTEGER NOT NULL,
                filter_name TEXT NOT NULL,
                filter_description TEXT,
                criteria_type TEXT NOT NULL,
                filter_operator TEXT NOT NULL,
                filter_value TEXT NOT NULL,
                is_active BOOLEAN DEFAULT TRUE,
                apply_to_portfolio BOOLEAN DEFAULT TRUE,
                apply_to_trading BOOLEAN DEFAULT TRUE,
                apply_to_watchlist BOOLEAN DEFAULT FALSE,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(userId, filter_name)
            )
        """)
        
        cursor.execute("""
            SELECT * FROM CriteriaExclusionFilters 
            WHERE userId = %s AND is_active = TRUE
            ORDER BY filter_name
        """, (user_id,))
        
        results = cursor.fetchall()
        columns = [description[0] for description in cursor.description]
        
        # Convert to list of dictionaries
        filters = []
        for row in results:
            data = dict(zip(columns, row))
            filters.append({
                "id": str(data['id']),
                "filterName": data['filter_name'],
                "filterDescription": data['filter_description'],
                "criteriaType": data['criteria_type'],
                "filterOperator": data['filter_operator'],
                "filterValue": json.loads(data['filter_value']) if data['filter_value'] else None,
                "isActive": bool(data['is_active']),
                "applyToPortfolio": bool(data['apply_to_portfolio']),
                "applyToTrading": bool(data['apply_to_trading']),
                "applyToWatchlist": bool(data['apply_to_watchlist']),
                "createdAt": data['created_at'],
                "updatedAt": data['updated_at']
            })
        
        conn.close()
        
        return {
            "filters": filters,
            "totalCount": len(filters)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/asset-exclusion-panel/filters")
async def create_exclusion_filter(
    filter_data: ExclusionFilter = Body(...),
    user_id: int = 1
):
    """Create a new exclusion filter"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO CriteriaExclusionFilters 
            (userId, filter_name, filter_description, criteria_type, filter_operator, filter_value,
             apply_to_portfolio, apply_to_trading, apply_to_watchlist)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            user_id,
            filter_data.filterName,
            filter_data.filterDescription,
            filter_data.criteriaType,
            filter_data.filterOperator,
            json.dumps(filter_data.filterValue),
            filter_data.applyToPortfolio,
            filter_data.applyToTrading,
            filter_data.applyToWatchlist
        ))
        
        filter_id = cursor.lastrowid
        
        # Log to exclusion history
        cursor.execute("""
            INSERT INTO ExclusionHistory 
            (userId, action_type, exclusion_type, target_identifier, target_name, action_reason)
            VALUES (%s, 'add', 'filter', %s, %s, %s)
        """, (user_id, str(filter_id), filter_data.filterName, "Filter created"))
        
        conn.commit()
        conn.close()
        
        await log_to_agent_memory(
            user_id,
            "exclusion_filter_created",
            f"Created exclusion filter: {filter_data.filterName}",
            json.dumps(filter_data.dict()),
            f"Filter ID: {filter_id}",
            {"filterId": filter_id, "filterName": filter_data.filterName}
        )
        
        return {
            "success": True,
            "message": "Exclusion filter created successfully",
            "filterId": str(filter_id)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Bulk Operations
@router.post("/asset-exclusion-panel/bulk-exclude")
async def bulk_exclude_assets(
    bulk_operation: BulkExclusionOperation = Body(...),
    user_id: int = 1
):
    """Bulk exclude multiple assets"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Create bulk operation record
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS BulkExclusionOperations (
                id SERIAL PRIMARY KEY,
                userId INTEGER NOT NULL,
                operation_name TEXT NOT NULL,
                operation_type TEXT NOT NULL,
                total_assets INTEGER NOT NULL,
                processed_assets INTEGER DEFAULT 0,
                failed_assets INTEGER DEFAULT 0,
                success_list TEXT DEFAULT '[]',
                failure_list TEXT DEFAULT '[]',
                status TEXT DEFAULT 'pending',
                started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                completed_at TEXT
            )
        """)
        
        cursor.execute("""
            INSERT INTO BulkExclusionOperations 
            (userId, operation_name, operation_type, total_assets)
            VALUES (%s, %s, %s, %s)
        """, (user_id, bulk_operation.operationName, bulk_operation.operationType, len(bulk_operation.assetList)))
        
        operation_id = cursor.lastrowid
        
        # Process each asset
        success_list = []
        failure_list = []
        config = bulk_operation.operationConfig
        
        for asset_symbol in bulk_operation.assetList:
            try:
                cursor.execute("""
                    INSERT INTO IndividualAssetExclusions 
                    (userId, asset_symbol, exclusion_reason, exclusion_category,
                     exclude_from_portfolio, exclude_from_trading, exclude_from_watchlist, exclude_from_suggestions,
                     is_active)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, TRUE)
                """, (
                    user_id,
                    asset_symbol,
                    config.get("exclusionReason", "Bulk exclusion"),
                    config.get("exclusionCategory", "bulk"),
                    config.get("excludeFromPortfolio", True),
                    config.get("excludeFromTrading", True),
                    config.get("excludeFromWatchlist", False),
                    config.get("excludeFromSuggestions", True)
                ))
                
                success_list.append(asset_symbol)
                
            except Exception as e:
                failure_list.append(asset_symbol)
                print(f"Failed to exclude {asset_symbol}: {e}")
        
        # Update operation status
        cursor.execute("""
            UPDATE BulkExclusionOperations 
            SET processed_assets = %s, failed_assets = %s, success_list = %s, failure_list = %s,
                status = 'completed', completed_at = CURRENT_TIMESTAMP
            WHERE id = %s
        """, (
            len(success_list),
            len(failure_list), 
            json.dumps(success_list),
            json.dumps(failure_list),
            operation_id
        ))
        
        conn.commit()
        conn.close()
        
        await log_to_agent_memory(
            user_id,
            "bulk_exclusion_completed",
            f"Bulk excluded {len(success_list)} assets",
            json.dumps(bulk_operation.dict()),
            f"Success: {len(success_list)}, Failed: {len(failure_list)}",
            {"operationId": operation_id, "successCount": len(success_list), "failureCount": len(failure_list)}
        )
        
        return {
            "success": True,
            "message": "Bulk exclusion operation completed",
            "operationId": str(operation_id),
            "successCount": len(success_list),
            "failureCount": len(failure_list),
            "successList": success_list,
            "failureList": failure_list
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Exclusion Analysis and Impact
@router.get("/asset-exclusion-panel/check/{asset_symbol}")
async def check_asset_exclusion(
    asset_symbol: str,
    scope: str = Query("portfolio", description="Scope to check: portfolio, trading, watchlist, suggestions"),
    user_id: int = 1
):
    """Check if a specific asset is excluded"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        scope_column = f"exclude_from_{scope}"
        
        cursor.execute(f"""
            SELECT * FROM IndividualAssetExclusions 
            WHERE userId = %s AND asset_symbol = %s AND is_active = TRUE
            AND {scope_column} = TRUE
            AND (excluded_until IS NULL OR excluded_until > CURRENT_TIMESTAMP)
        """, (user_id, asset_symbol))
        
        result = cursor.fetchone()
        
        if result:
            columns = [description[0] for description in cursor.description]
            exclusion_data = dict(zip(columns, result))
            
            conn.close()
            
            return {
                "isExcluded": True,
                "exclusionDetails": {
                    "reason": exclusion_data['exclusion_reason'],
                    "category": exclusion_data['exclusion_category'],
                    "excludedFrom": exclusion_data['excluded_from'],
                    "excludedUntil": exclusion_data['excluded_until'],
                    "notes": exclusion_data['notes']
                }
            }
        else:
            conn.close()
            return {
                "isExcluded": False,
                "exclusionDetails": None
            }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/asset-exclusion-panel/impact-analysis")
async def get_exclusion_impact_analysis(user_id: int = 1):
    """Get analysis of exclusion impact on portfolio"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get exclusion statistics
        cursor.execute("""
            SELECT 
                COUNT(*) as total_exclusions,
                COUNT(CASE WHEN exclude_from_portfolio = TRUE THEN 1 END) as portfolio_exclusions,
                COUNT(CASE WHEN exclude_from_trading = TRUE THEN 1 END) as trading_exclusions,
                COUNT(CASE WHEN exclude_from_watchlist = TRUE THEN 1 END) as watchlist_exclusions,
                COUNT(CASE WHEN excluded_until IS NOT NULL AND excluded_until > CURRENT_TIMESTAMP THEN 1 END) as temporary_exclusions,
                COUNT(CASE WHEN exclusion_category = 'performance' THEN 1 END) as performance_exclusions,
                COUNT(CASE WHEN exclusion_category = 'risk' THEN 1 END) as risk_exclusions,
                COUNT(CASE WHEN exclusion_category = 'ethics' THEN 1 END) as ethics_exclusions
            FROM IndividualAssetExclusions 
            WHERE userId = %s AND is_active = TRUE
        """, (user_id,))
        
        stats = cursor.fetchone()
        
        # Get recent exclusion activity
        cursor.execute("""
            SELECT 
                target_identifier as asset_symbol,
                action_type,
                action_reason,
                action_timestamp
            FROM ExclusionHistory 
            WHERE userId = %s 
            ORDER BY action_timestamp DESC 
            LIMIT 10
        """, (user_id,))
        
        recent_activity = cursor.fetchall()
        
        conn.close()
        
        # Format the response
        impact_analysis = {
            "statistics": {
                "totalExclusions": stats[0],
                "portfolioExclusions": stats[1],
                "tradingExclusions": stats[2],
                "watchlistExclusions": stats[3],
                "temporaryExclusions": stats[4],
                "performanceExclusions": stats[5],
                "riskExclusions": stats[6],
                "ethicsExclusions": stats[7]
            },
            "recentActivity": [
                {
                    "assetSymbol": activity[0],
                    "actionType": activity[1],
                    "actionReason": activity[2],
                    "timestamp": activity[3]
                }
                for activity in recent_activity
            ],
            "recommendations": []
        }
        
        # Add recommendations based on analysis
        if stats[0] > 50:
            impact_analysis["recommendations"].append({
                "type": "warning",
                "message": "You have a high number of exclusions which may limit diversification"
            })
        
        if stats[4] > 10:
            impact_analysis["recommendations"].append({
                "type": "info",
                "message": f"You have {stats[4]} temporary exclusions that will expire"
            })
        
        return impact_analysis
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Settings and Preferences
@router.get("/asset-exclusion-panel/settings")
async def get_exclusion_settings(user_id: int = 1):
    """Get user exclusion settings"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Create settings table if it doesn't exist
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS ExclusionSettings (
                id SERIAL PRIMARY KEY,
                userId INTEGER NOT NULL,
                enable_automatic_exclusions BOOLEAN DEFAULT FALSE,
                enable_temporary_exclusions BOOLEAN DEFAULT TRUE,
                default_exclusion_duration INTEGER,
                notify_on_exclusion_add BOOLEAN DEFAULT TRUE,
                notify_on_exclusion_remove BOOLEAN DEFAULT TRUE,
                default_portfolio_exclusion BOOLEAN DEFAULT TRUE,
                default_trading_exclusion BOOLEAN DEFAULT TRUE,
                default_watchlist_exclusion BOOLEAN DEFAULT FALSE,
                default_suggestion_exclusion BOOLEAN DEFAULT TRUE,
                auto_exclude_poor_performers BOOLEAN DEFAULT FALSE,
                poor_performance_threshold REAL DEFAULT -20.0,
                performance_evaluation_period INTEGER DEFAULT 90,
                allow_bulk_operations BOOLEAN DEFAULT TRUE,
                max_bulk_operation_size INTEGER DEFAULT 1000,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(userId)
            )
        """)
        
        cursor.execute("""
            SELECT * FROM ExclusionSettings WHERE userId = %s
        """, (user_id,))
        
        result = cursor.fetchone()
        
        if not result:
            # Create default settings
            cursor.execute("""
                INSERT INTO ExclusionSettings (userId) VALUES (%s)
            """, (user_id,))
            conn.commit()
            
            # Fetch the default settings
            cursor.execute("""
                SELECT * FROM ExclusionSettings WHERE userId = %s
            """, (user_id,))
            result = cursor.fetchone()
        
        columns = [description[0] for description in cursor.description]
        settings = dict(zip(columns, result))
        
        conn.close()
        
        # Format response
        return {
            "enableAutomaticExclusions": bool(settings['enable_automatic_exclusions']),
            "enableTemporaryExclusions": bool(settings['enable_temporary_exclusions']),
            "defaultExclusionDuration": settings['default_exclusion_duration'],
            "notifyOnExclusionAdd": bool(settings['notify_on_exclusion_add']),
            "notifyOnExclusionRemove": bool(settings['notify_on_exclusion_remove']),
            "defaultPortfolioExclusion": bool(settings['default_portfolio_exclusion']),
            "defaultTradingExclusion": bool(settings['default_trading_exclusion']),
            "defaultWatchlistExclusion": bool(settings['default_watchlist_exclusion']),
            "defaultSuggestionExclusion": bool(settings['default_suggestion_exclusion']),
            "autoExcludePoorPerformers": bool(settings['auto_exclude_poor_performers']),
            "poorPerformanceThreshold": settings['poor_performance_threshold'],
            "performanceEvaluationPeriod": settings['performance_evaluation_period'],
            "allowBulkOperations": bool(settings['allow_bulk_operations']),
            "maxBulkOperationSize": settings['max_bulk_operation_size']
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/asset-exclusion-panel/settings")
async def update_exclusion_settings(
    settings: Dict[str, Any] = Body(...),
    user_id: int = 1
):
    """Update user exclusion settings"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Update settings
        cursor.execute("""
            UPDATE ExclusionSettings 
            SET enable_automatic_exclusions = %s,
                enable_temporary_exclusions = %s,
                default_exclusion_duration = %s,
                notify_on_exclusion_add = %s,
                notify_on_exclusion_remove = %s,
                default_portfolio_exclusion = %s,
                default_trading_exclusion = %s,
                default_watchlist_exclusion = %s,
                default_suggestion_exclusion = %s,
                auto_exclude_poor_performers = %s,
                poor_performance_threshold = %s,
                performance_evaluation_period = %s,
                allow_bulk_operations = %s,
                max_bulk_operation_size = %s,
                updated_at = CURRENT_TIMESTAMP
            WHERE userId = %s
        """, (
            settings.get("enableAutomaticExclusions", False),
            settings.get("enableTemporaryExclusions", True),
            settings.get("defaultExclusionDuration"),
            settings.get("notifyOnExclusionAdd", True),
            settings.get("notifyOnExclusionRemove", True),
            settings.get("defaultPortfolioExclusion", True),
            settings.get("defaultTradingExclusion", True),
            settings.get("defaultWatchlistExclusion", False),
            settings.get("defaultSuggestionExclusion", True),
            settings.get("autoExcludePoorPerformers", False),
            settings.get("poorPerformanceThreshold", -20.0),
            settings.get("performanceEvaluationPeriod", 90),
            settings.get("allowBulkOperations", True),
            settings.get("maxBulkOperationSize", 1000),
            user_id
        ))
        
        conn.commit()
        conn.close()
        
        await log_to_agent_memory(
            user_id,
            "exclusion_settings_updated",
            "Updated exclusion settings",
            json.dumps(settings),
            "Settings updated successfully",
            {"settingsChanged": len(settings)}
        )
        
        return {
            "success": True,
            "message": "Exclusion settings updated successfully"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Export/Import functionality
@router.get("/asset-exclusion-panel/export")
async def export_exclusions(user_id: int = 1):
    """Export all exclusion data"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get all exclusions
        cursor.execute("""
            SELECT * FROM IndividualAssetExclusions 
            WHERE userId = %s AND is_active = TRUE
        """, (user_id,))
        
        exclusions = cursor.fetchall()
        exclusion_columns = [description[0] for description in cursor.description]
        
        # Get all filters
        cursor.execute("""
            SELECT * FROM CriteriaExclusionFilters 
            WHERE userId = %s AND is_active = TRUE
        """, (user_id,))
        
        filters = cursor.fetchall()
        filter_columns = [description[0] for description in cursor.description]
        
        conn.close()
        
        # Format export data
        export_data = {
            "exclusions": [dict(zip(exclusion_columns, exclusion)) for exclusion in exclusions],
            "filters": [dict(zip(filter_columns, filter_data)) for filter_data in filters],
            "exportedAt": datetime.now().isoformat(),
            "version": "1.0"
        }
        
        await log_to_agent_memory(
            user_id,
            "exclusions_exported",
            "Exported all exclusion data",
            json.dumps({"userId": user_id}),
            f"Exported {len(exclusions)} exclusions and {len(filters)} filters",
            {"exclusionCount": len(exclusions), "filterCount": len(filters)}
        )
        
        return export_data
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 

from fastapi import APIRouter, HTTPException, Depends, Query, Body
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
import json
from datetime import datetime, date
import psycopg2
from psycopg2.extras import RealDictCursor
import os

router = APIRouter()

# Block 37: Asset Exclusion Panel - API Routes

class AssetExclusion(BaseModel):
    """Asset exclusion schema"""
    assetSymbol: str
    assetName: Optional[str] = None
    assetType: str = "equity"
    exclusionReason: str
    exclusionCategory: str = "manual"
    excludeFromPortfolio: bool = True
    excludeFromTrading: bool = True
    excludeFromWatchlist: bool = False
    excludeFromSuggestions: bool = True
    excludedUntil: Optional[str] = None
    notes: Optional[str] = None

class ExclusionFilter(BaseModel):
    """Exclusion filter schema"""
    filterName: str
    filterDescription: Optional[str] = None
    criteriaType: str
    filterOperator: str
    filterValue: Any
    applyToPortfolio: bool = True
    applyToTrading: bool = True
    applyToWatchlist: bool = False

class BulkExclusionOperation(BaseModel):
    """Bulk exclusion operation schema"""
    operationName: str
    operationType: str
    assetList: List[str]
    operationConfig: Dict[str, Any] = {}

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
            "block_37",
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

# Individual Asset Exclusions
@router.get("/asset-exclusion-panel/exclusions")
async def get_asset_exclusions(
    scope: str = Query("portfolio", description="Exclusion scope: portfolio, trading, watchlist, suggestions"),
    active_only: bool = Query(True, description="Return only active exclusions"),
    user_id: int = 1
):
    """Get all asset exclusions for a user"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Create tables if they don't exist
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS IndividualAssetExclusions (
                id SERIAL PRIMARY KEY,
                userId INTEGER NOT NULL,
                asset_symbol TEXT NOT NULL,
                asset_name TEXT,
                asset_type TEXT DEFAULT 'equity',
                exclusion_reason TEXT NOT NULL,
                exclusion_category TEXT DEFAULT 'manual',
                exclude_from_portfolio BOOLEAN DEFAULT TRUE,
                exclude_from_trading BOOLEAN DEFAULT TRUE,
                exclude_from_watchlist BOOLEAN DEFAULT FALSE,
                exclude_from_suggestions BOOLEAN DEFAULT TRUE,
                excluded_from TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                excluded_until TEXT,
                is_active BOOLEAN DEFAULT TRUE,
                notes TEXT,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(userId, asset_symbol)
            )
        """)
        
        # Build query based on scope
        scope_condition = ""
        if scope == "portfolio":
            scope_condition = "AND exclude_from_portfolio = TRUE"
        elif scope == "trading":
            scope_condition = "AND exclude_from_trading = TRUE"
        elif scope == "watchlist":
            scope_condition = "AND exclude_from_watchlist = TRUE"
        elif scope == "suggestions":
            scope_condition = "AND exclude_from_suggestions = TRUE"
        
        active_condition = "AND is_active = TRUE" if active_only else ""
        
        cursor.execute(f"""
            SELECT * FROM IndividualAssetExclusions 
            WHERE userId = %s {scope_condition} {active_condition}
            AND (excluded_until IS NULL OR excluded_until > CURRENT_TIMESTAMP)
            ORDER BY excluded_from DESC
        """, (user_id,))
        
        results = cursor.fetchall()
        columns = [description[0] for description in cursor.description]
        
        # Convert to list of dictionaries
        exclusions = []
        for row in results:
            data = dict(zip(columns, row))
            exclusions.append({
                "id": str(data['id']),
                "assetSymbol": data['asset_symbol'],
                "assetName": data['asset_name'],
                "assetType": data['asset_type'],
                "exclusionReason": data['exclusion_reason'],
                "exclusionCategory": data['exclusion_category'],
                "excludeFromPortfolio": bool(data['exclude_from_portfolio']),
                "excludeFromTrading": bool(data['exclude_from_trading']),
                "excludeFromWatchlist": bool(data['exclude_from_watchlist']),
                "excludeFromSuggestions": bool(data['exclude_from_suggestions']),
                "excludedFrom": data['excluded_from'],
                "excludedUntil": data['excluded_until'],
                "isActive": bool(data['is_active']),
                "notes": data['notes'],
                "createdAt": data['created_at'],
                "updatedAt": data['updated_at']
            })
        
        conn.close()
        
        await log_to_agent_memory(
            user_id,
            "exclusions_retrieved",
            f"Retrieved asset exclusions for scope: {scope}",
            json.dumps({"scope": scope, "activeOnly": active_only}),
            f"Returned {len(exclusions)} exclusions",
            {"exclusionCount": len(exclusions), "scope": scope}
        )
        
        return {
            "exclusions": exclusions,
            "totalCount": len(exclusions),
            "scope": scope
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/asset-exclusion-panel/exclusions")
async def add_asset_exclusion(
    exclusion: AssetExclusion = Body(...),
    user_id: int = 1
):
    """Add a new asset exclusion"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Insert or update the exclusion
        cursor.execute("""
            INSERT INTO IndividualAssetExclusions 
            (userId, asset_symbol, asset_name, asset_type, exclusion_reason, exclusion_category,
             exclude_from_portfolio, exclude_from_trading, exclude_from_watchlist, exclude_from_suggestions,
             excluded_until, notes, is_active)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, TRUE)
        """, (
            user_id,
            exclusion.assetSymbol,
            exclusion.assetName,
            exclusion.assetType,
            exclusion.exclusionReason,
            exclusion.exclusionCategory,
            exclusion.excludeFromPortfolio,
            exclusion.excludeFromTrading,
            exclusion.excludeFromWatchlist,
            exclusion.excludeFromSuggestions,
            exclusion.excludedUntil,
            exclusion.notes
        ))
        
        exclusion_id = cursor.lastrowid
        
        # Log to exclusion history
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS ExclusionHistory (
                id SERIAL PRIMARY KEY,
                userId INTEGER NOT NULL,
                action_type TEXT NOT NULL,
                exclusion_type TEXT NOT NULL,
                target_identifier TEXT NOT NULL,
                target_name TEXT,
                action_reason TEXT,
                action_timestamp TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                performed_by TEXT DEFAULT 'user'
            )
        """)
        
        cursor.execute("""
            INSERT INTO ExclusionHistory 
            (userId, action_type, exclusion_type, target_identifier, target_name, action_reason)
            VALUES (%s, 'add', 'individual', %s, %s, %s)
        """, (user_id, exclusion.assetSymbol, exclusion.assetSymbol, exclusion.exclusionReason))
        
        conn.commit()
        conn.close()
        
        await log_to_agent_memory(
            user_id,
            "asset_excluded",
            f"Added exclusion for asset: {exclusion.assetSymbol}",
            json.dumps(exclusion.dict()),
            f"Exclusion ID: {exclusion_id}",
            {"exclusionId": exclusion_id, "assetSymbol": exclusion.assetSymbol}
        )
        
        return {
            "success": True,
            "message": "Asset exclusion added successfully",
            "exclusionId": str(exclusion_id)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/asset-exclusion-panel/exclusions/{exclusion_id}")
async def update_asset_exclusion(
    exclusion_id: str,
    exclusion: AssetExclusion = Body(...),
    user_id: int = 1
):
    """Update an existing asset exclusion"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            UPDATE IndividualAssetExclusions 
            SET asset_name = %s, asset_type = %s, exclusion_reason = %s, exclusion_category = %s,
                exclude_from_portfolio = %s, exclude_from_trading = %s, exclude_from_watchlist = %s, exclude_from_suggestions = %s,
                excluded_until = %s, notes = %s, updated_at = CURRENT_TIMESTAMP
            WHERE id = %s AND userId = %s
        """, (
            exclusion.assetName,
            exclusion.assetType,
            exclusion.exclusionReason,
            exclusion.exclusionCategory,
            exclusion.excludeFromPortfolio,
            exclusion.excludeFromTrading,
            exclusion.excludeFromWatchlist,
            exclusion.excludeFromSuggestions,
            exclusion.excludedUntil,
            exclusion.notes,
            int(exclusion_id),
            user_id
        ))
        
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Exclusion not found")
        
        # Log to exclusion history
        cursor.execute("""
            INSERT INTO ExclusionHistory 
            (userId, action_type, exclusion_type, target_identifier, target_name, action_reason)
            VALUES (%s, 'modify', 'individual', %s, %s, %s)
        """, (user_id, exclusion.assetSymbol, exclusion.assetSymbol, "Exclusion updated"))
        
        conn.commit()
        conn.close()
        
        await log_to_agent_memory(
            user_id,
            "asset_exclusion_updated",
            f"Updated exclusion for asset: {exclusion.assetSymbol}",
            json.dumps({"exclusionId": exclusion_id, **exclusion.dict()}),
            "Exclusion updated successfully",
            {"exclusionId": exclusion_id, "assetSymbol": exclusion.assetSymbol}
        )
        
        return {
            "success": True,
            "message": "Asset exclusion updated successfully"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/asset-exclusion-panel/exclusions/{exclusion_id}")
async def remove_asset_exclusion(
    exclusion_id: str,
    reason: str = Query("Manual removal", description="Reason for removing exclusion"),
    user_id: int = 1
):
    """Remove an asset exclusion"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get exclusion details for logging
        cursor.execute("""
            SELECT asset_symbol FROM IndividualAssetExclusions 
            WHERE id = %s AND userId = %s
        """, (int(exclusion_id), user_id))
        
        exclusion_data = cursor.fetchone()
        if not exclusion_data:
            raise HTTPException(status_code=404, detail="Exclusion not found")
        
        asset_symbol = exclusion_data[0]
        
        # Remove the exclusion (set inactive)
        cursor.execute("""
            UPDATE IndividualAssetExclusions 
            SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
            WHERE id = %s AND userId = %s
        """, (int(exclusion_id), user_id))
        
        # Log to exclusion history
        cursor.execute("""
            INSERT INTO ExclusionHistory 
            (userId, action_type, exclusion_type, target_identifier, target_name, action_reason)
            VALUES (%s, 'remove', 'individual', %s, %s, %s)
        """, (user_id, asset_symbol, asset_symbol, reason))
        
        conn.commit()
        conn.close()
        
        await log_to_agent_memory(
            user_id,
            "asset_exclusion_removed",
            f"Removed exclusion for asset: {asset_symbol}",
            json.dumps({"exclusionId": exclusion_id, "reason": reason}),
            "Exclusion removed successfully",
            {"exclusionId": exclusion_id, "assetSymbol": asset_symbol}
        )
        
        return {
            "success": True,
            "message": "Asset exclusion removed successfully"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Criteria-based Exclusion Filters
@router.get("/asset-exclusion-panel/filters")
async def get_exclusion_filters(user_id: int = 1):
    """Get all exclusion filters for a user"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Create table if it doesn't exist
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS CriteriaExclusionFilters (
                id SERIAL PRIMARY KEY,
                userId INTEGER NOT NULL,
                filter_name TEXT NOT NULL,
                filter_description TEXT,
                criteria_type TEXT NOT NULL,
                filter_operator TEXT NOT NULL,
                filter_value TEXT NOT NULL,
                is_active BOOLEAN DEFAULT TRUE,
                apply_to_portfolio BOOLEAN DEFAULT TRUE,
                apply_to_trading BOOLEAN DEFAULT TRUE,
                apply_to_watchlist BOOLEAN DEFAULT FALSE,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(userId, filter_name)
            )
        """)
        
        cursor.execute("""
            SELECT * FROM CriteriaExclusionFilters 
            WHERE userId = %s AND is_active = TRUE
            ORDER BY filter_name
        """, (user_id,))
        
        results = cursor.fetchall()
        columns = [description[0] for description in cursor.description]
        
        # Convert to list of dictionaries
        filters = []
        for row in results:
            data = dict(zip(columns, row))
            filters.append({
                "id": str(data['id']),
                "filterName": data['filter_name'],
                "filterDescription": data['filter_description'],
                "criteriaType": data['criteria_type'],
                "filterOperator": data['filter_operator'],
                "filterValue": json.loads(data['filter_value']) if data['filter_value'] else None,
                "isActive": bool(data['is_active']),
                "applyToPortfolio": bool(data['apply_to_portfolio']),
                "applyToTrading": bool(data['apply_to_trading']),
                "applyToWatchlist": bool(data['apply_to_watchlist']),
                "createdAt": data['created_at'],
                "updatedAt": data['updated_at']
            })
        
        conn.close()
        
        return {
            "filters": filters,
            "totalCount": len(filters)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/asset-exclusion-panel/filters")
async def create_exclusion_filter(
    filter_data: ExclusionFilter = Body(...),
    user_id: int = 1
):
    """Create a new exclusion filter"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO CriteriaExclusionFilters 
            (userId, filter_name, filter_description, criteria_type, filter_operator, filter_value,
             apply_to_portfolio, apply_to_trading, apply_to_watchlist)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            user_id,
            filter_data.filterName,
            filter_data.filterDescription,
            filter_data.criteriaType,
            filter_data.filterOperator,
            json.dumps(filter_data.filterValue),
            filter_data.applyToPortfolio,
            filter_data.applyToTrading,
            filter_data.applyToWatchlist
        ))
        
        filter_id = cursor.lastrowid
        
        # Log to exclusion history
        cursor.execute("""
            INSERT INTO ExclusionHistory 
            (userId, action_type, exclusion_type, target_identifier, target_name, action_reason)
            VALUES (%s, 'add', 'filter', %s, %s, %s)
        """, (user_id, str(filter_id), filter_data.filterName, "Filter created"))
        
        conn.commit()
        conn.close()
        
        await log_to_agent_memory(
            user_id,
            "exclusion_filter_created",
            f"Created exclusion filter: {filter_data.filterName}",
            json.dumps(filter_data.dict()),
            f"Filter ID: {filter_id}",
            {"filterId": filter_id, "filterName": filter_data.filterName}
        )
        
        return {
            "success": True,
            "message": "Exclusion filter created successfully",
            "filterId": str(filter_id)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Bulk Operations
@router.post("/asset-exclusion-panel/bulk-exclude")
async def bulk_exclude_assets(
    bulk_operation: BulkExclusionOperation = Body(...),
    user_id: int = 1
):
    """Bulk exclude multiple assets"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Create bulk operation record
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS BulkExclusionOperations (
                id SERIAL PRIMARY KEY,
                userId INTEGER NOT NULL,
                operation_name TEXT NOT NULL,
                operation_type TEXT NOT NULL,
                total_assets INTEGER NOT NULL,
                processed_assets INTEGER DEFAULT 0,
                failed_assets INTEGER DEFAULT 0,
                success_list TEXT DEFAULT '[]',
                failure_list TEXT DEFAULT '[]',
                status TEXT DEFAULT 'pending',
                started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                completed_at TEXT
            )
        """)
        
        cursor.execute("""
            INSERT INTO BulkExclusionOperations 
            (userId, operation_name, operation_type, total_assets)
            VALUES (%s, %s, %s, %s)
        """, (user_id, bulk_operation.operationName, bulk_operation.operationType, len(bulk_operation.assetList)))
        
        operation_id = cursor.lastrowid
        
        # Process each asset
        success_list = []
        failure_list = []
        config = bulk_operation.operationConfig
        
        for asset_symbol in bulk_operation.assetList:
            try:
                cursor.execute("""
                    INSERT INTO IndividualAssetExclusions 
                    (userId, asset_symbol, exclusion_reason, exclusion_category,
                     exclude_from_portfolio, exclude_from_trading, exclude_from_watchlist, exclude_from_suggestions,
                     is_active)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, TRUE)
                """, (
                    user_id,
                    asset_symbol,
                    config.get("exclusionReason", "Bulk exclusion"),
                    config.get("exclusionCategory", "bulk"),
                    config.get("excludeFromPortfolio", True),
                    config.get("excludeFromTrading", True),
                    config.get("excludeFromWatchlist", False),
                    config.get("excludeFromSuggestions", True)
                ))
                
                success_list.append(asset_symbol)
                
            except Exception as e:
                failure_list.append(asset_symbol)
                print(f"Failed to exclude {asset_symbol}: {e}")
        
        # Update operation status
        cursor.execute("""
            UPDATE BulkExclusionOperations 
            SET processed_assets = %s, failed_assets = %s, success_list = %s, failure_list = %s,
                status = 'completed', completed_at = CURRENT_TIMESTAMP
            WHERE id = %s
        """, (
            len(success_list),
            len(failure_list), 
            json.dumps(success_list),
            json.dumps(failure_list),
            operation_id
        ))
        
        conn.commit()
        conn.close()
        
        await log_to_agent_memory(
            user_id,
            "bulk_exclusion_completed",
            f"Bulk excluded {len(success_list)} assets",
            json.dumps(bulk_operation.dict()),
            f"Success: {len(success_list)}, Failed: {len(failure_list)}",
            {"operationId": operation_id, "successCount": len(success_list), "failureCount": len(failure_list)}
        )
        
        return {
            "success": True,
            "message": "Bulk exclusion operation completed",
            "operationId": str(operation_id),
            "successCount": len(success_list),
            "failureCount": len(failure_list),
            "successList": success_list,
            "failureList": failure_list
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Exclusion Analysis and Impact
@router.get("/asset-exclusion-panel/check/{asset_symbol}")
async def check_asset_exclusion(
    asset_symbol: str,
    scope: str = Query("portfolio", description="Scope to check: portfolio, trading, watchlist, suggestions"),
    user_id: int = 1
):
    """Check if a specific asset is excluded"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        scope_column = f"exclude_from_{scope}"
        
        cursor.execute(f"""
            SELECT * FROM IndividualAssetExclusions 
            WHERE userId = %s AND asset_symbol = %s AND is_active = TRUE
            AND {scope_column} = TRUE
            AND (excluded_until IS NULL OR excluded_until > CURRENT_TIMESTAMP)
        """, (user_id, asset_symbol))
        
        result = cursor.fetchone()
        
        if result:
            columns = [description[0] for description in cursor.description]
            exclusion_data = dict(zip(columns, result))
            
            conn.close()
            
            return {
                "isExcluded": True,
                "exclusionDetails": {
                    "reason": exclusion_data['exclusion_reason'],
                    "category": exclusion_data['exclusion_category'],
                    "excludedFrom": exclusion_data['excluded_from'],
                    "excludedUntil": exclusion_data['excluded_until'],
                    "notes": exclusion_data['notes']
                }
            }
        else:
            conn.close()
            return {
                "isExcluded": False,
                "exclusionDetails": None
            }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/asset-exclusion-panel/impact-analysis")
async def get_exclusion_impact_analysis(user_id: int = 1):
    """Get analysis of exclusion impact on portfolio"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get exclusion statistics
        cursor.execute("""
            SELECT 
                COUNT(*) as total_exclusions,
                COUNT(CASE WHEN exclude_from_portfolio = TRUE THEN 1 END) as portfolio_exclusions,
                COUNT(CASE WHEN exclude_from_trading = TRUE THEN 1 END) as trading_exclusions,
                COUNT(CASE WHEN exclude_from_watchlist = TRUE THEN 1 END) as watchlist_exclusions,
                COUNT(CASE WHEN excluded_until IS NOT NULL AND excluded_until > CURRENT_TIMESTAMP THEN 1 END) as temporary_exclusions,
                COUNT(CASE WHEN exclusion_category = 'performance' THEN 1 END) as performance_exclusions,
                COUNT(CASE WHEN exclusion_category = 'risk' THEN 1 END) as risk_exclusions,
                COUNT(CASE WHEN exclusion_category = 'ethics' THEN 1 END) as ethics_exclusions
            FROM IndividualAssetExclusions 
            WHERE userId = %s AND is_active = TRUE
        """, (user_id,))
        
        stats = cursor.fetchone()
        
        # Get recent exclusion activity
        cursor.execute("""
            SELECT 
                target_identifier as asset_symbol,
                action_type,
                action_reason,
                action_timestamp
            FROM ExclusionHistory 
            WHERE userId = %s 
            ORDER BY action_timestamp DESC 
            LIMIT 10
        """, (user_id,))
        
        recent_activity = cursor.fetchall()
        
        conn.close()
        
        # Format the response
        impact_analysis = {
            "statistics": {
                "totalExclusions": stats[0],
                "portfolioExclusions": stats[1],
                "tradingExclusions": stats[2],
                "watchlistExclusions": stats[3],
                "temporaryExclusions": stats[4],
                "performanceExclusions": stats[5],
                "riskExclusions": stats[6],
                "ethicsExclusions": stats[7]
            },
            "recentActivity": [
                {
                    "assetSymbol": activity[0],
                    "actionType": activity[1],
                    "actionReason": activity[2],
                    "timestamp": activity[3]
                }
                for activity in recent_activity
            ],
            "recommendations": []
        }
        
        # Add recommendations based on analysis
        if stats[0] > 50:
            impact_analysis["recommendations"].append({
                "type": "warning",
                "message": "You have a high number of exclusions which may limit diversification"
            })
        
        if stats[4] > 10:
            impact_analysis["recommendations"].append({
                "type": "info",
                "message": f"You have {stats[4]} temporary exclusions that will expire"
            })
        
        return impact_analysis
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Settings and Preferences
@router.get("/asset-exclusion-panel/settings")
async def get_exclusion_settings(user_id: int = 1):
    """Get user exclusion settings"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Create settings table if it doesn't exist
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS ExclusionSettings (
                id SERIAL PRIMARY KEY,
                userId INTEGER NOT NULL,
                enable_automatic_exclusions BOOLEAN DEFAULT FALSE,
                enable_temporary_exclusions BOOLEAN DEFAULT TRUE,
                default_exclusion_duration INTEGER,
                notify_on_exclusion_add BOOLEAN DEFAULT TRUE,
                notify_on_exclusion_remove BOOLEAN DEFAULT TRUE,
                default_portfolio_exclusion BOOLEAN DEFAULT TRUE,
                default_trading_exclusion BOOLEAN DEFAULT TRUE,
                default_watchlist_exclusion BOOLEAN DEFAULT FALSE,
                default_suggestion_exclusion BOOLEAN DEFAULT TRUE,
                auto_exclude_poor_performers BOOLEAN DEFAULT FALSE,
                poor_performance_threshold REAL DEFAULT -20.0,
                performance_evaluation_period INTEGER DEFAULT 90,
                allow_bulk_operations BOOLEAN DEFAULT TRUE,
                max_bulk_operation_size INTEGER DEFAULT 1000,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(userId)
            )
        """)
        
        cursor.execute("""
            SELECT * FROM ExclusionSettings WHERE userId = %s
        """, (user_id,))
        
        result = cursor.fetchone()
        
        if not result:
            # Create default settings
            cursor.execute("""
                INSERT INTO ExclusionSettings (userId) VALUES (%s)
            """, (user_id,))
            conn.commit()
            
            # Fetch the default settings
            cursor.execute("""
                SELECT * FROM ExclusionSettings WHERE userId = %s
            """, (user_id,))
            result = cursor.fetchone()
        
        columns = [description[0] for description in cursor.description]
        settings = dict(zip(columns, result))
        
        conn.close()
        
        # Format response
        return {
            "enableAutomaticExclusions": bool(settings['enable_automatic_exclusions']),
            "enableTemporaryExclusions": bool(settings['enable_temporary_exclusions']),
            "defaultExclusionDuration": settings['default_exclusion_duration'],
            "notifyOnExclusionAdd": bool(settings['notify_on_exclusion_add']),
            "notifyOnExclusionRemove": bool(settings['notify_on_exclusion_remove']),
            "defaultPortfolioExclusion": bool(settings['default_portfolio_exclusion']),
            "defaultTradingExclusion": bool(settings['default_trading_exclusion']),
            "defaultWatchlistExclusion": bool(settings['default_watchlist_exclusion']),
            "defaultSuggestionExclusion": bool(settings['default_suggestion_exclusion']),
            "autoExcludePoorPerformers": bool(settings['auto_exclude_poor_performers']),
            "poorPerformanceThreshold": settings['poor_performance_threshold'],
            "performanceEvaluationPeriod": settings['performance_evaluation_period'],
            "allowBulkOperations": bool(settings['allow_bulk_operations']),
            "maxBulkOperationSize": settings['max_bulk_operation_size']
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/asset-exclusion-panel/settings")
async def update_exclusion_settings(
    settings: Dict[str, Any] = Body(...),
    user_id: int = 1
):
    """Update user exclusion settings"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Update settings
        cursor.execute("""
            UPDATE ExclusionSettings 
            SET enable_automatic_exclusions = %s,
                enable_temporary_exclusions = %s,
                default_exclusion_duration = %s,
                notify_on_exclusion_add = %s,
                notify_on_exclusion_remove = %s,
                default_portfolio_exclusion = %s,
                default_trading_exclusion = %s,
                default_watchlist_exclusion = %s,
                default_suggestion_exclusion = %s,
                auto_exclude_poor_performers = %s,
                poor_performance_threshold = %s,
                performance_evaluation_period = %s,
                allow_bulk_operations = %s,
                max_bulk_operation_size = %s,
                updated_at = CURRENT_TIMESTAMP
            WHERE userId = %s
        """, (
            settings.get("enableAutomaticExclusions", False),
            settings.get("enableTemporaryExclusions", True),
            settings.get("defaultExclusionDuration"),
            settings.get("notifyOnExclusionAdd", True),
            settings.get("notifyOnExclusionRemove", True),
            settings.get("defaultPortfolioExclusion", True),
            settings.get("defaultTradingExclusion", True),
            settings.get("defaultWatchlistExclusion", False),
            settings.get("defaultSuggestionExclusion", True),
            settings.get("autoExcludePoorPerformers", False),
            settings.get("poorPerformanceThreshold", -20.0),
            settings.get("performanceEvaluationPeriod", 90),
            settings.get("allowBulkOperations", True),
            settings.get("maxBulkOperationSize", 1000),
            user_id
        ))
        
        conn.commit()
        conn.close()
        
        await log_to_agent_memory(
            user_id,
            "exclusion_settings_updated",
            "Updated exclusion settings",
            json.dumps(settings),
            "Settings updated successfully",
            {"settingsChanged": len(settings)}
        )
        
        return {
            "success": True,
            "message": "Exclusion settings updated successfully"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Export/Import functionality
@router.get("/asset-exclusion-panel/export")
async def export_exclusions(user_id: int = 1):
    """Export all exclusion data"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get all exclusions
        cursor.execute("""
            SELECT * FROM IndividualAssetExclusions 
            WHERE userId = %s AND is_active = TRUE
        """, (user_id,))
        
        exclusions = cursor.fetchall()
        exclusion_columns = [description[0] for description in cursor.description]
        
        # Get all filters
        cursor.execute("""
            SELECT * FROM CriteriaExclusionFilters 
            WHERE userId = %s AND is_active = TRUE
        """, (user_id,))
        
        filters = cursor.fetchall()
        filter_columns = [description[0] for description in cursor.description]
        
        conn.close()
        
        # Format export data
        export_data = {
            "exclusions": [dict(zip(exclusion_columns, exclusion)) for exclusion in exclusions],
            "filters": [dict(zip(filter_columns, filter_data)) for filter_data in filters],
            "exportedAt": datetime.now().isoformat(),
            "version": "1.0"
        }
        
        await log_to_agent_memory(
            user_id,
            "exclusions_exported",
            "Exported all exclusion data",
            json.dumps({"userId": user_id}),
            f"Exported {len(exclusions)} exclusions and {len(filters)} filters",
            {"exclusionCount": len(exclusions), "filterCount": len(filters)}
        )
        
        return export_data
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))              