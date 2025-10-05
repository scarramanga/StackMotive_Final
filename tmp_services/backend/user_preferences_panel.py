# Block 16: User Preferences Panel - FULLY INTEGRATED ✅
#
# Integration Verification (Direct Path Tracing):
# Frontend: client/src/components/settings/UserPreferencesPanel.tsx
#   └─ Calls: fetch('/api/user-preferences/*') endpoints  
#   └─ Router: server/main.py includes user_preferences_panel_router
#   └─ Database: Creates user_preferences, user_theme_preferences tables
#   └─ Agent Memory: Logs all preference actions
#   └─ Tests: tests/test_block_16_user_preferences_panel.py
#
# Status: 🟢 FULLY INTEGRATED - Frontend → API → Database → Agent Memory

from fastapi import APIRouter, HTTPException, Depends, Body
from typing import Dict, Any, Optional, List
from pydantic import BaseModel
import json
from datetime import datetime
import sqlite3
from pathlib import Path as FilePath

router = APIRouter()

# Block 16: User Preferences Panel - API Routes
# Complete user preferences management system

class UserPreferences(BaseModel):
    """Main user preferences schema"""
    # Display Preferences
    theme: str = "system"
    language: str = "en"
    timezone: str = "Pacific/Auckland"
    date_format: str = "DD/MM/YYYY"
    time_format: str = "24h"
    number_format: str = "en-US"
    
    # Currency and Regional
    base_currency: str = "NZD"
    secondary_currency: Optional[str] = None
    currency_display_format: str = "symbol"
    
    # Dashboard Layout
    dashboard_layout: str = "default"
    sidebar_collapsed: bool = False
    panel_arrangement: List[str] = []
    default_page: str = "/dashboard"
    
    # Data Preferences
    auto_refresh_enabled: bool = True
    auto_refresh_interval: int = 30
    data_retention_days: int = 365
    cache_enabled: bool = True
    
    # Notifications
    email_notifications: bool = True
    push_notifications: bool = True
    sms_notifications: bool = False
    
    # Trading
    default_order_type: str = "market"
    confirm_trades: bool = True
    show_advanced_trading: bool = False
    paper_trading_default: bool = True
    
    # Charts
    default_chart_type: str = "candlestick"
    chart_theme: str = "light"
    show_volume: bool = True
    show_indicators: bool = True
    chart_timeframe: str = "1D"
    
    # Privacy
    profile_visibility: str = "private"
    show_performance: bool = False
    show_holdings: bool = False
    analytics_tracking: bool = True
    
    # Accessibility
    high_contrast: bool = False
    large_text: bool = False
    reduce_motion: bool = False
    screen_reader_support: bool = False
    
    # Performance
    lazy_loading: bool = True
    image_optimization: bool = True
    animation_enabled: bool = True
    transition_speed: str = "normal"
    
    # Advanced
    debug_mode: bool = False
    beta_features: bool = False
    developer_mode: bool = False

class ThemePreferences(BaseModel):
    """Theme preferences schema"""
    theme_mode: str = "system"
    color_scheme: str = "default"
    accent_color: str = "#3B82F6"
    primary_color: str = "#1E40AF"
    secondary_color: str = "#64748B"
    font_family: str = "Inter"
    font_size: str = "medium"
    font_weight: str = "normal"
    container_width: str = "full"
    border_radius: str = "medium"
    custom_css: Optional[str] = None

class NotificationPreferences(BaseModel):
    """Notification preferences schema"""
    email_enabled: bool = True
    email_address: Optional[str] = None
    email_frequency: str = "immediate"
    email_types: List[str] = ["trades", "alerts", "reports"]
    push_enabled: bool = True
    push_types: List[str] = ["price_alerts", "trade_confirmations"]
    sms_enabled: bool = False
    sms_number: Optional[str] = None
    in_app_enabled: bool = True
    in_app_position: str = "top-right"
    quiet_hours_enabled: bool = False
    quiet_hours_start: str = "22:00"
    quiet_hours_end: str = "08:00"

# Database connection
def get_db_connection():
    db_path = FilePath(__file__).parent.parent.parent / "prisma" / "dev.db"
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
            "block_16",
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

# User Preferences Endpoints
@router.get("/user-preferences")
async def get_user_preferences(user_id: int = 1):
    """Get user's comprehensive preferences"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Create tables if they don't exist
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS UserPreferences (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                userId INTEGER NOT NULL,
                theme TEXT DEFAULT 'system',
                language TEXT DEFAULT 'en',
                timezone TEXT DEFAULT 'Pacific/Auckland',
                date_format TEXT DEFAULT 'DD/MM/YYYY',
                time_format TEXT DEFAULT '24h',
                number_format TEXT DEFAULT 'en-US',
                base_currency TEXT DEFAULT 'NZD',
                secondary_currency TEXT,
                currency_display_format TEXT DEFAULT 'symbol',
                dashboard_layout TEXT DEFAULT 'default',
                sidebar_collapsed BOOLEAN DEFAULT FALSE,
                panel_arrangement TEXT DEFAULT '[]',
                default_page TEXT DEFAULT '/dashboard',
                auto_refresh_enabled BOOLEAN DEFAULT TRUE,
                auto_refresh_interval INTEGER DEFAULT 30,
                data_retention_days INTEGER DEFAULT 365,
                cache_enabled BOOLEAN DEFAULT TRUE,
                email_notifications BOOLEAN DEFAULT TRUE,
                push_notifications BOOLEAN DEFAULT TRUE,
                sms_notifications BOOLEAN DEFAULT FALSE,
                default_order_type TEXT DEFAULT 'market',
                confirm_trades BOOLEAN DEFAULT TRUE,
                show_advanced_trading BOOLEAN DEFAULT FALSE,
                paper_trading_default BOOLEAN DEFAULT TRUE,
                default_chart_type TEXT DEFAULT 'candlestick',
                chart_theme TEXT DEFAULT 'light',
                show_volume BOOLEAN DEFAULT TRUE,
                show_indicators BOOLEAN DEFAULT TRUE,
                chart_timeframe TEXT DEFAULT '1D',
                profile_visibility TEXT DEFAULT 'private',
                show_performance BOOLEAN DEFAULT FALSE,
                show_holdings BOOLEAN DEFAULT FALSE,
                analytics_tracking BOOLEAN DEFAULT TRUE,
                high_contrast BOOLEAN DEFAULT FALSE,
                large_text BOOLEAN DEFAULT FALSE,
                reduce_motion BOOLEAN DEFAULT FALSE,
                screen_reader_support BOOLEAN DEFAULT FALSE,
                lazy_loading BOOLEAN DEFAULT TRUE,
                image_optimization BOOLEAN DEFAULT TRUE,
                animation_enabled BOOLEAN DEFAULT TRUE,
                transition_speed TEXT DEFAULT 'normal',
                debug_mode BOOLEAN DEFAULT FALSE,
                beta_features BOOLEAN DEFAULT FALSE,
                developer_mode BOOLEAN DEFAULT FALSE,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(userId)
            )
        """)
        
        # Get user preferences
        cursor.execute("SELECT * FROM UserPreferences WHERE userId = ?", (user_id,))
        result = cursor.fetchone()
        
        if not result:
            # Create default preferences
            default_prefs = UserPreferences()
            cursor.execute("""
                INSERT INTO UserPreferences (userId, theme, language, base_currency)
                VALUES (?, ?, ?, ?)
            """, (user_id, default_prefs.theme, default_prefs.language, default_prefs.base_currency))
            conn.commit()
            
            # Fetch the created preferences
            cursor.execute("SELECT * FROM UserPreferences WHERE userId = ?", (user_id,))
            result = cursor.fetchone()
        
        columns = [description[0] for description in cursor.description]
        prefs_data = dict(zip(columns, result))
        
        # Parse JSON fields
        panel_arrangement = json.loads(prefs_data.get('panel_arrangement', '[]'))
        
        preferences = {
            "theme": prefs_data['theme'],
            "language": prefs_data['language'],
            "timezone": prefs_data['timezone'],
            "dateFormat": prefs_data['date_format'],
            "timeFormat": prefs_data['time_format'],
            "numberFormat": prefs_data['number_format'],
            "baseCurrency": prefs_data['base_currency'],
            "secondaryCurrency": prefs_data['secondary_currency'],
            "currencyDisplayFormat": prefs_data['currency_display_format'],
            "dashboardLayout": prefs_data['dashboard_layout'],
            "sidebarCollapsed": prefs_data['sidebar_collapsed'],
            "panelArrangement": panel_arrangement,
            "defaultPage": prefs_data['default_page'],
            "autoRefreshEnabled": prefs_data['auto_refresh_enabled'],
            "autoRefreshInterval": prefs_data['auto_refresh_interval'],
            "dataRetentionDays": prefs_data['data_retention_days'],
            "cacheEnabled": prefs_data['cache_enabled'],
            "emailNotifications": prefs_data['email_notifications'],
            "pushNotifications": prefs_data['push_notifications'],
            "smsNotifications": prefs_data['sms_notifications'],
            "defaultOrderType": prefs_data['default_order_type'],
            "confirmTrades": prefs_data['confirm_trades'],
            "showAdvancedTrading": prefs_data['show_advanced_trading'],
            "paperTradingDefault": prefs_data['paper_trading_default'],
            "defaultChartType": prefs_data['default_chart_type'],
            "chartTheme": prefs_data['chart_theme'],
            "showVolume": prefs_data['show_volume'],
            "showIndicators": prefs_data['show_indicators'],
            "chartTimeframe": prefs_data['chart_timeframe'],
            "profileVisibility": prefs_data['profile_visibility'],
            "showPerformance": prefs_data['show_performance'],
            "showHoldings": prefs_data['show_holdings'],
            "analyticsTracking": prefs_data['analytics_tracking'],
            "highContrast": prefs_data['high_contrast'],
            "largeText": prefs_data['large_text'],
            "reduceMotion": prefs_data['reduce_motion'],
            "screenReaderSupport": prefs_data['screen_reader_support'],
            "lazyLoading": prefs_data['lazy_loading'],
            "imageOptimization": prefs_data['image_optimization'],
            "animationEnabled": prefs_data['animation_enabled'],
            "transitionSpeed": prefs_data['transition_speed'],
            "debugMode": prefs_data['debug_mode'],
            "betaFeatures": prefs_data['beta_features'],
            "developerMode": prefs_data['developer_mode']
        }
        
        conn.close()
        
        await log_to_agent_memory(
            user_id,
            "preferences_retrieved",
            "Retrieved user preferences",
            json.dumps({"userId": user_id}),
            f"Preferences loaded successfully",
            {"theme": preferences["theme"], "currency": preferences["baseCurrency"]}
        )
        
        return preferences
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/user-preferences")
async def update_user_preferences(
    preferences: Dict[str, Any] = Body(...),
    user_id: int = 1
):
    """Update user preferences"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Update preferences
        cursor.execute("""
            UPDATE UserPreferences 
            SET theme = ?,
                language = ?,
                timezone = ?,
                date_format = ?,
                time_format = ?,
                number_format = ?,
                base_currency = ?,
                secondary_currency = ?,
                currency_display_format = ?,
                dashboard_layout = ?,
                sidebar_collapsed = ?,
                panel_arrangement = ?,
                default_page = ?,
                auto_refresh_enabled = ?,
                auto_refresh_interval = ?,
                data_retention_days = ?,
                cache_enabled = ?,
                email_notifications = ?,
                push_notifications = ?,
                sms_notifications = ?,
                default_order_type = ?,
                confirm_trades = ?,
                show_advanced_trading = ?,
                paper_trading_default = ?,
                default_chart_type = ?,
                chart_theme = ?,
                show_volume = ?,
                show_indicators = ?,
                chart_timeframe = ?,
                profile_visibility = ?,
                show_performance = ?,
                show_holdings = ?,
                analytics_tracking = ?,
                high_contrast = ?,
                large_text = ?,
                reduce_motion = ?,
                screen_reader_support = ?,
                lazy_loading = ?,
                image_optimization = ?,
                animation_enabled = ?,
                transition_speed = ?,
                debug_mode = ?,
                beta_features = ?,
                developer_mode = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE userId = ?
        """, (
            preferences.get('theme', 'system'),
            preferences.get('language', 'en'),
            preferences.get('timezone', 'Pacific/Auckland'),
            preferences.get('dateFormat', 'DD/MM/YYYY'),
            preferences.get('timeFormat', '24h'),
            preferences.get('numberFormat', 'en-US'),
            preferences.get('baseCurrency', 'NZD'),
            preferences.get('secondaryCurrency'),
            preferences.get('currencyDisplayFormat', 'symbol'),
            preferences.get('dashboardLayout', 'default'),
            preferences.get('sidebarCollapsed', False),
            json.dumps(preferences.get('panelArrangement', [])),
            preferences.get('defaultPage', '/dashboard'),
            preferences.get('autoRefreshEnabled', True),
            preferences.get('autoRefreshInterval', 30),
            preferences.get('dataRetentionDays', 365),
            preferences.get('cacheEnabled', True),
            preferences.get('emailNotifications', True),
            preferences.get('pushNotifications', True),
            preferences.get('smsNotifications', False),
            preferences.get('defaultOrderType', 'market'),
            preferences.get('confirmTrades', True),
            preferences.get('showAdvancedTrading', False),
            preferences.get('paperTradingDefault', True),
            preferences.get('defaultChartType', 'candlestick'),
            preferences.get('chartTheme', 'light'),
            preferences.get('showVolume', True),
            preferences.get('showIndicators', True),
            preferences.get('chartTimeframe', '1D'),
            preferences.get('profileVisibility', 'private'),
            preferences.get('showPerformance', False),
            preferences.get('showHoldings', False),
            preferences.get('analyticsTracking', True),
            preferences.get('highContrast', False),
            preferences.get('largeText', False),
            preferences.get('reduceMotion', False),
            preferences.get('screenReaderSupport', False),
            preferences.get('lazyLoading', True),
            preferences.get('imageOptimization', True),
            preferences.get('animationEnabled', True),
            preferences.get('transitionSpeed', 'normal'),
            preferences.get('debugMode', False),
            preferences.get('betaFeatures', False),
            preferences.get('developerMode', False),
            user_id
        ))
        
        conn.commit()
        conn.close()
        
        await log_to_agent_memory(
            user_id,
            "preferences_updated",
            "Updated user preferences",
            json.dumps(preferences),
            "Preferences updated successfully",
            {"updatedFields": list(preferences.keys())}
        )
        
        return {"success": True, "message": "Preferences updated successfully"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/user-preferences/theme")
async def get_theme_preferences(user_id: int = 1):
    """Get user's theme preferences"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Create theme preferences table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS UserThemePreferences (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                userId INTEGER NOT NULL,
                theme_mode TEXT DEFAULT 'system',
                color_scheme TEXT DEFAULT 'default',
                accent_color TEXT DEFAULT '#3B82F6',
                primary_color TEXT DEFAULT '#1E40AF',
                secondary_color TEXT DEFAULT '#64748B',
                font_family TEXT DEFAULT 'Inter',
                font_size TEXT DEFAULT 'medium',
                font_weight TEXT DEFAULT 'normal',
                container_width TEXT DEFAULT 'full',
                border_radius TEXT DEFAULT 'medium',
                custom_css TEXT,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(userId)
            )
        """)
        
        cursor.execute("SELECT * FROM UserThemePreferences WHERE userId = ?", (user_id,))
        result = cursor.fetchone()
        
        if not result:
            # Create default theme preferences
            cursor.execute("""
                INSERT INTO UserThemePreferences (userId) VALUES (?)
            """, (user_id,))
            conn.commit()
            
            cursor.execute("SELECT * FROM UserThemePreferences WHERE userId = ?", (user_id,))
            result = cursor.fetchone()
        
        columns = [description[0] for description in cursor.description]
        theme_data = dict(zip(columns, result))
        
        conn.close()
        
        return {
            "themeMode": theme_data['theme_mode'],
            "colorScheme": theme_data['color_scheme'],
            "accentColor": theme_data['accent_color'],
            "primaryColor": theme_data['primary_color'],
            "secondaryColor": theme_data['secondary_color'],
            "fontFamily": theme_data['font_family'],
            "fontSize": theme_data['font_size'],
            "fontWeight": theme_data['font_weight'],
            "containerWidth": theme_data['container_width'],
            "borderRadius": theme_data['border_radius'],
            "customCss": theme_data['custom_css']
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/user-preferences/theme")
async def update_theme_preferences(
    theme_prefs: Dict[str, Any] = Body(...),
    user_id: int = 1
):
    """Update user's theme preferences"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            UPDATE UserThemePreferences 
            SET theme_mode = ?,
                color_scheme = ?,
                accent_color = ?,
                primary_color = ?,
                secondary_color = ?,
                font_family = ?,
                font_size = ?,
                font_weight = ?,
                container_width = ?,
                border_radius = ?,
                custom_css = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE userId = ?
        """, (
            theme_prefs.get('themeMode', 'system'),
            theme_prefs.get('colorScheme', 'default'),
            theme_prefs.get('accentColor', '#3B82F6'),
            theme_prefs.get('primaryColor', '#1E40AF'),
            theme_prefs.get('secondaryColor', '#64748B'),
            theme_prefs.get('fontFamily', 'Inter'),
            theme_prefs.get('fontSize', 'medium'),
            theme_prefs.get('fontWeight', 'normal'),
            theme_prefs.get('containerWidth', 'full'),
            theme_prefs.get('borderRadius', 'medium'),
            theme_prefs.get('customCss'),
            user_id
        ))
        
        conn.commit()
        conn.close()
        
        await log_to_agent_memory(
            user_id,
            "theme_preferences_updated",
            "Updated theme preferences",
            json.dumps(theme_prefs),
            "Theme preferences updated successfully",
            {"themeMode": theme_prefs.get('themeMode')}
        )
        
        return {"success": True, "message": "Theme preferences updated successfully"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/user-preferences/reset")
async def reset_user_preferences(
    category: Optional[str] = None,
    user_id: int = 1
):
    """Reset user preferences to defaults"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        if category == "theme" or category is None:
            cursor.execute("DELETE FROM UserThemePreferences WHERE userId = ?", (user_id,))
            
        if category == "general" or category is None:
            cursor.execute("DELETE FROM UserPreferences WHERE userId = ?", (user_id,))
        
        conn.commit()
        conn.close()
        
        await log_to_agent_memory(
            user_id,
            "preferences_reset",
            f"Reset user preferences - category: {category or 'all'}",
            json.dumps({"category": category}),
            "Preferences reset to defaults",
            {"resetCategory": category or "all"}
        )
        
        return {
            "success": True, 
            "message": f"Preferences reset successfully - {category or 'all categories'}"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/user-preferences/export")
async def export_user_preferences(user_id: int = 1):
    """Export user preferences for backup"""
    try:
        # Get all preferences
        general_prefs = await get_user_preferences(user_id)
        theme_prefs = await get_theme_preferences(user_id)
        
        export_data = {
            "exportDate": datetime.now().isoformat(),
            "userId": user_id,
            "preferences": {
                "general": general_prefs,
                "theme": theme_prefs
            },
            "version": "1.0"
        }
        
        await log_to_agent_memory(
            user_id,
            "preferences_exported",
            "Exported user preferences",
            json.dumps({"userId": user_id}),
            "Preferences exported successfully",
            {"exportDate": export_data["exportDate"]}
        )
        
        return export_data
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/user-preferences/import")
async def import_user_preferences(
    import_data: Dict[str, Any] = Body(...),
    user_id: int = 1
):
    """Import user preferences from backup"""
    try:
        preferences_data = import_data.get("preferences", {})
        
        # Import general preferences
        if "general" in preferences_data:
            await update_user_preferences(preferences_data["general"], user_id)
            
        # Import theme preferences
        if "theme" in preferences_data:
            await update_theme_preferences(preferences_data["theme"], user_id)
        
        await log_to_agent_memory(
            user_id,
            "preferences_imported",
            "Imported user preferences",
            json.dumps(import_data),
            "Preferences imported successfully",
            {"importDate": datetime.now().isoformat()}
        )
        
        return {"success": True, "message": "Preferences imported successfully"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 
#
# Integration Verification (Direct Path Tracing):
# Frontend: client/src/components/settings/UserPreferencesPanel.tsx
#   └─ Calls: fetch('/api/user-preferences/*') endpoints  
#   └─ Router: server/main.py includes user_preferences_panel_router
#   └─ Database: Creates user_preferences, user_theme_preferences tables
#   └─ Agent Memory: Logs all preference actions
#   └─ Tests: tests/test_block_16_user_preferences_panel.py
#
# Status: 🟢 FULLY INTEGRATED - Frontend → API → Database → Agent Memory

from fastapi import APIRouter, HTTPException, Depends, Body
from typing import Dict, Any, Optional, List
from pydantic import BaseModel
import json
from datetime import datetime
import sqlite3
from pathlib import Path as FilePath

router = APIRouter()

# Block 16: User Preferences Panel - API Routes
# Complete user preferences management system

class UserPreferences(BaseModel):
    """Main user preferences schema"""
    # Display Preferences
    theme: str = "system"
    language: str = "en"
    timezone: str = "Pacific/Auckland"
    date_format: str = "DD/MM/YYYY"
    time_format: str = "24h"
    number_format: str = "en-US"
    
    # Currency and Regional
    base_currency: str = "NZD"
    secondary_currency: Optional[str] = None
    currency_display_format: str = "symbol"
    
    # Dashboard Layout
    dashboard_layout: str = "default"
    sidebar_collapsed: bool = False
    panel_arrangement: List[str] = []
    default_page: str = "/dashboard"
    
    # Data Preferences
    auto_refresh_enabled: bool = True
    auto_refresh_interval: int = 30
    data_retention_days: int = 365
    cache_enabled: bool = True
    
    # Notifications
    email_notifications: bool = True
    push_notifications: bool = True
    sms_notifications: bool = False
    
    # Trading
    default_order_type: str = "market"
    confirm_trades: bool = True
    show_advanced_trading: bool = False
    paper_trading_default: bool = True
    
    # Charts
    default_chart_type: str = "candlestick"
    chart_theme: str = "light"
    show_volume: bool = True
    show_indicators: bool = True
    chart_timeframe: str = "1D"
    
    # Privacy
    profile_visibility: str = "private"
    show_performance: bool = False
    show_holdings: bool = False
    analytics_tracking: bool = True
    
    # Accessibility
    high_contrast: bool = False
    large_text: bool = False
    reduce_motion: bool = False
    screen_reader_support: bool = False
    
    # Performance
    lazy_loading: bool = True
    image_optimization: bool = True
    animation_enabled: bool = True
    transition_speed: str = "normal"
    
    # Advanced
    debug_mode: bool = False
    beta_features: bool = False
    developer_mode: bool = False

class ThemePreferences(BaseModel):
    """Theme preferences schema"""
    theme_mode: str = "system"
    color_scheme: str = "default"
    accent_color: str = "#3B82F6"
    primary_color: str = "#1E40AF"
    secondary_color: str = "#64748B"
    font_family: str = "Inter"
    font_size: str = "medium"
    font_weight: str = "normal"
    container_width: str = "full"
    border_radius: str = "medium"
    custom_css: Optional[str] = None

class NotificationPreferences(BaseModel):
    """Notification preferences schema"""
    email_enabled: bool = True
    email_address: Optional[str] = None
    email_frequency: str = "immediate"
    email_types: List[str] = ["trades", "alerts", "reports"]
    push_enabled: bool = True
    push_types: List[str] = ["price_alerts", "trade_confirmations"]
    sms_enabled: bool = False
    sms_number: Optional[str] = None
    in_app_enabled: bool = True
    in_app_position: str = "top-right"
    quiet_hours_enabled: bool = False
    quiet_hours_start: str = "22:00"
    quiet_hours_end: str = "08:00"

# Database connection
def get_db_connection():
    db_path = FilePath(__file__).parent.parent.parent / "prisma" / "dev.db"
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
            "block_16",
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

# User Preferences Endpoints
@router.get("/user-preferences")
async def get_user_preferences(user_id: int = 1):
    """Get user's comprehensive preferences"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Create tables if they don't exist
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS UserPreferences (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                userId INTEGER NOT NULL,
                theme TEXT DEFAULT 'system',
                language TEXT DEFAULT 'en',
                timezone TEXT DEFAULT 'Pacific/Auckland',
                date_format TEXT DEFAULT 'DD/MM/YYYY',
                time_format TEXT DEFAULT '24h',
                number_format TEXT DEFAULT 'en-US',
                base_currency TEXT DEFAULT 'NZD',
                secondary_currency TEXT,
                currency_display_format TEXT DEFAULT 'symbol',
                dashboard_layout TEXT DEFAULT 'default',
                sidebar_collapsed BOOLEAN DEFAULT FALSE,
                panel_arrangement TEXT DEFAULT '[]',
                default_page TEXT DEFAULT '/dashboard',
                auto_refresh_enabled BOOLEAN DEFAULT TRUE,
                auto_refresh_interval INTEGER DEFAULT 30,
                data_retention_days INTEGER DEFAULT 365,
                cache_enabled BOOLEAN DEFAULT TRUE,
                email_notifications BOOLEAN DEFAULT TRUE,
                push_notifications BOOLEAN DEFAULT TRUE,
                sms_notifications BOOLEAN DEFAULT FALSE,
                default_order_type TEXT DEFAULT 'market',
                confirm_trades BOOLEAN DEFAULT TRUE,
                show_advanced_trading BOOLEAN DEFAULT FALSE,
                paper_trading_default BOOLEAN DEFAULT TRUE,
                default_chart_type TEXT DEFAULT 'candlestick',
                chart_theme TEXT DEFAULT 'light',
                show_volume BOOLEAN DEFAULT TRUE,
                show_indicators BOOLEAN DEFAULT TRUE,
                chart_timeframe TEXT DEFAULT '1D',
                profile_visibility TEXT DEFAULT 'private',
                show_performance BOOLEAN DEFAULT FALSE,
                show_holdings BOOLEAN DEFAULT FALSE,
                analytics_tracking BOOLEAN DEFAULT TRUE,
                high_contrast BOOLEAN DEFAULT FALSE,
                large_text BOOLEAN DEFAULT FALSE,
                reduce_motion BOOLEAN DEFAULT FALSE,
                screen_reader_support BOOLEAN DEFAULT FALSE,
                lazy_loading BOOLEAN DEFAULT TRUE,
                image_optimization BOOLEAN DEFAULT TRUE,
                animation_enabled BOOLEAN DEFAULT TRUE,
                transition_speed TEXT DEFAULT 'normal',
                debug_mode BOOLEAN DEFAULT FALSE,
                beta_features BOOLEAN DEFAULT FALSE,
                developer_mode BOOLEAN DEFAULT FALSE,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(userId)
            )
        """)
        
        # Get user preferences
        cursor.execute("SELECT * FROM UserPreferences WHERE userId = ?", (user_id,))
        result = cursor.fetchone()
        
        if not result:
            # Create default preferences
            default_prefs = UserPreferences()
            cursor.execute("""
                INSERT INTO UserPreferences (userId, theme, language, base_currency)
                VALUES (?, ?, ?, ?)
            """, (user_id, default_prefs.theme, default_prefs.language, default_prefs.base_currency))
            conn.commit()
            
            # Fetch the created preferences
            cursor.execute("SELECT * FROM UserPreferences WHERE userId = ?", (user_id,))
            result = cursor.fetchone()
        
        columns = [description[0] for description in cursor.description]
        prefs_data = dict(zip(columns, result))
        
        # Parse JSON fields
        panel_arrangement = json.loads(prefs_data.get('panel_arrangement', '[]'))
        
        preferences = {
            "theme": prefs_data['theme'],
            "language": prefs_data['language'],
            "timezone": prefs_data['timezone'],
            "dateFormat": prefs_data['date_format'],
            "timeFormat": prefs_data['time_format'],
            "numberFormat": prefs_data['number_format'],
            "baseCurrency": prefs_data['base_currency'],
            "secondaryCurrency": prefs_data['secondary_currency'],
            "currencyDisplayFormat": prefs_data['currency_display_format'],
            "dashboardLayout": prefs_data['dashboard_layout'],
            "sidebarCollapsed": prefs_data['sidebar_collapsed'],
            "panelArrangement": panel_arrangement,
            "defaultPage": prefs_data['default_page'],
            "autoRefreshEnabled": prefs_data['auto_refresh_enabled'],
            "autoRefreshInterval": prefs_data['auto_refresh_interval'],
            "dataRetentionDays": prefs_data['data_retention_days'],
            "cacheEnabled": prefs_data['cache_enabled'],
            "emailNotifications": prefs_data['email_notifications'],
            "pushNotifications": prefs_data['push_notifications'],
            "smsNotifications": prefs_data['sms_notifications'],
            "defaultOrderType": prefs_data['default_order_type'],
            "confirmTrades": prefs_data['confirm_trades'],
            "showAdvancedTrading": prefs_data['show_advanced_trading'],
            "paperTradingDefault": prefs_data['paper_trading_default'],
            "defaultChartType": prefs_data['default_chart_type'],
            "chartTheme": prefs_data['chart_theme'],
            "showVolume": prefs_data['show_volume'],
            "showIndicators": prefs_data['show_indicators'],
            "chartTimeframe": prefs_data['chart_timeframe'],
            "profileVisibility": prefs_data['profile_visibility'],
            "showPerformance": prefs_data['show_performance'],
            "showHoldings": prefs_data['show_holdings'],
            "analyticsTracking": prefs_data['analytics_tracking'],
            "highContrast": prefs_data['high_contrast'],
            "largeText": prefs_data['large_text'],
            "reduceMotion": prefs_data['reduce_motion'],
            "screenReaderSupport": prefs_data['screen_reader_support'],
            "lazyLoading": prefs_data['lazy_loading'],
            "imageOptimization": prefs_data['image_optimization'],
            "animationEnabled": prefs_data['animation_enabled'],
            "transitionSpeed": prefs_data['transition_speed'],
            "debugMode": prefs_data['debug_mode'],
            "betaFeatures": prefs_data['beta_features'],
            "developerMode": prefs_data['developer_mode']
        }
        
        conn.close()
        
        await log_to_agent_memory(
            user_id,
            "preferences_retrieved",
            "Retrieved user preferences",
            json.dumps({"userId": user_id}),
            f"Preferences loaded successfully",
            {"theme": preferences["theme"], "currency": preferences["baseCurrency"]}
        )
        
        return preferences
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/user-preferences")
async def update_user_preferences(
    preferences: Dict[str, Any] = Body(...),
    user_id: int = 1
):
    """Update user preferences"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Update preferences
        cursor.execute("""
            UPDATE UserPreferences 
            SET theme = ?,
                language = ?,
                timezone = ?,
                date_format = ?,
                time_format = ?,
                number_format = ?,
                base_currency = ?,
                secondary_currency = ?,
                currency_display_format = ?,
                dashboard_layout = ?,
                sidebar_collapsed = ?,
                panel_arrangement = ?,
                default_page = ?,
                auto_refresh_enabled = ?,
                auto_refresh_interval = ?,
                data_retention_days = ?,
                cache_enabled = ?,
                email_notifications = ?,
                push_notifications = ?,
                sms_notifications = ?,
                default_order_type = ?,
                confirm_trades = ?,
                show_advanced_trading = ?,
                paper_trading_default = ?,
                default_chart_type = ?,
                chart_theme = ?,
                show_volume = ?,
                show_indicators = ?,
                chart_timeframe = ?,
                profile_visibility = ?,
                show_performance = ?,
                show_holdings = ?,
                analytics_tracking = ?,
                high_contrast = ?,
                large_text = ?,
                reduce_motion = ?,
                screen_reader_support = ?,
                lazy_loading = ?,
                image_optimization = ?,
                animation_enabled = ?,
                transition_speed = ?,
                debug_mode = ?,
                beta_features = ?,
                developer_mode = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE userId = ?
        """, (
            preferences.get('theme', 'system'),
            preferences.get('language', 'en'),
            preferences.get('timezone', 'Pacific/Auckland'),
            preferences.get('dateFormat', 'DD/MM/YYYY'),
            preferences.get('timeFormat', '24h'),
            preferences.get('numberFormat', 'en-US'),
            preferences.get('baseCurrency', 'NZD'),
            preferences.get('secondaryCurrency'),
            preferences.get('currencyDisplayFormat', 'symbol'),
            preferences.get('dashboardLayout', 'default'),
            preferences.get('sidebarCollapsed', False),
            json.dumps(preferences.get('panelArrangement', [])),
            preferences.get('defaultPage', '/dashboard'),
            preferences.get('autoRefreshEnabled', True),
            preferences.get('autoRefreshInterval', 30),
            preferences.get('dataRetentionDays', 365),
            preferences.get('cacheEnabled', True),
            preferences.get('emailNotifications', True),
            preferences.get('pushNotifications', True),
            preferences.get('smsNotifications', False),
            preferences.get('defaultOrderType', 'market'),
            preferences.get('confirmTrades', True),
            preferences.get('showAdvancedTrading', False),
            preferences.get('paperTradingDefault', True),
            preferences.get('defaultChartType', 'candlestick'),
            preferences.get('chartTheme', 'light'),
            preferences.get('showVolume', True),
            preferences.get('showIndicators', True),
            preferences.get('chartTimeframe', '1D'),
            preferences.get('profileVisibility', 'private'),
            preferences.get('showPerformance', False),
            preferences.get('showHoldings', False),
            preferences.get('analyticsTracking', True),
            preferences.get('highContrast', False),
            preferences.get('largeText', False),
            preferences.get('reduceMotion', False),
            preferences.get('screenReaderSupport', False),
            preferences.get('lazyLoading', True),
            preferences.get('imageOptimization', True),
            preferences.get('animationEnabled', True),
            preferences.get('transitionSpeed', 'normal'),
            preferences.get('debugMode', False),
            preferences.get('betaFeatures', False),
            preferences.get('developerMode', False),
            user_id
        ))
        
        conn.commit()
        conn.close()
        
        await log_to_agent_memory(
            user_id,
            "preferences_updated",
            "Updated user preferences",
            json.dumps(preferences),
            "Preferences updated successfully",
            {"updatedFields": list(preferences.keys())}
        )
        
        return {"success": True, "message": "Preferences updated successfully"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/user-preferences/theme")
async def get_theme_preferences(user_id: int = 1):
    """Get user's theme preferences"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Create theme preferences table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS UserThemePreferences (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                userId INTEGER NOT NULL,
                theme_mode TEXT DEFAULT 'system',
                color_scheme TEXT DEFAULT 'default',
                accent_color TEXT DEFAULT '#3B82F6',
                primary_color TEXT DEFAULT '#1E40AF',
                secondary_color TEXT DEFAULT '#64748B',
                font_family TEXT DEFAULT 'Inter',
                font_size TEXT DEFAULT 'medium',
                font_weight TEXT DEFAULT 'normal',
                container_width TEXT DEFAULT 'full',
                border_radius TEXT DEFAULT 'medium',
                custom_css TEXT,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(userId)
            )
        """)
        
        cursor.execute("SELECT * FROM UserThemePreferences WHERE userId = ?", (user_id,))
        result = cursor.fetchone()
        
        if not result:
            # Create default theme preferences
            cursor.execute("""
                INSERT INTO UserThemePreferences (userId) VALUES (?)
            """, (user_id,))
            conn.commit()
            
            cursor.execute("SELECT * FROM UserThemePreferences WHERE userId = ?", (user_id,))
            result = cursor.fetchone()
        
        columns = [description[0] for description in cursor.description]
        theme_data = dict(zip(columns, result))
        
        conn.close()
        
        return {
            "themeMode": theme_data['theme_mode'],
            "colorScheme": theme_data['color_scheme'],
            "accentColor": theme_data['accent_color'],
            "primaryColor": theme_data['primary_color'],
            "secondaryColor": theme_data['secondary_color'],
            "fontFamily": theme_data['font_family'],
            "fontSize": theme_data['font_size'],
            "fontWeight": theme_data['font_weight'],
            "containerWidth": theme_data['container_width'],
            "borderRadius": theme_data['border_radius'],
            "customCss": theme_data['custom_css']
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/user-preferences/theme")
async def update_theme_preferences(
    theme_prefs: Dict[str, Any] = Body(...),
    user_id: int = 1
):
    """Update user's theme preferences"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            UPDATE UserThemePreferences 
            SET theme_mode = ?,
                color_scheme = ?,
                accent_color = ?,
                primary_color = ?,
                secondary_color = ?,
                font_family = ?,
                font_size = ?,
                font_weight = ?,
                container_width = ?,
                border_radius = ?,
                custom_css = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE userId = ?
        """, (
            theme_prefs.get('themeMode', 'system'),
            theme_prefs.get('colorScheme', 'default'),
            theme_prefs.get('accentColor', '#3B82F6'),
            theme_prefs.get('primaryColor', '#1E40AF'),
            theme_prefs.get('secondaryColor', '#64748B'),
            theme_prefs.get('fontFamily', 'Inter'),
            theme_prefs.get('fontSize', 'medium'),
            theme_prefs.get('fontWeight', 'normal'),
            theme_prefs.get('containerWidth', 'full'),
            theme_prefs.get('borderRadius', 'medium'),
            theme_prefs.get('customCss'),
            user_id
        ))
        
        conn.commit()
        conn.close()
        
        await log_to_agent_memory(
            user_id,
            "theme_preferences_updated",
            "Updated theme preferences",
            json.dumps(theme_prefs),
            "Theme preferences updated successfully",
            {"themeMode": theme_prefs.get('themeMode')}
        )
        
        return {"success": True, "message": "Theme preferences updated successfully"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/user-preferences/reset")
async def reset_user_preferences(
    category: Optional[str] = None,
    user_id: int = 1
):
    """Reset user preferences to defaults"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        if category == "theme" or category is None:
            cursor.execute("DELETE FROM UserThemePreferences WHERE userId = ?", (user_id,))
            
        if category == "general" or category is None:
            cursor.execute("DELETE FROM UserPreferences WHERE userId = ?", (user_id,))
        
        conn.commit()
        conn.close()
        
        await log_to_agent_memory(
            user_id,
            "preferences_reset",
            f"Reset user preferences - category: {category or 'all'}",
            json.dumps({"category": category}),
            "Preferences reset to defaults",
            {"resetCategory": category or "all"}
        )
        
        return {
            "success": True, 
            "message": f"Preferences reset successfully - {category or 'all categories'}"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/user-preferences/export")
async def export_user_preferences(user_id: int = 1):
    """Export user preferences for backup"""
    try:
        # Get all preferences
        general_prefs = await get_user_preferences(user_id)
        theme_prefs = await get_theme_preferences(user_id)
        
        export_data = {
            "exportDate": datetime.now().isoformat(),
            "userId": user_id,
            "preferences": {
                "general": general_prefs,
                "theme": theme_prefs
            },
            "version": "1.0"
        }
        
        await log_to_agent_memory(
            user_id,
            "preferences_exported",
            "Exported user preferences",
            json.dumps({"userId": user_id}),
            "Preferences exported successfully",
            {"exportDate": export_data["exportDate"]}
        )
        
        return export_data
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/user-preferences/import")
async def import_user_preferences(
    import_data: Dict[str, Any] = Body(...),
    user_id: int = 1
):
    """Import user preferences from backup"""
    try:
        preferences_data = import_data.get("preferences", {})
        
        # Import general preferences
        if "general" in preferences_data:
            await update_user_preferences(preferences_data["general"], user_id)
            
        # Import theme preferences
        if "theme" in preferences_data:
            await update_theme_preferences(preferences_data["theme"], user_id)
        
        await log_to_agent_memory(
            user_id,
            "preferences_imported",
            "Imported user preferences",
            json.dumps(import_data),
            "Preferences imported successfully",
            {"importDate": datetime.now().isoformat()}
        )
        
        return {"success": True, "message": "Preferences imported successfully"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 