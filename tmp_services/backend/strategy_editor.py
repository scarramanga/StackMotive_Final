from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, validator
from typing import Optional, List, Dict, Any
import json
from datetime import datetime
import sqlite3
from pathlib import Path

router = APIRouter()

# Block 5: Strategy Editor Interface
# Allows users to edit assigned strategies with asset class weighting, rebalance frequency, etc.

class StrategyEdit(BaseModel):
    strategyId: int
    userId: int
    assetClassWeights: Dict[str, float]  # {"equity": 60.0, "crypto": 15.0, etc.}
    rebalanceFrequency: str  # daily, weekly, monthly, quarterly
    riskTolerance: str  # conservative, moderate, aggressive
    excludedAssets: List[str]  # ["TSLA", "GME"] - assets to exclude
    notes: Optional[str] = None
    
    @validator('assetClassWeights')
    def validate_weights(cls, v):
        total = sum(v.values())
        if not (95.0 <= total <= 105.0):  # Allow 5% tolerance
            raise ValueError('Asset class weights must sum to approximately 100%')
        return v

class StrategyAssignment(BaseModel):
    id: int
    userId: int
    positionId: Optional[int] = None
    strategyName: str
    confidence: float
    metadata: Optional[str] = None
    assignedAt: str
    
# Database connection
def get_db_connection():
    db_path = Path(__file__).parent.parent.parent / "prisma" / "dev.db"
    print(f"Database path: {db_path}")
    print(f"Database exists: {db_path.exists()}")
    if not db_path.exists():
        # Create the database file if it doesn't exist
        db_path.parent.mkdir(parents=True, exist_ok=True)
        db_path.touch()
    return sqlite3.connect(str(db_path))

# Agent Memory logging
async def log_to_agent_memory(user_id: int, action_type: str, action_summary: str, input_data: str, output_data: str, metadata: Dict[str, Any]):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS AgentMemory (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                userId INTEGER NOT NULL,
                blockId TEXT NOT NULL,
                action TEXT NOT NULL,
                context TEXT,
                userInput TEXT,
                agentResponse TEXT,
                metadata TEXT,
                timestamp TEXT NOT NULL,
                sessionId TEXT
            )
        """)
        
        cursor.execute("""
            INSERT INTO AgentMemory 
            (userId, blockId, action, context, userInput, agentResponse, metadata, timestamp, sessionId)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            user_id,
            "block_5",
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

@router.get("/strategy/assignments/{user_id}")
async def get_user_strategy_assignments(user_id: int):
    """Get all strategy assignments for a user"""
    print(f"DEBUG: STARTING function for user {user_id}")
    
    try:
        print(f"DEBUG: About to get database connection")
        conn = get_db_connection()
        print(f"DEBUG: Got database connection successfully")
        cursor = conn.cursor()
        
        print(f"DEBUG: Connected to database successfully for user {user_id}")
        
        # Check if the table exists first
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='StrategyAssignment'")
        table_exists = cursor.fetchone()
        print(f"DEBUG: StrategyAssignment table exists: {table_exists is not None}")
        
        # Create PortfolioPosition table first if it doesn't exist
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS PortfolioPosition (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                userId INTEGER NOT NULL,
                symbol TEXT NOT NULL,
                name TEXT,
                assetClass TEXT,
                quantity REAL NOT NULL DEFAULT 0,
                averagePrice REAL NOT NULL DEFAULT 0,
                currentPrice REAL NOT NULL DEFAULT 0,
                totalValue REAL NOT NULL DEFAULT 0,
                targetAllocation REAL DEFAULT 0,
                actualAllocation REAL DEFAULT 0,
                createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Create StrategyAssignment table if it doesn't exist
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS StrategyAssignment (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                userId INTEGER NOT NULL,
                positionId INTEGER,
                strategyName TEXT NOT NULL,
                confidence REAL NOT NULL,
                metadata TEXT,
                assignedAt TEXT NOT NULL,
                createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Commit the table creation
        conn.commit()
        
        print(f"DEBUG: Tables created successfully for user {user_id}")
        
        # Check if user has any strategy assignments
        print(f"DEBUG: About to query StrategyAssignment table for user {user_id}")
        cursor.execute("""
            SELECT COUNT(*) FROM StrategyAssignment WHERE userId = ?
        """, (user_id,))
        
        assignment_count = cursor.fetchone()[0]
        print(f"DEBUG: Found {assignment_count} existing assignments for user {user_id}")
        
        # If no assignments exist, create default ones
        if assignment_count == 0:
            print(f"DEBUG: Creating default strategies for user {user_id}")
            default_strategies = [
                {
                    "strategyName": "Balanced Growth",
                    "confidence": 0.85,
                    "metadata": json.dumps({
                        "assetClassWeights": {"equity": 60.0, "bonds": 30.0, "crypto": 10.0},
                        "riskTolerance": "moderate",
                        "rebalanceFrequency": "monthly"
                    })
                },
                {
                    "strategyName": "Conservative Income",
                    "confidence": 0.72,
                    "metadata": json.dumps({
                        "assetClassWeights": {"equity": 40.0, "bonds": 50.0, "cash": 10.0},
                        "riskTolerance": "conservative",
                        "rebalanceFrequency": "quarterly"
                    })
                }
            ]
            
            for strategy in default_strategies:
                cursor.execute("""
                    INSERT INTO StrategyAssignment 
                    (userId, strategyName, confidence, metadata, assignedAt)
                    VALUES (?, ?, ?, ?, ?)
                """, (
                    user_id,
                    strategy["strategyName"],
                    strategy["confidence"],
                    strategy["metadata"],
                    datetime.now().isoformat()
                ))
            
            # Commit the default strategy insertions
            conn.commit()
            print(f"DEBUG: Created {len(default_strategies)} default strategies for user {user_id}")
        
        # Now fetch all assignments with safe LEFT JOIN
        print(f"DEBUG: Fetching all assignments for user {user_id}")
        cursor.execute("""
            SELECT 
                sa.id,
                sa.userId,
                sa.positionId,
                sa.strategyName,
                sa.confidence,
                sa.metadata,
                sa.assignedAt,
                sa.createdAt,
                COALESCE(pp.symbol, 'N/A') as symbol,
                COALESCE(pp.name, 'Portfolio') as positionName,
                COALESCE(pp.assetClass, 'Mixed') as assetClass
            FROM StrategyAssignment sa
            LEFT JOIN PortfolioPosition pp ON sa.positionId = pp.id
            WHERE sa.userId = ?
            ORDER BY sa.assignedAt DESC
        """, (user_id,))
        
        columns = [description[0] for description in cursor.description]
        assignments = [dict(zip(columns, row)) for row in cursor.fetchall()]
        
        print(f"DEBUG: Retrieved {len(assignments)} assignments")
        
        # Parse metadata JSON for each assignment
        for assignment in assignments:
            try:
                if assignment['metadata']:
                    assignment['metadata'] = json.loads(assignment['metadata'])
            except (json.JSONDecodeError, TypeError):
                assignment['metadata'] = {}
        
        conn.close()
        
        await log_to_agent_memory(
            user_id,
            "strategy_assignments_retrieved",
            f"Retrieved {len(assignments)} strategy assignments",
            json.dumps({"user_id": user_id}),
            json.dumps({"assignments_count": len(assignments)}),
            {"assignmentCount": len(assignments)}
        )
        
        return {
            "assignments": assignments,
            "total": len(assignments),
            "user_id": user_id
        }
        
    except sqlite3.Error as e:
        print(f"DEBUG: Database error in strategy assignments: {e}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    except Exception as e:
        print(f"DEBUG: Unexpected error in strategy assignments: {e}")
        print(f"DEBUG: Error type: {type(e)}")
        import traceback
        print(f"DEBUG: Full traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.post("/strategy/edit/{strategy_id}")
async def edit_strategy(strategy_id: int, edit_data: StrategyEdit):
    """Edit a strategy assignment with new parameters"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Create StrategyEdits table to track changes
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS StrategyEdit (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                strategyAssignmentId INTEGER NOT NULL,
                userId INTEGER NOT NULL,
                assetClassWeights TEXT NOT NULL,
                rebalanceFrequency TEXT NOT NULL,
                riskTolerance TEXT NOT NULL,
                excludedAssets TEXT,
                notes TEXT,
                editedAt TEXT NOT NULL,
                version INTEGER NOT NULL DEFAULT 1,
                FOREIGN KEY (strategyAssignmentId) REFERENCES StrategyAssignment (id),
                FOREIGN KEY (userId) REFERENCES User (id)
            )
        """)
        
        # Check if strategy exists and belongs to user
        cursor.execute("""
            SELECT * FROM StrategyAssignment 
            WHERE id = ? AND userId = ?
        """, (strategy_id, edit_data.userId))
        
        strategy = cursor.fetchone()
        if not strategy:
            raise HTTPException(status_code=404, detail="Strategy not found or access denied")
        
        # Get current version number
        cursor.execute("""
            SELECT MAX(version) FROM StrategyEdit 
            WHERE strategyAssignmentId = ?
        """, (strategy_id,))
        
        max_version = cursor.fetchone()[0] or 0
        new_version = max_version + 1
        
        # Save the edit
        cursor.execute("""
            INSERT INTO StrategyEdit 
            (strategyAssignmentId, userId, assetClassWeights, rebalanceFrequency, 
             riskTolerance, excludedAssets, notes, editedAt, version)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            strategy_id,
            edit_data.userId,
            json.dumps(edit_data.assetClassWeights),
            edit_data.rebalanceFrequency,
            edit_data.riskTolerance,
            json.dumps(edit_data.excludedAssets),
            edit_data.notes,
            datetime.now().isoformat(),
            new_version
        ))
        
        # Update the strategy assignment metadata
        updated_metadata = {
            "lastEdited": datetime.now().isoformat(),
            "version": new_version,
            "customWeights": edit_data.assetClassWeights,
            "rebalanceFrequency": edit_data.rebalanceFrequency,
            "riskTolerance": edit_data.riskTolerance,
            "excludedAssets": edit_data.excludedAssets
        }
        
        cursor.execute("""
            UPDATE StrategyAssignment 
            SET metadata = ? 
            WHERE id = ?
        """, (json.dumps(updated_metadata), strategy_id))
        
        conn.commit()
        conn.close()
        
        await log_to_agent_memory(
            edit_data.userId,
            "strategy_edited",
            f"Strategy {strategy_id} edited to version {new_version}",
            edit_data.json(),
            f"Strategy updated with new weights and parameters",
            {
                "strategyId": strategy_id,
                "version": new_version,
                "rebalanceFrequency": edit_data.rebalanceFrequency,
                "riskTolerance": edit_data.riskTolerance,
                "weightCount": len(edit_data.assetClassWeights),
                "excludedAssetCount": len(edit_data.excludedAssets)
            }
        )
        
        return {
            "success": True,
            "message": f"Strategy updated to version {new_version}",
            "strategyId": strategy_id,
            "version": new_version
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/strategy/edit/history/{strategy_id}")
async def get_strategy_edit_history(strategy_id: int):
    """Get edit history for a strategy"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT * FROM StrategyEdit 
            WHERE strategyAssignmentId = ? 
            ORDER BY version DESC
        """, (strategy_id,))
        
        columns = [description[0] for description in cursor.description]
        edits = [dict(zip(columns, row)) for row in cursor.fetchall()]
        
        # Parse JSON fields
        for edit in edits:
            edit['assetClassWeights'] = json.loads(edit['assetClassWeights'])
            edit['excludedAssets'] = json.loads(edit['excludedAssets'] or '[]')
        
        conn.close()
        
        return {"edits": edits}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/strategy/validate")
async def validate_strategy_parameters(edit_data: StrategyEdit):
    """Validate strategy parameters before saving"""
    try:
        # Validate asset class weights
        total_weight = sum(edit_data.assetClassWeights.values())
        if not (95.0 <= total_weight <= 105.0):
            return {
                "valid": False,
                "errors": [f"Asset class weights sum to {total_weight:.1f}%, must be approximately 100%"]
            }
        
        # Validate rebalance frequency
        valid_frequencies = ["daily", "weekly", "monthly", "quarterly", "annually"]
        if edit_data.rebalanceFrequency not in valid_frequencies:
            return {
                "valid": False,
                "errors": [f"Invalid rebalance frequency. Must be one of: {', '.join(valid_frequencies)}"]
            }
        
        # Validate risk tolerance
        valid_risk_levels = ["conservative", "moderate", "aggressive"]
        if edit_data.riskTolerance not in valid_risk_levels:
            return {
                "valid": False,
                "errors": [f"Invalid risk tolerance. Must be one of: {', '.join(valid_risk_levels)}"]
            }
        
        return {
            "valid": True,
            "message": "Strategy parameters are valid"
        }
        
    except Exception as e:
        return {
            "valid": False,
            "errors": [str(e)]
        }

@router.get("/strategy/debug/{user_id}")
async def debug_strategy_assignments(user_id: int):
    """Debug endpoint to test database connection and table access"""
    try:
        print(f"DEBUG: Starting debug endpoint for user {user_id}")
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        print(f"DEBUG: Database connection established")
        
        # Test basic table listing
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = cursor.fetchall()
        print(f"DEBUG: Available tables: {[table[0] for table in tables]}")
        
        # Try to create the table explicitly
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS StrategyAssignment (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                userId INTEGER NOT NULL,
                positionId INTEGER,
                strategyName TEXT NOT NULL,
                confidence REAL NOT NULL,
                metadata TEXT,
                assignedAt TEXT NOT NULL,
                createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.commit()
        print(f"DEBUG: Table creation completed")
        
        # Test if table exists now
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='StrategyAssignment'")
        table_check = cursor.fetchone()
        print(f"DEBUG: StrategyAssignment table exists after creation: {table_check is not None}")
        
        # Try a simple select
        cursor.execute("SELECT COUNT(*) FROM StrategyAssignment")
        count = cursor.fetchone()[0]
        print(f"DEBUG: Row count in StrategyAssignment: {count}")
        
        conn.close()
        
        return {
            "status": "success",
            "user_id": user_id,
            "tables": [table[0] for table in tables],
            "strategy_table_exists": table_check is not None,
            "row_count": count
        }
        
    except Exception as e:
        print(f"DEBUG: Error in debug endpoint: {e}")
        return {
            "status": "error",
            "error": str(e),
            "user_id": user_id
        } 