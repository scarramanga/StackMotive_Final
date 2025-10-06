# Block 38: Tier Enforcement Wrapper - FULLY INTEGRATED ✅

from fastapi import APIRouter, HTTPException, Depends, Query, Body
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
import json
from datetime import datetime
import psycopg2
from psycopg2.extras import RealDictCursor
import os

router = APIRouter()

# Block 38: Tier Enforcement Wrapper - API Routes

class WrapperConfig(BaseModel):
    """Wrapper configuration schema"""
    wrapperName: str
    wrapperType: str
    targetIdentifier: str
    enforcementEnabled: bool = True
    strictMode: bool = False
    minimumTierLevel: int = 0
    requiredPermissions: List[str] = []
    onViolationAction: str = "block"
    fallbackComponent: Optional[str] = None
    redirectUrl: Optional[str] = None
    customMessage: Optional[str] = None

class AccessCheckRequest(BaseModel):
    """Access check request schema"""
    wrapperName: str
    targetIdentifier: str
    userTierLevel: int
    userPermissions: List[str] = []
    sessionId: Optional[str] = None
    requestPath: Optional[str] = None

class WrapperRule(BaseModel):
    """Wrapper rule schema"""
    ruleName: str
    ruleDescription: Optional[str] = None
    conditionType: str
    conditionConfig: Dict[str, Any]
    actionType: str
    actionConfig: Dict[str, Any] = {}
    appliesToWrappers: List[str] = []

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
            "block_38",
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

# Wrapper Configuration Management
@router.get("/tier-enforcement-wrapper/configs")
async def get_wrapper_configs(
    wrapper_type: Optional[str] = Query(None, description="Filter by wrapper type"),
    user_id: int = 1
):
    """Get wrapper configurations"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Create table if it doesn't exist
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS TierEnforcementWrapperConfig (
                id SERIAL PRIMARY KEY,
                userId INTEGER NOT NULL,
                wrapper_name TEXT NOT NULL,
                wrapper_type TEXT NOT NULL,
                target_identifier TEXT NOT NULL,
                enforcement_enabled BOOLEAN DEFAULT TRUE,
                strict_mode BOOLEAN DEFAULT FALSE,
                minimum_tier_level INTEGER DEFAULT 0,
                required_permissions TEXT DEFAULT '[]',
                on_violation_action TEXT DEFAULT 'block',
                fallback_component TEXT,
                redirect_url TEXT,
                custom_message TEXT,
                usage_count INTEGER DEFAULT 0,
                last_accessed TEXT,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(wrapper_name, target_identifier)
            )
        """)
        
        # Build query with optional filter
        where_clause = "WHERE userId = ?"
        params = [user_id]
        
        if wrapper_type:
            where_clause += " AND wrapper_type = %s"
            params.append(wrapper_type)
        
        cursor.execute(f"""
            SELECT * FROM TierEnforcementWrapperConfig 
            {where_clause}
            ORDER BY wrapper_name
        """, params)
        
        results = cursor.fetchall()
        columns = [description[0] for description in cursor.description]
        
        # Convert to list of dictionaries
        configs = []
        for row in results:
            data = dict(zip(columns, row))
            configs.append({
                "id": str(data['id']),
                "wrapperName": data['wrapper_name'],
                "wrapperType": data['wrapper_type'],
                "targetIdentifier": data['target_identifier'],
                "enforcementEnabled": bool(data['enforcement_enabled']),
                "strictMode": bool(data['strict_mode']),
                "minimumTierLevel": data['minimum_tier_level'],
                "requiredPermissions": json.loads(data['required_permissions']),
                "onViolationAction": data['on_violation_action'],
                "fallbackComponent": data['fallback_component'],
                "redirectUrl": data['redirect_url'],
                "customMessage": data['custom_message'],
                "usageCount": data['usage_count'],
                "lastAccessed": data['last_accessed'],
                "createdAt": data['created_at'],
                "updatedAt": data['updated_at']
            })
        
        conn.close()
        
        await log_to_agent_memory(
            user_id,
            "wrapper_configs_retrieved",
            f"Retrieved wrapper configurations",
            json.dumps({"wrapperType": wrapper_type}),
            f"Returned {len(configs)} configurations",
            {"configCount": len(configs), "wrapperType": wrapper_type}
        )
        
        return {
            "configs": configs,
            "totalCount": len(configs)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/tier-enforcement-wrapper/configs")
async def create_wrapper_config(
    config: WrapperConfig = Body(...),
    user_id: int = 1
):
    """Create wrapper configuration"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO TierEnforcementWrapperConfig 
            (userId, wrapper_name, wrapper_type, target_identifier, enforcement_enabled, 
             strict_mode, minimum_tier_level, required_permissions, on_violation_action,
             fallback_component, redirect_url, custom_message)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            user_id,
            config.wrapperName,
            config.wrapperType,
            config.targetIdentifier,
            config.enforcementEnabled,
            config.strictMode,
            config.minimumTierLevel,
            json.dumps(config.requiredPermissions),
            config.onViolationAction,
            config.fallbackComponent,
            config.redirectUrl,
            config.customMessage
        ))
        
        config_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        await log_to_agent_memory(
            user_id,
            "wrapper_config_created",
            f"Created wrapper config: {config.wrapperName}",
            json.dumps(config.dict()),
            f"Config ID: {config_id}",
            {"configId": config_id, "wrapperName": config.wrapperName}
        )
        
        return {
            "success": True,
            "message": "Wrapper configuration created successfully",
            "configId": str(config_id)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Access Control
@router.post("/tier-enforcement-wrapper/check-access")
async def check_access(
    request: AccessCheckRequest = Body(...),
    user_id: int = 1
):
    """Check access through tier enforcement wrapper"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        start_time = datetime.now()
        
        # Get wrapper configuration
        cursor.execute("""
            SELECT * FROM TierEnforcementWrapperConfig 
            WHERE wrapper_name = %s AND target_identifier = %s AND enforcement_enabled = TRUE
        """, (request.wrapperName, request.targetIdentifier))
        
        config_data = cursor.fetchone()
        
        if not config_data:
            # No configuration found, allow by default
            access_result = {
                "accessGranted": True,
                "violationReason": None,
                "actionTaken": "no_config",
                "fallbackComponent": None,
                "redirectUrl": None
            }
        else:
            columns = [description[0] for description in cursor.description]
            config = dict(zip(columns, config_data))
            
            # Check tier level
            if request.userTierLevel < config['minimum_tier_level']:
                access_result = {
                    "accessGranted": False,
                    "violationReason": f"Requires tier level {config['minimum_tier_level']} or higher",
                    "actionTaken": config['on_violation_action'],
                    "fallbackComponent": config['fallback_component'],
                    "redirectUrl": config['redirect_url']
                }
            else:
                # Check permissions
                required_permissions = json.loads(config['required_permissions'])
                if required_permissions and not all(perm in request.userPermissions for perm in required_permissions):
                    access_result = {
                        "accessGranted": False,
                        "violationReason": "Missing required permissions",
                        "actionTaken": config['on_violation_action'],
                        "fallbackComponent": config['fallback_component'],
                        "redirectUrl": config['redirect_url']
                    }
                else:
                    access_result = {
                        "accessGranted": True,
                        "violationReason": None,
                        "actionTaken": "allowed",
                        "fallbackComponent": None,
                        "redirectUrl": None
                    }
        
        # Calculate check duration
        check_duration = (datetime.now() - start_time).total_seconds() * 1000
        
        # Log access attempt
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS TierEnforcementWrapperInstances (
                id SERIAL PRIMARY KEY,
                wrapper_config_id INTEGER,
                userId INTEGER NOT NULL,
                instance_id TEXT NOT NULL,
                session_id TEXT,
                access_timestamp TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                user_tier_level INTEGER NOT NULL,
                user_permissions TEXT DEFAULT '[]',
                access_granted BOOLEAN NOT NULL,
                violation_reason TEXT,
                action_taken TEXT,
                request_path TEXT,
                check_duration_ms INTEGER,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        cursor.execute("""
            INSERT INTO TierEnforcementWrapperInstances 
            (wrapper_config_id, userId, instance_id, session_id, user_tier_level,
             user_permissions, access_granted, violation_reason, action_taken,
             request_path, check_duration_ms)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            config_data[0] if config_data else None,
            user_id,
            f"check_{datetime.now().timestamp()}",
            request.sessionId,
            request.userTierLevel,
            json.dumps(request.userPermissions),
            access_result["accessGranted"],
            access_result["violationReason"],
            access_result["actionTaken"],
            request.requestPath,
            int(check_duration)
        ))
        
        # Update usage count if config exists
        if config_data:
            cursor.execute("""
                UPDATE TierEnforcementWrapperConfig 
                SET usage_count = usage_count + 1, last_accessed = CURRENT_TIMESTAMP
                WHERE id = ?
            """, (config_data[0],))
        
        conn.commit()
        conn.close()
        
        await log_to_agent_memory(
            user_id,
            "access_check_performed",
            f"Access check for {request.wrapperName}",
            json.dumps(request.dict()),
            json.dumps(access_result),
            {
                "wrapperName": request.wrapperName,
                "accessGranted": access_result["accessGranted"],
                "checkDurationMs": int(check_duration)
            }
        )
        
        return {
            **access_result,
            "checkDurationMs": int(check_duration)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Rules Management
@router.get("/tier-enforcement-wrapper/rules")
async def get_wrapper_rules(user_id: int = 1):
    """Get wrapper rules"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Create table if it doesn't exist
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS TierEnforcementWrapperRules (
                id SERIAL PRIMARY KEY,
                userId INTEGER NOT NULL,
                rule_name TEXT NOT NULL,
                rule_description TEXT,
                rule_priority INTEGER DEFAULT 0,
                condition_type TEXT NOT NULL,
                condition_config TEXT NOT NULL,
                action_type TEXT NOT NULL,
                action_config TEXT DEFAULT '{}',
                applies_to_wrappers TEXT DEFAULT '[]',
                is_active BOOLEAN DEFAULT TRUE,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(rule_name)
            )
        """)
        
        cursor.execute("""
            SELECT * FROM TierEnforcementWrapperRules 
            WHERE userId = ? AND is_active = TRUE
            ORDER BY rule_priority DESC, rule_name
        """, (user_id,))
        
        results = cursor.fetchall()
        columns = [description[0] for description in cursor.description]
        
        # Convert to list of dictionaries
        rules = []
        for row in results:
            data = dict(zip(columns, row))
            rules.append({
                "id": str(data['id']),
                "ruleName": data['rule_name'],
                "ruleDescription": data['rule_description'],
                "rulePriority": data['rule_priority'],
                "conditionType": data['condition_type'],
                "conditionConfig": json.loads(data['condition_config']),
                "actionType": data['action_type'],
                "actionConfig": json.loads(data['action_config']),
                "appliesToWrappers": json.loads(data['applies_to_wrappers']),
                "isActive": bool(data['is_active']),
                "createdAt": data['created_at'],
                "updatedAt": data['updated_at']
            })
        
        conn.close()
        
        return {
            "rules": rules,
            "totalCount": len(rules)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/tier-enforcement-wrapper/rules")
async def create_wrapper_rule(
    rule: WrapperRule = Body(...),
    user_id: int = 1
):
    """Create wrapper rule"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO TierEnforcementWrapperRules 
            (userId, rule_name, rule_description, condition_type, condition_config,
             action_type, action_config, applies_to_wrappers)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            user_id,
            rule.ruleName,
            rule.ruleDescription,
            rule.conditionType,
            json.dumps(rule.conditionConfig),
            rule.actionType,
            json.dumps(rule.actionConfig),
            json.dumps(rule.appliesToWrappers)
        ))
        
        rule_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        await log_to_agent_memory(
            user_id,
            "wrapper_rule_created",
            f"Created wrapper rule: {rule.ruleName}",
            json.dumps(rule.dict()),
            f"Rule ID: {rule_id}",
            {"ruleId": rule_id, "ruleName": rule.ruleName}
        )
        
        return {
            "success": True,
            "message": "Wrapper rule created successfully",
            "ruleId": str(rule_id)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Analytics and Performance
@router.get("/tier-enforcement-wrapper/analytics")
async def get_wrapper_analytics(
    time_range: str = Query("24h", description="Time range: 24h, 7d, 30d"),
    user_id: int = 1
):
    """Get wrapper analytics"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Calculate time range
        if time_range == "24h":
            time_filter = "AND access_timestamp > datetime('now', '-1 day')"
        elif time_range == "7d":
            time_filter = "AND access_timestamp > datetime('now', '-7 days')"
        elif time_range == "30d":
            time_filter = "AND access_timestamp > datetime('now', '-30 days')"
        else:
            time_filter = ""
        
        # Get access statistics
        cursor.execute(f"""
            SELECT 
                COUNT(*) as total_checks,
                SUM(CASE WHEN access_granted = TRUE THEN 1 ELSE 0 END) as allowed_checks,
                SUM(CASE WHEN access_granted = FALSE THEN 1 ELSE 0 END) as denied_checks,
                AVG(check_duration_ms) as avg_duration_ms,
                MAX(check_duration_ms) as max_duration_ms
            FROM TierEnforcementWrapperInstances 
            WHERE userId = ? {time_filter}
        """, (user_id,))
        
        stats = cursor.fetchone()
        
        # Get top wrapper usage
        cursor.execute(f"""
            SELECT 
                wc.wrapper_name,
                wc.wrapper_type,
                COUNT(wi.id) as usage_count,
                AVG(wi.check_duration_ms) as avg_duration
            FROM TierEnforcementWrapperConfig wc
            LEFT JOIN TierEnforcementWrapperInstances wi ON wc.id = wi.wrapper_config_id
            WHERE wc.userId = ? {time_filter.replace('access_timestamp', 'wi.access_timestamp')}
            GROUP BY wc.id
            ORDER BY usage_count DESC
            LIMIT 10
        """, (user_id,))
        
        top_wrappers = cursor.fetchall()
        
        # Get violation reasons
        cursor.execute(f"""
            SELECT 
                violation_reason,
                COUNT(*) as count
            FROM TierEnforcementWrapperInstances 
            WHERE userId = ? AND access_granted = FALSE AND violation_reason IS NOT NULL {time_filter}
            GROUP BY violation_reason
            ORDER BY count DESC
            LIMIT 5
        """, (user_id,))
        
        violations = cursor.fetchall()
        
        conn.close()
        
        # Format response
        analytics = {
            "timeRange": time_range,
            "summary": {
                "totalChecks": stats[0] or 0,
                "allowedChecks": stats[1] or 0,
                "deniedChecks": stats[2] or 0,
                "allowedPercentage": (stats[1] / stats[0] * 100) if stats[0] else 0,
                "avgDurationMs": round(stats[3] or 0, 2),
                "maxDurationMs": stats[4] or 0
            },
            "topWrappers": [
                {
                    "wrapperName": wrapper[0],
                    "wrapperType": wrapper[1],
                    "usageCount": wrapper[2],
                    "avgDuration": round(wrapper[3] or 0, 2)
                }
                for wrapper in top_wrappers
            ],
            "commonViolations": [
                {
                    "reason": violation[0],
                    "count": violation[1]
                }
                for violation in violations
            ]
        }
        
        return analytics
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Settings Management
@router.get("/tier-enforcement-wrapper/settings")
async def get_wrapper_settings(user_id: int = 1):
    """Get wrapper settings"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Create table if it doesn't exist
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS TierEnforcementWrapperSettings (
                id SERIAL PRIMARY KEY,
                userId INTEGER NOT NULL,
                global_enforcement_enabled BOOLEAN DEFAULT TRUE,
                debug_mode BOOLEAN DEFAULT FALSE,
                cache_enabled BOOLEAN DEFAULT TRUE,
                cache_ttl_seconds INTEGER DEFAULT 300,
                max_check_duration_ms INTEGER DEFAULT 5000,
                default_on_error TEXT DEFAULT 'allow',
                notify_on_violations BOOLEAN DEFAULT TRUE,
                audit_all_checks BOOLEAN DEFAULT FALSE,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(userId)
            )
        """)
        
        cursor.execute("""
            SELECT * FROM TierEnforcementWrapperSettings WHERE userId = ?
        """, (user_id,))
        
        result = cursor.fetchone()
        
        if not result:
            # Create default settings
            cursor.execute("""
                INSERT INTO TierEnforcementWrapperSettings (userId) VALUES (%s)
            """, (user_id,))
            conn.commit()
            
            # Fetch default settings
            cursor.execute("""
                SELECT * FROM TierEnforcementWrapperSettings WHERE userId = ?
            """, (user_id,))
            result = cursor.fetchone()
        
        columns = [description[0] for description in cursor.description]
        settings = dict(zip(columns, result))
        
        conn.close()
        
        return {
            "globalEnforcementEnabled": bool(settings['global_enforcement_enabled']),
            "debugMode": bool(settings['debug_mode']),
            "cacheEnabled": bool(settings['cache_enabled']),
            "cacheTtlSeconds": settings['cache_ttl_seconds'],
            "maxCheckDurationMs": settings['max_check_duration_ms'],
            "defaultOnError": settings['default_on_error'],
            "notifyOnViolations": bool(settings['notify_on_violations']),
            "auditAllChecks": bool(settings['audit_all_checks'])
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/tier-enforcement-wrapper/settings")
async def update_wrapper_settings(
    settings: Dict[str, Any] = Body(...),
    user_id: int = 1
):
    """Update wrapper settings"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            UPDATE TierEnforcementWrapperSettings 
            SET global_enforcement_enabled = ?,
                debug_mode = ?,
                cache_enabled = ?,
                cache_ttl_seconds = ?,
                max_check_duration_ms = ?,
                default_on_error = ?,
                notify_on_violations = ?,
                audit_all_checks = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE userId = ?
        """, (
            settings.get("globalEnforcementEnabled", True),
            settings.get("debugMode", False),
            settings.get("cacheEnabled", True),
            settings.get("cacheTtlSeconds", 300),
            settings.get("maxCheckDurationMs", 5000),
            settings.get("defaultOnError", "allow"),
            settings.get("notifyOnViolations", True),
            settings.get("auditAllChecks", False),
            user_id
        ))
        
        conn.commit()
        conn.close()
        
        await log_to_agent_memory(
            user_id,
            "wrapper_settings_updated",
            "Updated wrapper settings",
            json.dumps(settings),
            "Settings updated successfully",
            {"settingsChanged": len(settings)}
        )
        
        return {
            "success": True,
            "message": "Wrapper settings updated successfully"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 

from fastapi import APIRouter, HTTPException, Depends, Query, Body
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
import json
from datetime import datetime
import psycopg2
from psycopg2.extras import RealDictCursor
import os

router = APIRouter()

# Block 38: Tier Enforcement Wrapper - API Routes

class WrapperConfig(BaseModel):
    """Wrapper configuration schema"""
    wrapperName: str
    wrapperType: str
    targetIdentifier: str
    enforcementEnabled: bool = True
    strictMode: bool = False
    minimumTierLevel: int = 0
    requiredPermissions: List[str] = []
    onViolationAction: str = "block"
    fallbackComponent: Optional[str] = None
    redirectUrl: Optional[str] = None
    customMessage: Optional[str] = None

class AccessCheckRequest(BaseModel):
    """Access check request schema"""
    wrapperName: str
    targetIdentifier: str
    userTierLevel: int
    userPermissions: List[str] = []
    sessionId: Optional[str] = None
    requestPath: Optional[str] = None

class WrapperRule(BaseModel):
    """Wrapper rule schema"""
    ruleName: str
    ruleDescription: Optional[str] = None
    conditionType: str
    conditionConfig: Dict[str, Any]
    actionType: str
    actionConfig: Dict[str, Any] = {}
    appliesToWrappers: List[str] = []

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
            "block_38",
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

# Wrapper Configuration Management
@router.get("/tier-enforcement-wrapper/configs")
async def get_wrapper_configs(
    wrapper_type: Optional[str] = Query(None, description="Filter by wrapper type"),
    user_id: int = 1
):
    """Get wrapper configurations"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Create table if it doesn't exist
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS TierEnforcementWrapperConfig (
                id SERIAL PRIMARY KEY,
                userId INTEGER NOT NULL,
                wrapper_name TEXT NOT NULL,
                wrapper_type TEXT NOT NULL,
                target_identifier TEXT NOT NULL,
                enforcement_enabled BOOLEAN DEFAULT TRUE,
                strict_mode BOOLEAN DEFAULT FALSE,
                minimum_tier_level INTEGER DEFAULT 0,
                required_permissions TEXT DEFAULT '[]',
                on_violation_action TEXT DEFAULT 'block',
                fallback_component TEXT,
                redirect_url TEXT,
                custom_message TEXT,
                usage_count INTEGER DEFAULT 0,
                last_accessed TEXT,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(wrapper_name, target_identifier)
            )
        """)
        
        # Build query with optional filter
        where_clause = "WHERE userId = ?"
        params = [user_id]
        
        if wrapper_type:
            where_clause += " AND wrapper_type = %s"
            params.append(wrapper_type)
        
        cursor.execute(f"""
            SELECT * FROM TierEnforcementWrapperConfig 
            {where_clause}
            ORDER BY wrapper_name
        """, params)
        
        results = cursor.fetchall()
        columns = [description[0] for description in cursor.description]
        
        # Convert to list of dictionaries
        configs = []
        for row in results:
            data = dict(zip(columns, row))
            configs.append({
                "id": str(data['id']),
                "wrapperName": data['wrapper_name'],
                "wrapperType": data['wrapper_type'],
                "targetIdentifier": data['target_identifier'],
                "enforcementEnabled": bool(data['enforcement_enabled']),
                "strictMode": bool(data['strict_mode']),
                "minimumTierLevel": data['minimum_tier_level'],
                "requiredPermissions": json.loads(data['required_permissions']),
                "onViolationAction": data['on_violation_action'],
                "fallbackComponent": data['fallback_component'],
                "redirectUrl": data['redirect_url'],
                "customMessage": data['custom_message'],
                "usageCount": data['usage_count'],
                "lastAccessed": data['last_accessed'],
                "createdAt": data['created_at'],
                "updatedAt": data['updated_at']
            })
        
        conn.close()
        
        await log_to_agent_memory(
            user_id,
            "wrapper_configs_retrieved",
            f"Retrieved wrapper configurations",
            json.dumps({"wrapperType": wrapper_type}),
            f"Returned {len(configs)} configurations",
            {"configCount": len(configs), "wrapperType": wrapper_type}
        )
        
        return {
            "configs": configs,
            "totalCount": len(configs)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/tier-enforcement-wrapper/configs")
async def create_wrapper_config(
    config: WrapperConfig = Body(...),
    user_id: int = 1
):
    """Create wrapper configuration"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO TierEnforcementWrapperConfig 
            (userId, wrapper_name, wrapper_type, target_identifier, enforcement_enabled, 
             strict_mode, minimum_tier_level, required_permissions, on_violation_action,
             fallback_component, redirect_url, custom_message)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            user_id,
            config.wrapperName,
            config.wrapperType,
            config.targetIdentifier,
            config.enforcementEnabled,
            config.strictMode,
            config.minimumTierLevel,
            json.dumps(config.requiredPermissions),
            config.onViolationAction,
            config.fallbackComponent,
            config.redirectUrl,
            config.customMessage
        ))
        
        config_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        await log_to_agent_memory(
            user_id,
            "wrapper_config_created",
            f"Created wrapper config: {config.wrapperName}",
            json.dumps(config.dict()),
            f"Config ID: {config_id}",
            {"configId": config_id, "wrapperName": config.wrapperName}
        )
        
        return {
            "success": True,
            "message": "Wrapper configuration created successfully",
            "configId": str(config_id)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Access Control
@router.post("/tier-enforcement-wrapper/check-access")
async def check_access(
    request: AccessCheckRequest = Body(...),
    user_id: int = 1
):
    """Check access through tier enforcement wrapper"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        start_time = datetime.now()
        
        # Get wrapper configuration
        cursor.execute("""
            SELECT * FROM TierEnforcementWrapperConfig 
            WHERE wrapper_name = %s AND target_identifier = %s AND enforcement_enabled = TRUE
        """, (request.wrapperName, request.targetIdentifier))
        
        config_data = cursor.fetchone()
        
        if not config_data:
            # No configuration found, allow by default
            access_result = {
                "accessGranted": True,
                "violationReason": None,
                "actionTaken": "no_config",
                "fallbackComponent": None,
                "redirectUrl": None
            }
        else:
            columns = [description[0] for description in cursor.description]
            config = dict(zip(columns, config_data))
            
            # Check tier level
            if request.userTierLevel < config['minimum_tier_level']:
                access_result = {
                    "accessGranted": False,
                    "violationReason": f"Requires tier level {config['minimum_tier_level']} or higher",
                    "actionTaken": config['on_violation_action'],
                    "fallbackComponent": config['fallback_component'],
                    "redirectUrl": config['redirect_url']
                }
            else:
                # Check permissions
                required_permissions = json.loads(config['required_permissions'])
                if required_permissions and not all(perm in request.userPermissions for perm in required_permissions):
                    access_result = {
                        "accessGranted": False,
                        "violationReason": "Missing required permissions",
                        "actionTaken": config['on_violation_action'],
                        "fallbackComponent": config['fallback_component'],
                        "redirectUrl": config['redirect_url']
                    }
                else:
                    access_result = {
                        "accessGranted": True,
                        "violationReason": None,
                        "actionTaken": "allowed",
                        "fallbackComponent": None,
                        "redirectUrl": None
                    }
        
        # Calculate check duration
        check_duration = (datetime.now() - start_time).total_seconds() * 1000
        
        # Log access attempt
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS TierEnforcementWrapperInstances (
                id SERIAL PRIMARY KEY,
                wrapper_config_id INTEGER,
                userId INTEGER NOT NULL,
                instance_id TEXT NOT NULL,
                session_id TEXT,
                access_timestamp TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                user_tier_level INTEGER NOT NULL,
                user_permissions TEXT DEFAULT '[]',
                access_granted BOOLEAN NOT NULL,
                violation_reason TEXT,
                action_taken TEXT,
                request_path TEXT,
                check_duration_ms INTEGER,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        cursor.execute("""
            INSERT INTO TierEnforcementWrapperInstances 
            (wrapper_config_id, userId, instance_id, session_id, user_tier_level,
             user_permissions, access_granted, violation_reason, action_taken,
             request_path, check_duration_ms)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            config_data[0] if config_data else None,
            user_id,
            f"check_{datetime.now().timestamp()}",
            request.sessionId,
            request.userTierLevel,
            json.dumps(request.userPermissions),
            access_result["accessGranted"],
            access_result["violationReason"],
            access_result["actionTaken"],
            request.requestPath,
            int(check_duration)
        ))
        
        # Update usage count if config exists
        if config_data:
            cursor.execute("""
                UPDATE TierEnforcementWrapperConfig 
                SET usage_count = usage_count + 1, last_accessed = CURRENT_TIMESTAMP
                WHERE id = ?
            """, (config_data[0],))
        
        conn.commit()
        conn.close()
        
        await log_to_agent_memory(
            user_id,
            "access_check_performed",
            f"Access check for {request.wrapperName}",
            json.dumps(request.dict()),
            json.dumps(access_result),
            {
                "wrapperName": request.wrapperName,
                "accessGranted": access_result["accessGranted"],
                "checkDurationMs": int(check_duration)
            }
        )
        
        return {
            **access_result,
            "checkDurationMs": int(check_duration)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Rules Management
@router.get("/tier-enforcement-wrapper/rules")
async def get_wrapper_rules(user_id: int = 1):
    """Get wrapper rules"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Create table if it doesn't exist
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS TierEnforcementWrapperRules (
                id SERIAL PRIMARY KEY,
                userId INTEGER NOT NULL,
                rule_name TEXT NOT NULL,
                rule_description TEXT,
                rule_priority INTEGER DEFAULT 0,
                condition_type TEXT NOT NULL,
                condition_config TEXT NOT NULL,
                action_type TEXT NOT NULL,
                action_config TEXT DEFAULT '{}',
                applies_to_wrappers TEXT DEFAULT '[]',
                is_active BOOLEAN DEFAULT TRUE,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(rule_name)
            )
        """)
        
        cursor.execute("""
            SELECT * FROM TierEnforcementWrapperRules 
            WHERE userId = ? AND is_active = TRUE
            ORDER BY rule_priority DESC, rule_name
        """, (user_id,))
        
        results = cursor.fetchall()
        columns = [description[0] for description in cursor.description]
        
        # Convert to list of dictionaries
        rules = []
        for row in results:
            data = dict(zip(columns, row))
            rules.append({
                "id": str(data['id']),
                "ruleName": data['rule_name'],
                "ruleDescription": data['rule_description'],
                "rulePriority": data['rule_priority'],
                "conditionType": data['condition_type'],
                "conditionConfig": json.loads(data['condition_config']),
                "actionType": data['action_type'],
                "actionConfig": json.loads(data['action_config']),
                "appliesToWrappers": json.loads(data['applies_to_wrappers']),
                "isActive": bool(data['is_active']),
                "createdAt": data['created_at'],
                "updatedAt": data['updated_at']
            })
        
        conn.close()
        
        return {
            "rules": rules,
            "totalCount": len(rules)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/tier-enforcement-wrapper/rules")
async def create_wrapper_rule(
    rule: WrapperRule = Body(...),
    user_id: int = 1
):
    """Create wrapper rule"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO TierEnforcementWrapperRules 
            (userId, rule_name, rule_description, condition_type, condition_config,
             action_type, action_config, applies_to_wrappers)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            user_id,
            rule.ruleName,
            rule.ruleDescription,
            rule.conditionType,
            json.dumps(rule.conditionConfig),
            rule.actionType,
            json.dumps(rule.actionConfig),
            json.dumps(rule.appliesToWrappers)
        ))
        
        rule_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        await log_to_agent_memory(
            user_id,
            "wrapper_rule_created",
            f"Created wrapper rule: {rule.ruleName}",
            json.dumps(rule.dict()),
            f"Rule ID: {rule_id}",
            {"ruleId": rule_id, "ruleName": rule.ruleName}
        )
        
        return {
            "success": True,
            "message": "Wrapper rule created successfully",
            "ruleId": str(rule_id)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Analytics and Performance
@router.get("/tier-enforcement-wrapper/analytics")
async def get_wrapper_analytics(
    time_range: str = Query("24h", description="Time range: 24h, 7d, 30d"),
    user_id: int = 1
):
    """Get wrapper analytics"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Calculate time range
        if time_range == "24h":
            time_filter = "AND access_timestamp > datetime('now', '-1 day')"
        elif time_range == "7d":
            time_filter = "AND access_timestamp > datetime('now', '-7 days')"
        elif time_range == "30d":
            time_filter = "AND access_timestamp > datetime('now', '-30 days')"
        else:
            time_filter = ""
        
        # Get access statistics
        cursor.execute(f"""
            SELECT 
                COUNT(*) as total_checks,
                SUM(CASE WHEN access_granted = TRUE THEN 1 ELSE 0 END) as allowed_checks,
                SUM(CASE WHEN access_granted = FALSE THEN 1 ELSE 0 END) as denied_checks,
                AVG(check_duration_ms) as avg_duration_ms,
                MAX(check_duration_ms) as max_duration_ms
            FROM TierEnforcementWrapperInstances 
            WHERE userId = ? {time_filter}
        """, (user_id,))
        
        stats = cursor.fetchone()
        
        # Get top wrapper usage
        cursor.execute(f"""
            SELECT 
                wc.wrapper_name,
                wc.wrapper_type,
                COUNT(wi.id) as usage_count,
                AVG(wi.check_duration_ms) as avg_duration
            FROM TierEnforcementWrapperConfig wc
            LEFT JOIN TierEnforcementWrapperInstances wi ON wc.id = wi.wrapper_config_id
            WHERE wc.userId = ? {time_filter.replace('access_timestamp', 'wi.access_timestamp')}
            GROUP BY wc.id
            ORDER BY usage_count DESC
            LIMIT 10
        """, (user_id,))
        
        top_wrappers = cursor.fetchall()
        
        # Get violation reasons
        cursor.execute(f"""
            SELECT 
                violation_reason,
                COUNT(*) as count
            FROM TierEnforcementWrapperInstances 
            WHERE userId = ? AND access_granted = FALSE AND violation_reason IS NOT NULL {time_filter}
            GROUP BY violation_reason
            ORDER BY count DESC
            LIMIT 5
        """, (user_id,))
        
        violations = cursor.fetchall()
        
        conn.close()
        
        # Format response
        analytics = {
            "timeRange": time_range,
            "summary": {
                "totalChecks": stats[0] or 0,
                "allowedChecks": stats[1] or 0,
                "deniedChecks": stats[2] or 0,
                "allowedPercentage": (stats[1] / stats[0] * 100) if stats[0] else 0,
                "avgDurationMs": round(stats[3] or 0, 2),
                "maxDurationMs": stats[4] or 0
            },
            "topWrappers": [
                {
                    "wrapperName": wrapper[0],
                    "wrapperType": wrapper[1],
                    "usageCount": wrapper[2],
                    "avgDuration": round(wrapper[3] or 0, 2)
                }
                for wrapper in top_wrappers
            ],
            "commonViolations": [
                {
                    "reason": violation[0],
                    "count": violation[1]
                }
                for violation in violations
            ]
        }
        
        return analytics
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Settings Management
@router.get("/tier-enforcement-wrapper/settings")
async def get_wrapper_settings(user_id: int = 1):
    """Get wrapper settings"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Create table if it doesn't exist
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS TierEnforcementWrapperSettings (
                id SERIAL PRIMARY KEY,
                userId INTEGER NOT NULL,
                global_enforcement_enabled BOOLEAN DEFAULT TRUE,
                debug_mode BOOLEAN DEFAULT FALSE,
                cache_enabled BOOLEAN DEFAULT TRUE,
                cache_ttl_seconds INTEGER DEFAULT 300,
                max_check_duration_ms INTEGER DEFAULT 5000,
                default_on_error TEXT DEFAULT 'allow',
                notify_on_violations BOOLEAN DEFAULT TRUE,
                audit_all_checks BOOLEAN DEFAULT FALSE,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(userId)
            )
        """)
        
        cursor.execute("""
            SELECT * FROM TierEnforcementWrapperSettings WHERE userId = ?
        """, (user_id,))
        
        result = cursor.fetchone()
        
        if not result:
            # Create default settings
            cursor.execute("""
                INSERT INTO TierEnforcementWrapperSettings (userId) VALUES (%s)
            """, (user_id,))
            conn.commit()
            
            # Fetch default settings
            cursor.execute("""
                SELECT * FROM TierEnforcementWrapperSettings WHERE userId = ?
            """, (user_id,))
            result = cursor.fetchone()
        
        columns = [description[0] for description in cursor.description]
        settings = dict(zip(columns, result))
        
        conn.close()
        
        return {
            "globalEnforcementEnabled": bool(settings['global_enforcement_enabled']),
            "debugMode": bool(settings['debug_mode']),
            "cacheEnabled": bool(settings['cache_enabled']),
            "cacheTtlSeconds": settings['cache_ttl_seconds'],
            "maxCheckDurationMs": settings['max_check_duration_ms'],
            "defaultOnError": settings['default_on_error'],
            "notifyOnViolations": bool(settings['notify_on_violations']),
            "auditAllChecks": bool(settings['audit_all_checks'])
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/tier-enforcement-wrapper/settings")
async def update_wrapper_settings(
    settings: Dict[str, Any] = Body(...),
    user_id: int = 1
):
    """Update wrapper settings"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            UPDATE TierEnforcementWrapperSettings 
            SET global_enforcement_enabled = ?,
                debug_mode = ?,
                cache_enabled = ?,
                cache_ttl_seconds = ?,
                max_check_duration_ms = ?,
                default_on_error = ?,
                notify_on_violations = ?,
                audit_all_checks = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE userId = ?
        """, (
            settings.get("globalEnforcementEnabled", True),
            settings.get("debugMode", False),
            settings.get("cacheEnabled", True),
            settings.get("cacheTtlSeconds", 300),
            settings.get("maxCheckDurationMs", 5000),
            settings.get("defaultOnError", "allow"),
            settings.get("notifyOnViolations", True),
            settings.get("auditAllChecks", False),
            user_id
        ))
        
        conn.commit()
        conn.close()
        
        await log_to_agent_memory(
            user_id,
            "wrapper_settings_updated",
            "Updated wrapper settings",
            json.dumps(settings),
            "Settings updated successfully",
            {"settingsChanged": len(settings)}
        )
        
        return {
            "success": True,
            "message": "Wrapper settings updated successfully"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))        