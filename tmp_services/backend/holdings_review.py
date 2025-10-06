from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import json
from datetime import datetime
import psycopg2
from psycopg2.extras import RealDictCursor
import os

router = APIRouter()

# Block 7: Holdings Review Panel
# Show sortable table of all loaded holdings with tagging and filtering

class HoldingTag(BaseModel):
    userId: int
    positionId: int
    tag: str  # "core", "speculative", "dividend", "growth", etc.

class HoldingFilter(BaseModel):
    assetClass: Optional[str] = None
    tags: Optional[List[str]] = None
    minValue: Optional[float] = None
    maxValue: Optional[float] = None
    sortBy: str = "symbol"  # symbol, name, assetClass, quantity, value, pnl
    sortOrder: str = "asc"  # asc, desc

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
            "block_7",
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

@router.get("/holdings/all/{user_id}")
async def get_all_holdings(user_id: int, filter_params: Optional[HoldingFilter] = None):
    """Get all holdings for a user with sorting and filtering"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Create HoldingTags table if it doesn't exist
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS HoldingTag (
                id SERIAL PRIMARY KEY,
                userId INTEGER NOT NULL,
                positionId INTEGER NOT NULL,
                tag TEXT NOT NULL,
                createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (userId) REFERENCES User (id),
                FOREIGN KEY (positionId) REFERENCES PortfolioPosition (id),
                UNIQUE(userId, positionId, tag)
            )
        """)
        
        # Build query with filters
        base_query = """
            SELECT 
                pp.*,
                (pp.quantity * pp.currentPrice) as marketValue,
                ((pp.currentPrice - pp.avgPrice) / pp.avgPrice * 100) as pnlPercentage,
                (pp.quantity * (pp.currentPrice - pp.avgPrice)) as pnlAmount,
                GROUP_CONCAT(ht.tag) as tags
            FROM PortfolioPosition pp
            LEFT JOIN HoldingTag ht ON pp.id = ht.positionId
            WHERE pp.userId = %s
        """
        
        params = [user_id]
        
        # Add filters if provided
        if filter_params:
            if filter_params.assetClass:
                base_query += " AND pp.assetClass = %s"
                params.append(filter_params.assetClass)
            
            if filter_params.minValue:
                base_query += " AND (pp.quantity * pp.currentPrice) >= %s"
                params.append(filter_params.minValue)
            
            if filter_params.maxValue:
                base_query += " AND (pp.quantity * pp.currentPrice) <= %s"
                params.append(filter_params.maxValue)
        
        base_query += " GROUP BY pp.id"
        
        # Add sorting
        if filter_params and filter_params.sortBy:
            sort_column = filter_params.sortBy
            sort_order = filter_params.sortOrder.upper()
            
            # Map sort columns to actual column names
            sort_mapping = {
                "symbol": "pp.symbol",
                "name": "pp.name",
                "assetClass": "pp.assetClass",
                "quantity": "pp.quantity",
                "value": "marketValue",
                "pnl": "pnlAmount"
            }
            
            if sort_column in sort_mapping:
                base_query += f" ORDER BY {sort_mapping[sort_column]} {sort_order}"
            else:
                base_query += " ORDER BY pp.symbol ASC"
        else:
            base_query += " ORDER BY pp.symbol ASC"
        
        cursor.execute(base_query, params)
        
        columns = [description[0] for description in cursor.description]
        holdings = [dict(zip(columns, row)) for row in cursor.fetchall()]
        
        # Process tags and calculate additional metrics
        for holding in holdings:
            holding['tags'] = holding['tags'].split(',') if holding['tags'] else []
            
            # Filter by tags if specified
            if filter_params and filter_params.tags:
                if not any(tag in holding['tags'] for tag in filter_params.tags):
                    holdings.remove(holding)
                    continue
        
        # Calculate portfolio totals
        total_value = sum(h['marketValue'] for h in holdings)
        total_pnl = sum(h['pnlAmount'] for h in holdings)
        
        # Add allocation percentages
        for holding in holdings:
            holding['allocationPercentage'] = (holding['marketValue'] / total_value * 100) if total_value > 0 else 0
        
        conn.close()
        
        await log_to_agent_memory(
            user_id,
            "holdings_retrieved",
            f"Retrieved {len(holdings)} holdings",
            json.dumps(filter_params.dict() if filter_params else {}),
            f"Found {len(holdings)} holdings with total value ${total_value:.2f}",
            {
                "holdingCount": len(holdings),
                "totalValue": total_value,
                "totalPnL": total_pnl,
                "filters": filter_params.dict() if filter_params else None
            }
        )
        
        return {
            "holdings": holdings,
            "summary": {
                "totalValue": total_value,
                "totalPnL": total_pnl,
                "totalPnLPercentage": (total_pnl / (total_value - total_pnl) * 100) if (total_value - total_pnl) > 0 else 0,
                "holdingCount": len(holdings)
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/holdings/tag")
async def add_holding_tag(tag_data: HoldingTag):
    """Add a tag to a holding"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Check if position exists and belongs to user
        cursor.execute("""
            SELECT symbol, name FROM PortfolioPosition 
            WHERE id = %s AND userId = %s
        """, (tag_data.positionId, tag_data.userId))
        
        position = cursor.fetchone()
        if not position:
            raise HTTPException(status_code=404, detail="Position not found or access denied")
        
        # Add tag (ignore if already exists due to UNIQUE constraint)
        cursor.execute("""
            INSERT INTO HoldingTag (userId, positionId, tag)
            VALUES (%s, %s, %s)
            ON CONFLICT (userId, positionId, tag) DO NOTHING
        """, (tag_data.userId, tag_data.positionId, tag_data.tag))
        
        conn.commit()
        conn.close()
        
        await log_to_agent_memory(
            tag_data.userId,
            "holding_tagged",
            f"Added tag '{tag_data.tag}' to position {position[0]}",
            tag_data.json(),
            f"Tag '{tag_data.tag}' added successfully",
            {
                "positionId": tag_data.positionId,
                "symbol": position[0],
                "tag": tag_data.tag
            }
        )
        
        return {"success": True, "message": f"Tag '{tag_data.tag}' added to {position[0]}"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/holdings/tag/{user_id}/{position_id}/{tag}")
async def remove_holding_tag(user_id: int, position_id: int, tag: str):
    """Remove a tag from a holding"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get position info for logging
        cursor.execute("""
            SELECT symbol FROM PortfolioPosition 
            WHERE id = %s AND userId = %s
        """, (position_id, user_id))
        
        position = cursor.fetchone()
        if not position:
            raise HTTPException(status_code=404, detail="Position not found or access denied")
        
        # Remove tag
        cursor.execute("""
            DELETE FROM HoldingTag 
            WHERE userId = %s AND positionId = %s AND tag = %s
        """, (user_id, position_id, tag))
        
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Tag not found")
        
        conn.commit()
        conn.close()
        
        await log_to_agent_memory(
            user_id,
            "holding_tag_removed",
            f"Removed tag '{tag}' from position {position[0]}",
            f"user_id: {user_id}, position_id: {position_id}, tag: {tag}",
            f"Tag '{tag}' removed successfully",
            {
                "positionId": position_id,
                "symbol": position[0],
                "tag": tag
            }
        )
        
        return {"success": True, "message": f"Tag '{tag}' removed from {position[0]}"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/holdings/tags/{user_id}")
async def get_available_tags(user_id: int):
    """Get all unique tags used by a user"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT DISTINCT tag, COUNT(*) as usage_count
            FROM HoldingTag 
            WHERE userId = %s
            GROUP BY tag
            ORDER BY usage_count DESC, tag ASC
        """, (user_id,))
        
        tags = [{"tag": row[0], "count": row[1]} for row in cursor.fetchall()]
        
        conn.close()
        
        return {"tags": tags}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/holdings/analytics/{user_id}")
async def get_holdings_analytics(user_id: int):
    """Get analytics for holdings"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Asset class breakdown
        cursor.execute("""
            SELECT 
                assetClass,
                COUNT(*) as count,
                SUM(quantity * currentPrice) as totalValue,
                AVG((currentPrice - avgPrice) / avgPrice * 100) as avgPnLPercentage
            FROM PortfolioPosition 
            WHERE userId = %s
            GROUP BY assetClass
            ORDER BY totalValue DESC
        """, (user_id,))
        
        asset_breakdown = [
            {
                "assetClass": row[0],
                "count": row[1],
                "totalValue": row[2],
                "avgPnLPercentage": row[3]
            }
            for row in cursor.fetchall()
        ]
        
        # Top performers and losers
        cursor.execute("""
            SELECT 
                symbol, name, assetClass,
                ((currentPrice - avgPrice) / avgPrice * 100) as pnlPercentage,
                (quantity * (currentPrice - avgPrice)) as pnlAmount
            FROM PortfolioPosition 
            WHERE userId = %s
            ORDER BY pnlPercentage DESC
            LIMIT 5
        """, (user_id,))
        
        top_performers = [
            {
                "symbol": row[0],
                "name": row[1],
                "assetClass": row[2],
                "pnlPercentage": row[3],
                "pnlAmount": row[4]
            }
            for row in cursor.fetchall()
        ]
        
        cursor.execute("""
            SELECT 
                symbol, name, assetClass,
                ((currentPrice - avgPrice) / avgPrice * 100) as pnlPercentage,
                (quantity * (currentPrice - avgPrice)) as pnlAmount
            FROM PortfolioPosition 
            WHERE userId = %s
            ORDER BY pnlPercentage ASC
            LIMIT 5
        """, (user_id,))
        
        worst_performers = [
            {
                "symbol": row[0],
                "name": row[1],
                "assetClass": row[2],
                "pnlPercentage": row[3],
                "pnlAmount": row[4]
            }
            for row in cursor.fetchall()
        ]
        
        # Tag analysis
        cursor.execute("""
            SELECT 
                ht.tag,
                COUNT(*) as holdings_count,
                SUM(pp.quantity * pp.currentPrice) as total_value,
                AVG((pp.currentPrice - pp.avgPrice) / pp.avgPrice * 100) as avg_performance
            FROM HoldingTag ht
            JOIN PortfolioPosition pp ON ht.positionId = pp.id
            WHERE ht.userId = %s
            GROUP BY ht.tag
            ORDER BY total_value DESC
        """, (user_id,))
        
        tag_analytics = [
            {
                "tag": row[0],
                "holdingsCount": row[1],
                "totalValue": row[2],
                "avgPerformance": row[3]
            }
            for row in cursor.fetchall()
        ]
        
        conn.close()
        
        return {
            "assetBreakdown": asset_breakdown,
            "topPerformers": top_performers,
            "worstPerformers": worst_performers,
            "tagAnalytics": tag_analytics
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))            