from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from pydantic import BaseModel, validator
from typing import Optional, List, Dict, Any
import pandas as pd
import json
from datetime import datetime
from decimal import Decimal
import sqlite3
import os
from pathlib import Path

router = APIRouter()

# Block 1: Portfolio Loader API
# Handles CSV import, broker sync, and portfolio position management

class PortfolioPosition(BaseModel):
    symbol: str
    name: Optional[str] = None
    quantity: float
    avgPrice: float
    currentPrice: Optional[float] = None
    assetClass: str  # equity, crypto, fund, bond, cash
    account: str
    currency: str = "USD"
    syncSource: str  # csv, ibkr, kucoin, kraken, manual
    
    @validator('quantity', 'avgPrice')
    def must_be_positive(cls, v):
        if v <= 0:
            raise ValueError('must be positive')
        return v
    
    @validator('assetClass')
    def valid_asset_class(cls, v):
        valid_classes = ['equity', 'crypto', 'fund', 'bond', 'cash']
        if v not in valid_classes:
            raise ValueError(f'must be one of {valid_classes}')
        return v
    
    @validator('syncSource')
    def valid_sync_source(cls, v):
        valid_sources = ['csv', 'ibkr', 'kucoin', 'kraken', 'manual']
        if v not in valid_sources:
            raise ValueError(f'must be one of {valid_sources}')
        return v

class CSVImportRequest(BaseModel):
    csvData: str
    fieldMapping: Dict[str, str]
    userId: int

class ManualPositionRequest(BaseModel):
    userId: int
    position: PortfolioPosition

# Database connection
def get_db_connection():
    db_path = Path(__file__).parent.parent.parent / "dev.db"
    return sqlite3.connect(str(db_path))

# Log to Agent Memory Table
async def log_to_agent_memory(
    user_id: int,
    action: str,
    context: Optional[str] = None,
    user_input: Optional[str] = None,
    agent_response: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None
):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO AgentMemory (userId, blockId, action, context, userInput, agentResponse, metadata, timestamp)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            user_id,
            "1",  # Block 1 - Portfolio Loader
            action,
            context,
            user_input,
            agent_response,
            json.dumps(metadata) if metadata else None,
            datetime.now().isoformat()
        ))
        
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"Failed to log to Agent Memory: {e}")

# Log portfolio sync operation
async def log_portfolio_sync(
    user_id: int,
    sync_source: str,
    status: str,  # success, error, partial
    records_imported: int,
    error_message: Optional[str] = None,
    filename: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None
):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO PortfolioSyncLog 
            (userId, syncSource, status, recordsImported, errorMessage, filename, syncStarted, syncCompleted, metadata)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            user_id,
            sync_source,
            status,
            records_imported,
            error_message,
            filename,
            datetime.now().isoformat(),
            datetime.now().isoformat(),
            json.dumps(metadata) if metadata else None
        ))
        
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"Failed to log portfolio sync: {e}")

# Parse Sharesies CSV format
def parse_sharesies_csv(csv_data: str, field_mapping: Dict[str, str]) -> tuple[List[PortfolioPosition], List[str]]:
    try:
        # Parse CSV using pandas
        from io import StringIO
        df = pd.read_csv(StringIO(csv_data))
        
        positions = []
        errors = []
        
        for index, row in df.iterrows():
            try:
                # Map CSV fields to our schema using field mapping
                position_data = {
                    'symbol': row.get(field_mapping.get('symbol', 'Symbol'), row.get('Symbol', '')),
                    'name': row.get(field_mapping.get('name', 'Company'), row.get('Company', '')),
                    'quantity': float(row.get(field_mapping.get('quantity', 'Shares'), row.get('Shares', 0))),
                    'avgPrice': float(row.get(field_mapping.get('avgPrice', 'Average Price'), row.get('Average Price', 0))),
                    'currentPrice': float(row.get(field_mapping.get('currentPrice', 'Current Price'), row.get('Current Price', 0))) or None,
                    'assetClass': 'equity',  # Sharesies is primarily equities
                    'account': 'Sharesies',
                    'currency': row.get(field_mapping.get('currency', 'Currency'), row.get('Currency', 'NZD')),
                    'syncSource': 'csv',
                }
                
                # Validate the position
                position = PortfolioPosition(**position_data)
                positions.append(position)
                
            except Exception as e:
                errors.append(f"Row {index + 1}: {str(e)}")
        
        return positions, errors
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"CSV parsing error: {str(e)}")

# Get user's portfolio positions
async def get_portfolio_positions(user_id: int) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT * FROM PortfolioPosition 
        WHERE userId = ? 
        ORDER BY lastUpdated DESC
    """, (user_id,))
    
    columns = [description[0] for description in cursor.description]
    positions = [dict(zip(columns, row)) for row in cursor.fetchall()]
    
    conn.close()
    return positions

# Save or update portfolio positions
async def save_portfolio_positions(user_id: int, positions: List[PortfolioPosition]) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    results = []
    
    for position in positions:
        try:
            # Check if position already exists
            cursor.execute("""
                SELECT id FROM PortfolioPosition 
                WHERE userId = ? AND symbol = ? AND account = ?
            """, (user_id, position.symbol, position.account))
            
            existing = cursor.fetchone()
            
            if existing:
                # Update existing position
                cursor.execute("""
                    UPDATE PortfolioPosition 
                    SET name = ?, quantity = ?, avgPrice = ?, currentPrice = ?, 
                        assetClass = ?, currency = ?, syncSource = ?, lastUpdated = ?
                    WHERE id = ?
                """, (
                    position.name, position.quantity, position.avgPrice, position.currentPrice,
                    position.assetClass, position.currency, position.syncSource, 
                    datetime.now().isoformat(), existing[0]
                ))
                results.append({"action": "updated", "symbol": position.symbol})
            else:
                # Create new position
                cursor.execute("""
                    INSERT INTO PortfolioPosition 
                    (userId, symbol, name, quantity, avgPrice, currentPrice, assetClass, 
                     account, currency, syncSource, lastUpdated, createdAt)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    user_id, position.symbol, position.name, position.quantity, position.avgPrice,
                    position.currentPrice, position.assetClass, position.account, position.currency,
                    position.syncSource, datetime.now().isoformat(), datetime.now().isoformat()
                ))
                results.append({"action": "created", "symbol": position.symbol})
                
        except Exception as e:
            results.append({
                "action": "error",
                "symbol": position.symbol,
                "error": str(e)
            })
    
    conn.commit()
    conn.close()
    return results

@router.get("/portfolio/loader/{user_id}")
async def get_user_portfolio(user_id: int):
    """Get user's portfolio positions"""
    try:
        positions = await get_portfolio_positions(user_id)
        
        await log_to_agent_memory(
            user_id,
            "portfolio_positions_retrieved",
            "User retrieved portfolio positions",
            None,
            f"Retrieved {len(positions)} positions",
            {"positionCount": len(positions)}
        )
        
        return {"positions": positions}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/portfolio/loader/csv")
async def import_csv_portfolio(request: CSVImportRequest):
    """Handle CSV portfolio import"""
    try:
        positions, errors = parse_sharesies_csv(request.csvData, request.fieldMapping)
        
        if not positions:
            await log_portfolio_sync(
                request.userId,
                "csv",
                "error",
                0,
                "No valid positions found in CSV",
                None,
                {"errors": errors}
            )
            
            raise HTTPException(
                status_code=400, 
                detail={"error": "No valid positions found in CSV", "errors": errors}
            )
        
        results = await save_portfolio_positions(request.userId, positions)
        success_count = len([r for r in results if r["action"] != "error"])
        error_count = len([r for r in results if r["action"] == "error"])
        
        status = "success" if error_count == 0 else ("partial" if success_count > 0 else "error")
        
        await log_portfolio_sync(
            request.userId,
            "csv",
            status,
            success_count,
            f"{error_count} positions failed to import" if error_count > 0 else None,
            None,
            {
                "totalPositions": len(positions),
                "successCount": success_count,
                "errorCount": error_count,
                "errors": errors if errors else None
            }
        )
        
        await log_to_agent_memory(
            request.userId,
            "csv_import_completed",
            "User completed CSV portfolio import",
            f"CSV with {len(positions)} positions",
            f"Imported {success_count} positions successfully, {error_count} failed",
            {"successCount": success_count, "errorCount": error_count, "totalPositions": len(positions)}
        )
        
        return {
            "success": True,
            "message": f"Imported {success_count} positions successfully",
            "results": results,
            "errors": errors if errors else None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        error_message = str(e)
        
        await log_portfolio_sync(
            request.userId,
            "csv",
            "error",
            0,
            error_message
        )
        
        await log_to_agent_memory(
            request.userId,
            "csv_import_failed",
            "CSV portfolio import failed",
            request.csvData[:200] + "...",
            error_message,
            {"error": error_message}
        )
        
        raise HTTPException(status_code=400, detail=error_message)

@router.post("/portfolio/loader/manual")
async def add_manual_position(request: ManualPositionRequest):
    """Add a manual portfolio position"""
    try:
        results = await save_portfolio_positions(request.userId, [request.position])
        
        await log_to_agent_memory(
            request.userId,
            "manual_position_added",
            "User manually added a portfolio position",
            request.position.json(),
            json.dumps(results[0]),
            {"symbol": request.position.symbol, "account": request.position.account}
        )
        
        return {"success": True, "results": results}
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/portfolio/loader/{position_id}")
async def update_position(position_id: int, updates: Dict[str, Any]):
    """Update an existing portfolio position"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get current position
        cursor.execute("SELECT * FROM PortfolioPosition WHERE id = ?", (position_id,))
        position = cursor.fetchone()
        
        if not position:
            raise HTTPException(status_code=404, detail="Position not found")
        
        # Build update query
        update_fields = []
        update_values = []
        
        for field, value in updates.items():
            if field in ['symbol', 'name', 'quantity', 'avgPrice', 'currentPrice', 'assetClass', 'currency']:
                update_fields.append(f"{field} = ?")
                update_values.append(value)
        
        if update_fields:
            update_fields.append("lastUpdated = ?")
            update_values.append(datetime.now().isoformat())
            update_values.append(position_id)
            
            query = f"UPDATE PortfolioPosition SET {', '.join(update_fields)} WHERE id = ?"
            cursor.execute(query, update_values)
            conn.commit()
        
        # Get updated position
        cursor.execute("SELECT * FROM PortfolioPosition WHERE id = ?", (position_id,))
        updated = cursor.fetchone()
        columns = [description[0] for description in cursor.description]
        updated_position = dict(zip(columns, updated))
        
        conn.close()
        
        await log_to_agent_memory(
            updated_position['userId'],
            "position_updated",
            "User updated a portfolio position",
            json.dumps(updates),
            json.dumps(updated_position),
            {"positionId": position_id, "symbol": updated_position['symbol']}
        )
        
        return {"success": True, "position": updated_position}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/portfolio/loader/{position_id}")
async def delete_position(position_id: int):
    """Delete a portfolio position"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Get position before deleting
        cursor.execute("SELECT * FROM PortfolioPosition WHERE id = ?", (position_id,))
        position = cursor.fetchone()
        
        if not position:
            raise HTTPException(status_code=404, detail="Position not found")
        
        columns = [description[0] for description in cursor.description]
        position_dict = dict(zip(columns, position))
        
        # Delete position
        cursor.execute("DELETE FROM PortfolioPosition WHERE id = ?", (position_id,))
        conn.commit()
        conn.close()
        
        await log_to_agent_memory(
            position_dict['userId'],
            "position_deleted",
            "User deleted a portfolio position",
            None,
            f"Deleted {position_dict['symbol']} position",
            {"symbol": position_dict['symbol'], "account": position_dict['account']}
        )
        
        return {"success": True, "message": "Position deleted"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Get last sync status for UI display
@router.get("/portfolio/loader/sync-status/{user_id}")
async def get_sync_status(user_id: int):
    """Get the last sync status for a user"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT * FROM PortfolioSyncLog 
            WHERE userId = ? 
            ORDER BY syncStarted DESC 
            LIMIT 1
        """, (user_id,))
        
        sync_log = cursor.fetchone()
        
        if sync_log:
            columns = [description[0] for description in cursor.description]
            sync_status = dict(zip(columns, sync_log))
        else:
            sync_status = None
        
        conn.close()
        
        return {"syncStatus": sync_status}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 