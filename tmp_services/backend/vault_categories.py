from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel, validator
from typing import Optional, List, Dict, Any
import json
from datetime import datetime, timedelta
import psycopg2
from psycopg2.extras import RealDictCursor
import os
from decimal import Decimal

router = APIRouter()

# Block 53: Vault Category Allocator - API Routes
# Asset categorization and allocation management

class VaultCategory(BaseModel):
    category_name: str
    category_code: str
    category_type: str  # asset_class, sector, geography, strategy, risk_level, custom
    category_description: Optional[str] = None
    category_color: str = "#3B82F6"
    category_icon: Optional[str] = None
    target_allocation_percent: float = 0
    min_allocation_percent: float = 0
    max_allocation_percent: float = 100
    rebalance_threshold: float = 5.0
    rebalance_frequency: str = "monthly"
    auto_rebalance_enabled: bool = True
    risk_level: str = "medium"
    max_single_position_percent: float = 10.0
    volatility_limit: float = 25.0
    tax_efficiency_priority: int = 5
    tax_loss_harvesting_enabled: bool = True
    is_active: bool = True
    display_order: int = 1
    
    @validator('category_type')
    def validate_category_type(cls, v):
        allowed_types = ['asset_class', 'sector', 'geography', 'strategy', 'risk_level', 'custom']
        if v not in allowed_types:
            raise ValueError(f'Category type must be one of: {", ".join(allowed_types)}')
        return v

class AssetCategoryAssignment(BaseModel):
    category_id: str
    symbol: str
    asset_name: Optional[str] = None
    asset_class: Optional[str] = None
    sector: Optional[str] = None
    market: str = "NZX"
    assignment_type: str = "manual"
    assignment_rule: Optional[str] = None
    assignment_confidence: float = 1.0
    target_weight_in_category: float = 0
    is_active: bool = True

class AllocationSnapshot(BaseModel):
    category_id: str
    target_allocation: float
    actual_allocation: float
    portfolio_value: float
    snapshot_type: str = "manual"

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
            "block_53",
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

@router.get("/vault/categories/{user_id}")
async def get_vault_categories(user_id: int, category_type: Optional[str] = Query(None), active_only: bool = Query(True)):
    """Get vault categories for a user"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Create vault categories table if it doesn't exist
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS VaultCategories (
                id SERIAL PRIMARY KEY,
                userId INTEGER NOT NULL,
                category_name TEXT NOT NULL,
                category_code TEXT NOT NULL,
                category_type TEXT NOT NULL,
                category_description TEXT,
                category_color TEXT DEFAULT '#3B82F6',
                category_icon TEXT,
                target_allocation_percent REAL NOT NULL DEFAULT 0,
                min_allocation_percent REAL DEFAULT 0,
                max_allocation_percent REAL DEFAULT 100,
                rebalance_threshold REAL DEFAULT 5.0,
                rebalance_frequency TEXT DEFAULT 'monthly',
                auto_rebalance_enabled BOOLEAN DEFAULT 1,
                risk_level TEXT DEFAULT 'medium',
                max_single_position_percent REAL DEFAULT 10.0,
                volatility_limit REAL DEFAULT 25.0,
                tax_efficiency_priority INTEGER DEFAULT 5,
                tax_loss_harvesting_enabled BOOLEAN DEFAULT 1,
                is_active BOOLEAN DEFAULT 1,
                display_order INTEGER DEFAULT 1,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(userId, category_code)
            )
        """)
        
        # Build query with filters
        query = "SELECT * FROM VaultCategories WHERE userId = %s"
        params = [user_id]
        
        if category_type:
            query += " AND category_type = %s"
            params.append(category_type)
        
        if active_only:
            query += " AND is_active = 1"
        
        query += " ORDER BY display_order, category_name"
        
        cursor.execute(query, params)
        
        columns = [description[0] for description in cursor.description]
        categories = []
        
        for row in cursor.fetchall():
            category_data = dict(zip(columns, row))
            categories.append(category_data)
        
        # If no categories exist, create defaults
        if not categories:
            await create_default_categories(user_id)
            # Rerun query
            cursor.execute(query, params)
            for row in cursor.fetchall():
                category_data = dict(zip(columns, row))
                categories.append(category_data)
        
        conn.close()
        
        await log_to_agent_memory(
            user_id,
            "vault_categories_retrieved",
            f"Retrieved {len(categories)} vault categories",
            json.dumps({"category_type": category_type, "active_only": active_only}),
            f"Found {len(categories)} categories",
            {"count": len(categories), "category_type": category_type}
        )
        
        return {
            "categories": categories,
            "count": len(categories),
            "user_id": user_id,
            "filters": {
                "category_type": category_type,
                "active_only": active_only
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

async def create_default_categories(user_id: int):
    """Create default vault categories for a new user"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        default_categories = [
            {
                "name": "NZ Equities", "code": "NZ_EQUITIES", "type": "asset_class", 
                "target": 40.0, "color": "#00A651", "order": 1
            },
            {
                "name": "AU Equities", "code": "AU_EQUITIES", "type": "asset_class", 
                "target": 30.0, "color": "#FFB81C", "order": 2
            },
            {
                "name": "International Equities", "code": "INTL_EQUITIES", "type": "asset_class", 
                "target": 20.0, "color": "#0066CC", "order": 3
            },
            {
                "name": "Bonds & Fixed Income", "code": "BONDS", "type": "asset_class", 
                "target": 8.0, "color": "#800080", "order": 4
            },
            {
                "name": "Cash & Cash Equivalents", "code": "CASH", "type": "asset_class", 
                "target": 2.0, "color": "#808080", "order": 5
            },
            {
                "name": "Technology", "code": "TECH", "type": "sector", 
                "target": 15.0, "color": "#FF6B35", "order": 10
            },
            {
                "name": "Healthcare", "code": "HEALTH", "type": "sector", 
                "target": 12.0, "color": "#00B4D8", "order": 11
            },
            {
                "name": "Financial Services", "code": "FINANCE", "type": "sector", 
                "target": 18.0, "color": "#8B5CF6", "order": 12
            }
        ]
        
        for cat in default_categories:
            cursor.execute("""
                INSERT OR IGNORE INTO VaultCategories 
                (userId, category_name, category_code, category_type, target_allocation_percent, 
                 category_color, display_order)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """, (
                user_id, cat["name"], cat["code"], cat["type"], 
                cat["target"], cat["color"], cat["order"]
            ))
        
        conn.commit()
        conn.close()
        
    except Exception as e:
        print(f"Failed to create default categories: {e}")

@router.post("/vault/categories/{user_id}")
async def create_vault_category(user_id: int, category: VaultCategory):
    """Create a new vault category"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO VaultCategories 
            (userId, category_name, category_code, category_type, category_description,
             category_color, category_icon, target_allocation_percent, min_allocation_percent,
             max_allocation_percent, rebalance_threshold, rebalance_frequency, 
             auto_rebalance_enabled, risk_level, max_single_position_percent,
             volatility_limit, tax_efficiency_priority, tax_loss_harvesting_enabled,
             is_active, display_order)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            user_id,
            category.category_name,
            category.category_code,
            category.category_type,
            category.category_description,
            category.category_color,
            category.category_icon,
            category.target_allocation_percent,
            category.min_allocation_percent,
            category.max_allocation_percent,
            category.rebalance_threshold,
            category.rebalance_frequency,
            category.auto_rebalance_enabled,
            category.risk_level,
            category.max_single_position_percent,
            category.volatility_limit,
            category.tax_efficiency_priority,
            category.tax_loss_harvesting_enabled,
            category.is_active,
            category.display_order
        ))
        
        category_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        await log_to_agent_memory(
            user_id,
            "vault_category_created",
            f"Created vault category '{category.category_name}'",
            category.json(),
            f"Category created with ID {category_id}",
            {
                "category_id": category_id,
                "category_name": category.category_name,
                "category_type": category.category_type,
                "target_allocation": category.target_allocation_percent
            }
        )
        
        return {
            "success": True,
            "category_id": category_id,
            "message": f"Vault category '{category.category_name}' created successfully"
        }
        
    except Exception as e:
        if "UNIQUE constraint failed" in str(e):
            raise HTTPException(status_code=400, detail="Category code already exists for this user")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/vault/categories/{user_id}/{category_id}")
async def update_vault_category(user_id: int, category_id: int, category: VaultCategory):
    """Update a vault category"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            UPDATE VaultCategories 
            SET category_name = %s, category_code = %s, category_type = %s, 
                category_description = %s, category_color = %s, category_icon = %s,
                target_allocation_percent = %s, min_allocation_percent = %s,
                max_allocation_percent = %s, rebalance_threshold = %s,
                rebalance_frequency = %s, auto_rebalance_enabled = %s,
                risk_level = %s, max_single_position_percent = %s,
                volatility_limit = %s, tax_efficiency_priority = %s,
                tax_loss_harvesting_enabled = %s, is_active = %s,
                display_order = %s, updated_at = %s
            WHERE id = %s AND userId = %s
        """, (
            category.category_name,
            category.category_code,
            category.category_type,
            category.category_description,
            category.category_color,
            category.category_icon,
            category.target_allocation_percent,
            category.min_allocation_percent,
            category.max_allocation_percent,
            category.rebalance_threshold,
            category.rebalance_frequency,
            category.auto_rebalance_enabled,
            category.risk_level,
            category.max_single_position_percent,
            category.volatility_limit,
            category.tax_efficiency_priority,
            category.tax_loss_harvesting_enabled,
            category.is_active,
            category.display_order,
            datetime.now().isoformat(),
            category_id,
            user_id
        ))
        
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Category not found")
        
        conn.commit()
        conn.close()
        
        await log_to_agent_memory(
            user_id,
            "vault_category_updated",
            f"Updated vault category '{category.category_name}'",
            category.json(),
            f"Category {category_id} updated successfully",
            {
                "category_id": category_id,
                "category_name": category.category_name,
                "target_allocation": category.target_allocation_percent
            }
        )
        
        return {
            "success": True,
            "message": f"Vault category '{category.category_name}' updated successfully"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/vault/assignments/{user_id}")
async def assign_asset_to_category(user_id: int, assignment: AssetCategoryAssignment):
    """Assign an asset to a category"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Create asset assignments table if it doesn't exist
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS AssetCategoryAssignments (
                id SERIAL PRIMARY KEY,
                userId INTEGER NOT NULL,
                categoryId INTEGER NOT NULL,
                symbol TEXT NOT NULL,
                asset_name TEXT,
                asset_class TEXT,
                sector TEXT,
                market TEXT DEFAULT 'NZX',
                assignment_type TEXT DEFAULT 'manual',
                assignment_rule TEXT,
                assignment_confidence REAL DEFAULT 1.0,
                target_weight_in_category REAL DEFAULT 0,
                actual_weight_in_category REAL DEFAULT 0,
                is_active BOOLEAN DEFAULT 1,
                last_reviewed_at TEXT,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(userId, categoryId, symbol)
            )
        """)
        
        cursor.execute("""
            INSERT INTO AssetCategoryAssignments 
            (userId, categoryId, symbol, asset_name, asset_class, sector, market,
             assignment_type, assignment_rule, assignment_confidence, 
             target_weight_in_category, is_active)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            user_id,
            int(assignment.category_id),
            assignment.symbol,
            assignment.asset_name,
            assignment.asset_class,
            assignment.sector,
            assignment.market,
            assignment.assignment_type,
            assignment.assignment_rule,
            assignment.assignment_confidence,
            assignment.target_weight_in_category,
            assignment.is_active
        ))
        
        assignment_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        await log_to_agent_memory(
            user_id,
            "asset_assigned_to_category",
            f"Assigned {assignment.symbol} to category",
            assignment.json(),
            f"Assignment created with ID {assignment_id}",
            {
                "assignment_id": assignment_id,
                "symbol": assignment.symbol,
                "category_id": assignment.category_id,
                "assignment_type": assignment.assignment_type
            }
        )
        
        return {
            "success": True,
            "assignment_id": assignment_id,
            "message": f"Asset {assignment.symbol} assigned to category successfully"
        }
        
    except Exception as e:
        if "UNIQUE constraint failed" in str(e):
            raise HTTPException(status_code=400, detail="Asset already assigned to this category")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/vault/assignments/{user_id}")
async def get_asset_assignments(
    user_id: int,
    category_id: Optional[int] = Query(None),
    symbol: Optional[str] = Query(None),
    active_only: bool = Query(True)
):
    """Get asset category assignments"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Build query with filters
        query = """
            SELECT a.*, c.category_name, c.category_type, c.category_color
            FROM AssetCategoryAssignments a
            LEFT JOIN VaultCategories c ON a.categoryId = c.id
            WHERE a.userId = %s
        """
        params = [user_id]
        
        if category_id:
            query += " AND a.categoryId = %s"
            params.append(category_id)
        
        if symbol:
            query += " AND a.symbol = %s"
            params.append(symbol)
        
        if active_only:
            query += " AND a.is_active = 1"
        
        query += " ORDER BY c.category_name, a.symbol"
        
        cursor.execute(query, params)
        
        columns = [description[0] for description in cursor.description]
        assignments = []
        
        for row in cursor.fetchall():
            assignment_data = dict(zip(columns, row))
            assignments.append(assignment_data)
        
        conn.close()
        
        return {
            "assignments": assignments,
            "count": len(assignments),
            "user_id": user_id,
            "filters": {
                "category_id": category_id,
                "symbol": symbol,
                "active_only": active_only
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/vault/auto-assign/{user_id}")
async def auto_assign_assets(user_id: int, assets: List[Dict[str, Any]]):
    """Auto-assign assets to categories based on rules"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        assigned_count = 0
        assignments = []
        
        for asset in assets:
            symbol = asset.get('symbol')
            asset_class = asset.get('asset_class', '')
            sector = asset.get('sector', '')
            
            if not symbol:
                continue
            
            # Find best matching category
            cursor.execute("""
                SELECT id, category_name, category_type
                FROM VaultCategories
                WHERE userId = %s AND is_active = 1
                AND (
                    (category_type = 'asset_class' AND UPPER(category_name) LIKE '%' || UPPER(%s) || '%') OR
                    (category_type = 'sector' AND UPPER(category_name) LIKE '%' || UPPER(%s) || '%')
                )
                ORDER BY 
                    CASE 
                        WHEN category_type = 'asset_class' THEN 1
                        WHEN category_type = 'sector' THEN 2
                        ELSE 3
                    END
                LIMIT 1
            """, (user_id, asset_class, sector))
            
            result = cursor.fetchone()
            
            if result:
                category_id, category_name, category_type = result
                
                # Create assignment
                try:
                    cursor.execute("""
                        INSERT OR IGNORE INTO AssetCategoryAssignments 
                        (userId, categoryId, symbol, asset_class, sector, 
                         assignment_type, assignment_confidence)
                        VALUES (%s, %s, %s, %s, %s, 'automatic', 0.8)
                    """, (user_id, category_id, symbol, asset_class, sector))
                    
                    if cursor.rowcount > 0:
                        assigned_count += 1
                        assignments.append({
                            "symbol": symbol,
                            "category_id": category_id,
                            "category_name": category_name,
                            "category_type": category_type,
                            "confidence": 0.8
                        })
                        
                except Exception as e:
                    print(f"Failed to assign {symbol}: {e}")
        
        conn.commit()
        conn.close()
        
        await log_to_agent_memory(
            user_id,
            "assets_auto_assigned",
            f"Auto-assigned {assigned_count} assets to categories",
            json.dumps({"total_assets": len(assets)}),
            f"Successfully assigned {assigned_count} assets",
            {
                "assigned_count": assigned_count,
                "total_assets": len(assets),
                "success_rate": assigned_count / len(assets) if assets else 0
            }
        )
        
        return {
            "success": True,
            "assigned_count": assigned_count,
            "total_assets": len(assets),
            "assignments": assignments,
            "message": f"Auto-assigned {assigned_count} out of {len(assets)} assets"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/vault/allocation-summary/{user_id}")
async def get_allocation_summary(user_id: int):
    """Get allocation summary across all categories"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get category allocation summary
        cursor.execute("""
            SELECT 
                c.id,
                c.category_name,
                c.category_type,
                c.category_color,
                c.target_allocation_percent,
                c.min_allocation_percent,
                c.max_allocation_percent,
                COUNT(a.symbol) as asset_count,
                SUM(a.target_weight_in_category) as total_target_weight
            FROM VaultCategories c
            LEFT JOIN AssetCategoryAssignments a ON c.id = a.categoryId AND a.is_active = 1
            WHERE c.userId = %s AND c.is_active = 1
            GROUP BY c.id, c.category_name, c.category_type, c.category_color,
                     c.target_allocation_percent, c.min_allocation_percent, c.max_allocation_percent
            ORDER BY c.display_order, c.category_name
        """, (user_id,))
        
        columns = [description[0] for description in cursor.description]
        categories = []
        total_target_allocation = 0
        
        for row in cursor.fetchall():
            category_data = dict(zip(columns, row))
            categories.append(category_data)
            total_target_allocation += category_data['target_allocation_percent']
        
        # Calculate allocation balance
        allocation_balance = {
            "total_target_allocation": total_target_allocation,
            "is_balanced": abs(total_target_allocation - 100) <= 1.0,
            "allocation_gap": 100 - total_target_allocation,
            "requires_rebalancing": abs(total_target_allocation - 100) > 5.0
        }
        
        conn.close()
        
        return {
            "categories": categories,
            "allocation_balance": allocation_balance,
            "user_id": user_id,
            "summary": {
                "total_categories": len(categories),
                "total_assets": sum(cat['asset_count'] for cat in categories),
                "avg_allocation_per_category": total_target_allocation / len(categories) if categories else 0
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 
from pydantic import BaseModel, validator
from typing import Optional, List, Dict, Any
import json
from datetime import datetime, timedelta
import psycopg2
from psycopg2.extras import RealDictCursor
import os
from decimal import Decimal

router = APIRouter()

# Block 53: Vault Category Allocator - API Routes
# Asset categorization and allocation management

class VaultCategory(BaseModel):
    category_name: str
    category_code: str
    category_type: str  # asset_class, sector, geography, strategy, risk_level, custom
    category_description: Optional[str] = None
    category_color: str = "#3B82F6"
    category_icon: Optional[str] = None
    target_allocation_percent: float = 0
    min_allocation_percent: float = 0
    max_allocation_percent: float = 100
    rebalance_threshold: float = 5.0
    rebalance_frequency: str = "monthly"
    auto_rebalance_enabled: bool = True
    risk_level: str = "medium"
    max_single_position_percent: float = 10.0
    volatility_limit: float = 25.0
    tax_efficiency_priority: int = 5
    tax_loss_harvesting_enabled: bool = True
    is_active: bool = True
    display_order: int = 1
    
    @validator('category_type')
    def validate_category_type(cls, v):
        allowed_types = ['asset_class', 'sector', 'geography', 'strategy', 'risk_level', 'custom']
        if v not in allowed_types:
            raise ValueError(f'Category type must be one of: {", ".join(allowed_types)}')
        return v

class AssetCategoryAssignment(BaseModel):
    category_id: str
    symbol: str
    asset_name: Optional[str] = None
    asset_class: Optional[str] = None
    sector: Optional[str] = None
    market: str = "NZX"
    assignment_type: str = "manual"
    assignment_rule: Optional[str] = None
    assignment_confidence: float = 1.0
    target_weight_in_category: float = 0
    is_active: bool = True

class AllocationSnapshot(BaseModel):
    category_id: str
    target_allocation: float
    actual_allocation: float
    portfolio_value: float
    snapshot_type: str = "manual"

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
            "block_53",
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

@router.get("/vault/categories/{user_id}")
async def get_vault_categories(user_id: int, category_type: Optional[str] = Query(None), active_only: bool = Query(True)):
    """Get vault categories for a user"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Create vault categories table if it doesn't exist
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS VaultCategories (
                id SERIAL PRIMARY KEY,
                userId INTEGER NOT NULL,
                category_name TEXT NOT NULL,
                category_code TEXT NOT NULL,
                category_type TEXT NOT NULL,
                category_description TEXT,
                category_color TEXT DEFAULT '#3B82F6',
                category_icon TEXT,
                target_allocation_percent REAL NOT NULL DEFAULT 0,
                min_allocation_percent REAL DEFAULT 0,
                max_allocation_percent REAL DEFAULT 100,
                rebalance_threshold REAL DEFAULT 5.0,
                rebalance_frequency TEXT DEFAULT 'monthly',
                auto_rebalance_enabled BOOLEAN DEFAULT 1,
                risk_level TEXT DEFAULT 'medium',
                max_single_position_percent REAL DEFAULT 10.0,
                volatility_limit REAL DEFAULT 25.0,
                tax_efficiency_priority INTEGER DEFAULT 5,
                tax_loss_harvesting_enabled BOOLEAN DEFAULT 1,
                is_active BOOLEAN DEFAULT 1,
                display_order INTEGER DEFAULT 1,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(userId, category_code)
            )
        """)
        
        # Build query with filters
        query = "SELECT * FROM VaultCategories WHERE userId = %s"
        params = [user_id]
        
        if category_type:
            query += " AND category_type = %s"
            params.append(category_type)
        
        if active_only:
            query += " AND is_active = 1"
        
        query += " ORDER BY display_order, category_name"
        
        cursor.execute(query, params)
        
        columns = [description[0] for description in cursor.description]
        categories = []
        
        for row in cursor.fetchall():
            category_data = dict(zip(columns, row))
            categories.append(category_data)
        
        # If no categories exist, create defaults
        if not categories:
            await create_default_categories(user_id)
            # Rerun query
            cursor.execute(query, params)
            for row in cursor.fetchall():
                category_data = dict(zip(columns, row))
                categories.append(category_data)
        
        conn.close()
        
        await log_to_agent_memory(
            user_id,
            "vault_categories_retrieved",
            f"Retrieved {len(categories)} vault categories",
            json.dumps({"category_type": category_type, "active_only": active_only}),
            f"Found {len(categories)} categories",
            {"count": len(categories), "category_type": category_type}
        )
        
        return {
            "categories": categories,
            "count": len(categories),
            "user_id": user_id,
            "filters": {
                "category_type": category_type,
                "active_only": active_only
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

async def create_default_categories(user_id: int):
    """Create default vault categories for a new user"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        default_categories = [
            {
                "name": "NZ Equities", "code": "NZ_EQUITIES", "type": "asset_class", 
                "target": 40.0, "color": "#00A651", "order": 1
            },
            {
                "name": "AU Equities", "code": "AU_EQUITIES", "type": "asset_class", 
                "target": 30.0, "color": "#FFB81C", "order": 2
            },
            {
                "name": "International Equities", "code": "INTL_EQUITIES", "type": "asset_class", 
                "target": 20.0, "color": "#0066CC", "order": 3
            },
            {
                "name": "Bonds & Fixed Income", "code": "BONDS", "type": "asset_class", 
                "target": 8.0, "color": "#800080", "order": 4
            },
            {
                "name": "Cash & Cash Equivalents", "code": "CASH", "type": "asset_class", 
                "target": 2.0, "color": "#808080", "order": 5
            },
            {
                "name": "Technology", "code": "TECH", "type": "sector", 
                "target": 15.0, "color": "#FF6B35", "order": 10
            },
            {
                "name": "Healthcare", "code": "HEALTH", "type": "sector", 
                "target": 12.0, "color": "#00B4D8", "order": 11
            },
            {
                "name": "Financial Services", "code": "FINANCE", "type": "sector", 
                "target": 18.0, "color": "#8B5CF6", "order": 12
            }
        ]
        
        for cat in default_categories:
            cursor.execute("""
                INSERT OR IGNORE INTO VaultCategories 
                (userId, category_name, category_code, category_type, target_allocation_percent, 
                 category_color, display_order)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """, (
                user_id, cat["name"], cat["code"], cat["type"], 
                cat["target"], cat["color"], cat["order"]
            ))
        
        conn.commit()
        conn.close()
        
    except Exception as e:
        print(f"Failed to create default categories: {e}")

@router.post("/vault/categories/{user_id}")
async def create_vault_category(user_id: int, category: VaultCategory):
    """Create a new vault category"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO VaultCategories 
            (userId, category_name, category_code, category_type, category_description,
             category_color, category_icon, target_allocation_percent, min_allocation_percent,
             max_allocation_percent, rebalance_threshold, rebalance_frequency, 
             auto_rebalance_enabled, risk_level, max_single_position_percent,
             volatility_limit, tax_efficiency_priority, tax_loss_harvesting_enabled,
             is_active, display_order)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            user_id,
            category.category_name,
            category.category_code,
            category.category_type,
            category.category_description,
            category.category_color,
            category.category_icon,
            category.target_allocation_percent,
            category.min_allocation_percent,
            category.max_allocation_percent,
            category.rebalance_threshold,
            category.rebalance_frequency,
            category.auto_rebalance_enabled,
            category.risk_level,
            category.max_single_position_percent,
            category.volatility_limit,
            category.tax_efficiency_priority,
            category.tax_loss_harvesting_enabled,
            category.is_active,
            category.display_order
        ))
        
        category_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        await log_to_agent_memory(
            user_id,
            "vault_category_created",
            f"Created vault category '{category.category_name}'",
            category.json(),
            f"Category created with ID {category_id}",
            {
                "category_id": category_id,
                "category_name": category.category_name,
                "category_type": category.category_type,
                "target_allocation": category.target_allocation_percent
            }
        )
        
        return {
            "success": True,
            "category_id": category_id,
            "message": f"Vault category '{category.category_name}' created successfully"
        }
        
    except Exception as e:
        if "UNIQUE constraint failed" in str(e):
            raise HTTPException(status_code=400, detail="Category code already exists for this user")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/vault/categories/{user_id}/{category_id}")
async def update_vault_category(user_id: int, category_id: int, category: VaultCategory):
    """Update a vault category"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            UPDATE VaultCategories 
            SET category_name = %s, category_code = %s, category_type = %s, 
                category_description = %s, category_color = %s, category_icon = %s,
                target_allocation_percent = %s, min_allocation_percent = %s,
                max_allocation_percent = %s, rebalance_threshold = %s,
                rebalance_frequency = %s, auto_rebalance_enabled = %s,
                risk_level = %s, max_single_position_percent = %s,
                volatility_limit = %s, tax_efficiency_priority = %s,
                tax_loss_harvesting_enabled = %s, is_active = %s,
                display_order = %s, updated_at = %s
            WHERE id = %s AND userId = %s
        """, (
            category.category_name,
            category.category_code,
            category.category_type,
            category.category_description,
            category.category_color,
            category.category_icon,
            category.target_allocation_percent,
            category.min_allocation_percent,
            category.max_allocation_percent,
            category.rebalance_threshold,
            category.rebalance_frequency,
            category.auto_rebalance_enabled,
            category.risk_level,
            category.max_single_position_percent,
            category.volatility_limit,
            category.tax_efficiency_priority,
            category.tax_loss_harvesting_enabled,
            category.is_active,
            category.display_order,
            datetime.now().isoformat(),
            category_id,
            user_id
        ))
        
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Category not found")
        
        conn.commit()
        conn.close()
        
        await log_to_agent_memory(
            user_id,
            "vault_category_updated",
            f"Updated vault category '{category.category_name}'",
            category.json(),
            f"Category {category_id} updated successfully",
            {
                "category_id": category_id,
                "category_name": category.category_name,
                "target_allocation": category.target_allocation_percent
            }
        )
        
        return {
            "success": True,
            "message": f"Vault category '{category.category_name}' updated successfully"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/vault/assignments/{user_id}")
async def assign_asset_to_category(user_id: int, assignment: AssetCategoryAssignment):
    """Assign an asset to a category"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Create asset assignments table if it doesn't exist
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS AssetCategoryAssignments (
                id SERIAL PRIMARY KEY,
                userId INTEGER NOT NULL,
                categoryId INTEGER NOT NULL,
                symbol TEXT NOT NULL,
                asset_name TEXT,
                asset_class TEXT,
                sector TEXT,
                market TEXT DEFAULT 'NZX',
                assignment_type TEXT DEFAULT 'manual',
                assignment_rule TEXT,
                assignment_confidence REAL DEFAULT 1.0,
                target_weight_in_category REAL DEFAULT 0,
                actual_weight_in_category REAL DEFAULT 0,
                is_active BOOLEAN DEFAULT 1,
                last_reviewed_at TEXT,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(userId, categoryId, symbol)
            )
        """)
        
        cursor.execute("""
            INSERT INTO AssetCategoryAssignments 
            (userId, categoryId, symbol, asset_name, asset_class, sector, market,
             assignment_type, assignment_rule, assignment_confidence, 
             target_weight_in_category, is_active)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            user_id,
            int(assignment.category_id),
            assignment.symbol,
            assignment.asset_name,
            assignment.asset_class,
            assignment.sector,
            assignment.market,
            assignment.assignment_type,
            assignment.assignment_rule,
            assignment.assignment_confidence,
            assignment.target_weight_in_category,
            assignment.is_active
        ))
        
        assignment_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        await log_to_agent_memory(
            user_id,
            "asset_assigned_to_category",
            f"Assigned {assignment.symbol} to category",
            assignment.json(),
            f"Assignment created with ID {assignment_id}",
            {
                "assignment_id": assignment_id,
                "symbol": assignment.symbol,
                "category_id": assignment.category_id,
                "assignment_type": assignment.assignment_type
            }
        )
        
        return {
            "success": True,
            "assignment_id": assignment_id,
            "message": f"Asset {assignment.symbol} assigned to category successfully"
        }
        
    except Exception as e:
        if "UNIQUE constraint failed" in str(e):
            raise HTTPException(status_code=400, detail="Asset already assigned to this category")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/vault/assignments/{user_id}")
async def get_asset_assignments(
    user_id: int,
    category_id: Optional[int] = Query(None),
    symbol: Optional[str] = Query(None),
    active_only: bool = Query(True)
):
    """Get asset category assignments"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Build query with filters
        query = """
            SELECT a.*, c.category_name, c.category_type, c.category_color
            FROM AssetCategoryAssignments a
            LEFT JOIN VaultCategories c ON a.categoryId = c.id
            WHERE a.userId = %s
        """
        params = [user_id]
        
        if category_id:
            query += " AND a.categoryId = %s"
            params.append(category_id)
        
        if symbol:
            query += " AND a.symbol = %s"
            params.append(symbol)
        
        if active_only:
            query += " AND a.is_active = 1"
        
        query += " ORDER BY c.category_name, a.symbol"
        
        cursor.execute(query, params)
        
        columns = [description[0] for description in cursor.description]
        assignments = []
        
        for row in cursor.fetchall():
            assignment_data = dict(zip(columns, row))
            assignments.append(assignment_data)
        
        conn.close()
        
        return {
            "assignments": assignments,
            "count": len(assignments),
            "user_id": user_id,
            "filters": {
                "category_id": category_id,
                "symbol": symbol,
                "active_only": active_only
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/vault/auto-assign/{user_id}")
async def auto_assign_assets(user_id: int, assets: List[Dict[str, Any]]):
    """Auto-assign assets to categories based on rules"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        assigned_count = 0
        assignments = []
        
        for asset in assets:
            symbol = asset.get('symbol')
            asset_class = asset.get('asset_class', '')
            sector = asset.get('sector', '')
            
            if not symbol:
                continue
            
            # Find best matching category
            cursor.execute("""
                SELECT id, category_name, category_type
                FROM VaultCategories
                WHERE userId = %s AND is_active = 1
                AND (
                    (category_type = 'asset_class' AND UPPER(category_name) LIKE '%' || UPPER(%s) || '%') OR
                    (category_type = 'sector' AND UPPER(category_name) LIKE '%' || UPPER(%s) || '%')
                )
                ORDER BY 
                    CASE 
                        WHEN category_type = 'asset_class' THEN 1
                        WHEN category_type = 'sector' THEN 2
                        ELSE 3
                    END
                LIMIT 1
            """, (user_id, asset_class, sector))
            
            result = cursor.fetchone()
            
            if result:
                category_id, category_name, category_type = result
                
                # Create assignment
                try:
                    cursor.execute("""
                        INSERT OR IGNORE INTO AssetCategoryAssignments 
                        (userId, categoryId, symbol, asset_class, sector, 
                         assignment_type, assignment_confidence)
                        VALUES (%s, %s, %s, %s, %s, 'automatic', 0.8)
                    """, (user_id, category_id, symbol, asset_class, sector))
                    
                    if cursor.rowcount > 0:
                        assigned_count += 1
                        assignments.append({
                            "symbol": symbol,
                            "category_id": category_id,
                            "category_name": category_name,
                            "category_type": category_type,
                            "confidence": 0.8
                        })
                        
                except Exception as e:
                    print(f"Failed to assign {symbol}: {e}")
        
        conn.commit()
        conn.close()
        
        await log_to_agent_memory(
            user_id,
            "assets_auto_assigned",
            f"Auto-assigned {assigned_count} assets to categories",
            json.dumps({"total_assets": len(assets)}),
            f"Successfully assigned {assigned_count} assets",
            {
                "assigned_count": assigned_count,
                "total_assets": len(assets),
                "success_rate": assigned_count / len(assets) if assets else 0
            }
        )
        
        return {
            "success": True,
            "assigned_count": assigned_count,
            "total_assets": len(assets),
            "assignments": assignments,
            "message": f"Auto-assigned {assigned_count} out of {len(assets)} assets"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/vault/allocation-summary/{user_id}")
async def get_allocation_summary(user_id: int):
    """Get allocation summary across all categories"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get category allocation summary
        cursor.execute("""
            SELECT 
                c.id,
                c.category_name,
                c.category_type,
                c.category_color,
                c.target_allocation_percent,
                c.min_allocation_percent,
                c.max_allocation_percent,
                COUNT(a.symbol) as asset_count,
                SUM(a.target_weight_in_category) as total_target_weight
            FROM VaultCategories c
            LEFT JOIN AssetCategoryAssignments a ON c.id = a.categoryId AND a.is_active = 1
            WHERE c.userId = %s AND c.is_active = 1
            GROUP BY c.id, c.category_name, c.category_type, c.category_color,
                     c.target_allocation_percent, c.min_allocation_percent, c.max_allocation_percent
            ORDER BY c.display_order, c.category_name
        """, (user_id,))
        
        columns = [description[0] for description in cursor.description]
        categories = []
        total_target_allocation = 0
        
        for row in cursor.fetchall():
            category_data = dict(zip(columns, row))
            categories.append(category_data)
            total_target_allocation += category_data['target_allocation_percent']
        
        # Calculate allocation balance
        allocation_balance = {
            "total_target_allocation": total_target_allocation,
            "is_balanced": abs(total_target_allocation - 100) <= 1.0,
            "allocation_gap": 100 - total_target_allocation,
            "requires_rebalancing": abs(total_target_allocation - 100) > 5.0
        }
        
        conn.close()
        
        return {
            "categories": categories,
            "allocation_balance": allocation_balance,
            "user_id": user_id,
            "summary": {
                "total_categories": len(categories),
                "total_assets": sum(cat['asset_count'] for cat in categories),
                "avg_allocation_per_category": total_target_allocation / len(categories) if categories else 0
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))                