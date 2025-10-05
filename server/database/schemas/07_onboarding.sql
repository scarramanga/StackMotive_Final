

CREATE TABLE user_onboarding_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    
    current_step INTEGER NOT NULL DEFAULT 1,
    completed_steps JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_complete BOOLEAN NOT NULL DEFAULT FALSE,
    completion_percentage DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    
    welcome_viewed BOOLEAN NOT NULL DEFAULT FALSE,
    welcome_viewed_at TIMESTAMPTZ,
    
    trading_experience VARCHAR(50),
    risk_tolerance VARCHAR(50),
    investment_horizon VARCHAR(50),
    initial_investment DECIMAL(20, 2),
    trading_frequency VARCHAR(50),
    preferred_markets JSONB DEFAULT '[]'::jsonb,
    
    full_name VARCHAR(255),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone_number VARCHAR(30),
    preferred_currency VARCHAR(10) DEFAULT 'NZD',
    date_of_birth DATE,
    
    tax_residency VARCHAR(100),
    secondary_tax_residency VARCHAR(100),
    tax_identification_number VARCHAR(100),
    tax_file_number VARCHAR(100),
    employment_status VARCHAR(50),
    tax_year_preference VARCHAR(20) DEFAULT 'calendar',
    tax_registered_business BOOLEAN DEFAULT FALSE,
    
    help_level VARCHAR(20) DEFAULT 'guided',
    notification_preferences JSONB DEFAULT '{"email": true, "push": true, "sms": false}'::jsonb,
    privacy_settings JSONB DEFAULT '{"profilePublic": false, "performancePublic": false}'::jsonb,
    
    connect_brokers BOOLEAN DEFAULT FALSE,
    selected_brokers JSONB DEFAULT '[]'::jsonb,
    has_existing_portfolio BOOLEAN DEFAULT FALSE,
    existing_portfolio_value DECIMAL(20, 2),
    
    terms_accepted BOOLEAN DEFAULT FALSE,
    terms_accepted_at TIMESTAMPTZ,
    privacy_policy_accepted BOOLEAN DEFAULT FALSE,
    privacy_policy_accepted_at TIMESTAMPTZ,
    
    started_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMPTZ,
    last_active_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT onboarding_progress_step_positive CHECK (current_step > 0),
    CONSTRAINT onboarding_progress_completion_range CHECK (
        completion_percentage >= 0 AND completion_percentage <= 100
    ),
    CONSTRAINT onboarding_progress_trading_exp_check CHECK (
        trading_experience IS NULL OR trading_experience IN (
            'none', 'beginner', 'intermediate', 'advanced', 'professional'
        )
    ),
    CONSTRAINT onboarding_progress_risk_tolerance_check CHECK (
        risk_tolerance IS NULL OR risk_tolerance IN (
            'very_low', 'low', 'moderate', 'high', 'very_high'
        )
    ),
    CONSTRAINT onboarding_progress_investment_horizon_check CHECK (
        investment_horizon IS NULL OR investment_horizon IN (
            'short_term', 'medium_term', 'long_term'
        )
    ),
    CONSTRAINT onboarding_progress_help_level_check CHECK (
        help_level IN ('guided', 'minimal', 'none')
    ),
    CONSTRAINT onboarding_progress_tax_year_check CHECK (
        tax_year_preference IN ('calendar', 'financial')
    )
);

CREATE INDEX idx_onboarding_progress_user_id ON user_onboarding_progress(user_id);
CREATE INDEX idx_onboarding_progress_complete ON user_onboarding_progress(is_complete);
CREATE INDEX idx_onboarding_progress_started_at ON user_onboarding_progress(started_at DESC);
CREATE INDEX idx_onboarding_progress_completed_at ON user_onboarding_progress(completed_at DESC);

COMMENT ON TABLE user_onboarding_progress IS 'User onboarding progress tracking and collected information';
COMMENT ON COLUMN user_onboarding_progress.current_step IS 'Current onboarding step number';
COMMENT ON COLUMN user_onboarding_progress.completed_steps IS 'Array of completed step numbers';
COMMENT ON COLUMN user_onboarding_progress.trading_experience IS 'Self-reported trading experience level';
COMMENT ON COLUMN user_onboarding_progress.risk_tolerance IS 'Self-reported risk tolerance level';
COMMENT ON COLUMN user_onboarding_progress.help_level IS 'Preferred UI guidance level';


CREATE TABLE user_trading_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    
    trading_style VARCHAR(50) DEFAULT 'balanced',
    strategy_preference VARCHAR(50) DEFAULT 'mixed',
    
    position_sizing_method VARCHAR(50) DEFAULT 'percentage',
    default_position_size DECIMAL(10, 4) DEFAULT 5.0,
    max_position_size DECIMAL(10, 4) DEFAULT 20.0,
    
    stop_loss_percentage DECIMAL(10, 4) DEFAULT 10.0,
    take_profit_percentage DECIMAL(10, 4) DEFAULT 20.0,
    max_daily_trades INTEGER DEFAULT 10,
    max_weekly_trades INTEGER DEFAULT 50,
    
    cash_allocation_target DECIMAL(10, 4) DEFAULT 10.0,
    equity_allocation_target DECIMAL(10, 4) DEFAULT 70.0,
    bond_allocation_target DECIMAL(10, 4) DEFAULT 15.0,
    alternative_allocation_target DECIMAL(10, 4) DEFAULT 5.0,
    
    auto_rebalance_enabled BOOLEAN DEFAULT TRUE,
    rebalance_threshold DECIMAL(10, 4) DEFAULT 5.0,
    rebalance_frequency VARCHAR(20) DEFAULT 'monthly',
    
    base_currency VARCHAR(10) DEFAULT 'NZD',
    currency_hedging_preference VARCHAR(20) DEFAULT 'auto',
    tax_loss_harvesting_enabled BOOLEAN DEFAULT TRUE,
    franking_credits_consideration BOOLEAN DEFAULT TRUE,
    nz_tax_optimization BOOLEAN DEFAULT TRUE,
    
    price_alert_threshold DECIMAL(10, 4) DEFAULT 5.0,
    portfolio_alert_threshold DECIMAL(10, 4) DEFAULT 10.0,
    news_alert_enabled BOOLEAN DEFAULT TRUE,
    signal_alert_enabled BOOLEAN DEFAULT TRUE,
    
    auto_save_enabled BOOLEAN DEFAULT TRUE,
    advanced_mode_enabled BOOLEAN DEFAULT FALSE,
    paper_trading_enabled BOOLEAN DEFAULT TRUE,
    real_trading_enabled BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT trading_prefs_trading_style_check CHECK (
        trading_style IN ('conservative', 'balanced', 'aggressive', 'custom')
    ),
    CONSTRAINT trading_prefs_strategy_check CHECK (
        strategy_preference IN ('value', 'growth', 'dividend', 'momentum', 'mixed')
    ),
    CONSTRAINT trading_prefs_position_sizing_check CHECK (
        position_sizing_method IN ('fixed_amount', 'percentage', 'risk_based', 'kelly')
    ),
    CONSTRAINT trading_prefs_position_size_range CHECK (
        default_position_size > 0 AND default_position_size <= max_position_size
    ),
    CONSTRAINT trading_prefs_stop_loss_range CHECK (
        stop_loss_percentage > 0 AND stop_loss_percentage <= 100
    ),
    CONSTRAINT trading_prefs_take_profit_range CHECK (
        take_profit_percentage > 0 AND take_profit_percentage <= 1000
    ),
    CONSTRAINT trading_prefs_allocation_total CHECK (
        cash_allocation_target + equity_allocation_target + 
        bond_allocation_target + alternative_allocation_target = 100.0
    ),
    CONSTRAINT trading_prefs_rebalance_freq_check CHECK (
        rebalance_frequency IN ('daily', 'weekly', 'monthly', 'quarterly', 'annually')
    ),
    CONSTRAINT trading_prefs_currency_hedging_check CHECK (
        currency_hedging_preference IN ('none', 'partial', 'full', 'auto')
    )
);

CREATE INDEX idx_trading_preferences_user_id ON user_trading_preferences(user_id);
CREATE INDEX idx_trading_preferences_trading_style ON user_trading_preferences(trading_style);
CREATE INDEX idx_trading_preferences_paper_trading ON user_trading_preferences(paper_trading_enabled);

COMMENT ON TABLE user_trading_preferences IS 'User trading style and default parameters';
COMMENT ON COLUMN user_trading_preferences.trading_style IS 'Overall trading approach: conservative, balanced, aggressive, custom';
COMMENT ON COLUMN user_trading_preferences.position_sizing_method IS 'Method for calculating position sizes';
COMMENT ON COLUMN user_trading_preferences.paper_trading_enabled IS 'Whether paper trading (simulation) is enabled';
COMMENT ON COLUMN user_trading_preferences.real_trading_enabled IS 'Whether real trading is enabled';


CREATE TRIGGER update_onboarding_progress_updated_at
    BEFORE UPDATE ON user_onboarding_progress
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trading_preferences_updated_at
    BEFORE UPDATE ON user_trading_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
