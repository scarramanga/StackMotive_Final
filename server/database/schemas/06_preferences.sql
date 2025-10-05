

CREATE TABLE user_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    
    theme VARCHAR(20) DEFAULT 'system',
    language VARCHAR(10) DEFAULT 'en',
    timezone VARCHAR(50) DEFAULT 'UTC',
    date_format VARCHAR(20) DEFAULT 'YYYY-MM-DD',
    time_format VARCHAR(10) DEFAULT '24h',
    number_format VARCHAR(10) DEFAULT 'en-US',
    chart_type VARCHAR(20) DEFAULT 'candlestick',
    chart_timeframe VARCHAR(10) DEFAULT '1D',
    default_view VARCHAR(50) DEFAULT 'overview',
    
    data_refresh_interval INTEGER DEFAULT 30,
    real_time_data BOOLEAN DEFAULT TRUE,
    historical_data_range VARCHAR(10) DEFAULT '1Y',
    price_display_mode VARCHAR(20) DEFAULT 'live',
    
    email_notifications BOOLEAN DEFAULT TRUE,
    push_notifications BOOLEAN DEFAULT TRUE,
    sms_notifications BOOLEAN DEFAULT FALSE,
    alert_threshold DECIMAL(10, 4) DEFAULT 5.0,
    
    default_order_type VARCHAR(20) DEFAULT 'market',
    confirm_orders BOOLEAN DEFAULT TRUE,
    show_risk_warnings BOOLEAN DEFAULT TRUE,
    
    api_access_enabled BOOLEAN DEFAULT FALSE,
    webhook_url VARCHAR(500),
    custom_css_enabled BOOLEAN DEFAULT FALSE,
    beta_features BOOLEAN DEFAULT FALSE,
    developer_mode BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT user_preferences_theme_check CHECK (theme IN ('light', 'dark', 'system')),
    CONSTRAINT user_preferences_time_format_check CHECK (time_format IN ('12h', '24h')),
    CONSTRAINT user_preferences_chart_type_check CHECK (
        chart_type IN ('candlestick', 'line', 'bar', 'area', 'ohlc')
    ),
    CONSTRAINT user_preferences_refresh_interval_check CHECK (data_refresh_interval >= 5),
    CONSTRAINT user_preferences_alert_threshold_check CHECK (alert_threshold >= 0 AND alert_threshold <= 100),
    CONSTRAINT user_preferences_order_type_check CHECK (
        default_order_type IN ('market', 'limit', 'stop', 'stop_limit')
    )
);

CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX idx_user_preferences_theme ON user_preferences(theme);
CREATE INDEX idx_user_preferences_language ON user_preferences(language);

COMMENT ON TABLE user_preferences IS 'Comprehensive user configuration settings';
COMMENT ON COLUMN user_preferences.theme IS 'UI theme: light, dark, system';
COMMENT ON COLUMN user_preferences.data_refresh_interval IS 'Data refresh interval in seconds';
COMMENT ON COLUMN user_preferences.alert_threshold IS 'Default alert threshold percentage';
COMMENT ON COLUMN user_preferences.api_access_enabled IS 'Whether user has API access enabled';


CREATE TABLE user_theme_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    
    theme_mode VARCHAR(20) DEFAULT 'system',
    color_scheme VARCHAR(50) DEFAULT 'default',
    primary_color VARCHAR(7) DEFAULT '#3B82F6',
    accent_color VARCHAR(7) DEFAULT '#10B981',
    
    font_family VARCHAR(100) DEFAULT 'Inter',
    font_size VARCHAR(20) DEFAULT 'medium',
    
    chart_theme VARCHAR(50) DEFAULT 'default',
    sidebar_position VARCHAR(20) DEFAULT 'left',
    compact_mode BOOLEAN DEFAULT FALSE,
    animations_enabled BOOLEAN DEFAULT TRUE,
    border_radius VARCHAR(20) DEFAULT 'medium',
    
    custom_css TEXT,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT user_theme_preferences_mode_check CHECK (theme_mode IN ('light', 'dark', 'system')),
    CONSTRAINT user_theme_preferences_font_size_check CHECK (
        font_size IN ('small', 'medium', 'large', 'extra_large')
    ),
    CONSTRAINT user_theme_preferences_sidebar_check CHECK (sidebar_position IN ('left', 'right')),
    CONSTRAINT user_theme_preferences_border_radius_check CHECK (
        border_radius IN ('none', 'small', 'medium', 'large', 'full')
    ),
    CONSTRAINT user_theme_preferences_color_format_check CHECK (
        primary_color ~ '^#[0-9A-Fa-f]{6}$' AND accent_color ~ '^#[0-9A-Fa-f]{6}$'
    )
);

CREATE INDEX idx_user_theme_preferences_user_id ON user_theme_preferences(user_id);
CREATE INDEX idx_user_theme_preferences_theme_mode ON user_theme_preferences(theme_mode);

COMMENT ON TABLE user_theme_preferences IS 'Detailed UI theme customization settings';
COMMENT ON COLUMN user_theme_preferences.primary_color IS 'Primary brand color (hex format: #RRGGBB)';
COMMENT ON COLUMN user_theme_preferences.accent_color IS 'Accent color (hex format: #RRGGBB)';
COMMENT ON COLUMN user_theme_preferences.custom_css IS 'User-provided custom CSS for advanced styling';


CREATE TRIGGER update_user_preferences_updated_at
    BEFORE UPDATE ON user_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_theme_preferences_updated_at
    BEFORE UPDATE ON user_theme_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
