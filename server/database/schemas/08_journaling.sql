

CREATE TABLE journal_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    title VARCHAR(500),
    content TEXT NOT NULL,
    entry_type VARCHAR(20) DEFAULT 'general',
    
    trade_id UUID,
    asset_symbol VARCHAR(20),
    trade_type VARCHAR(10),
    
    entry_price DECIMAL(20, 4),
    exit_price DECIMAL(20, 4),
    quantity DECIMAL(20, 8),
    strategy_used VARCHAR(100),
    reasoning TEXT,
    market_conditions TEXT,
    
    confidence_level INTEGER DEFAULT 5,
    expected_outcome TEXT,
    actual_outcome TEXT,
    success_rating INTEGER,
    lessons_learned TEXT,
    
    tags JSONB DEFAULT '[]'::jsonb,
    mood VARCHAR(50),
    market_phase VARCHAR(50),
    is_public BOOLEAN DEFAULT FALSE,
    
    entry_date DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT journal_entries_entry_type_check CHECK (
        entry_type IN ('general', 'trade', 'analysis', 'reflection', 'lesson')
    ),
    CONSTRAINT journal_entries_trade_type_check CHECK (
        trade_type IS NULL OR trade_type IN ('buy', 'sell', 'short', 'cover')
    ),
    CONSTRAINT journal_entries_confidence_range CHECK (
        confidence_level >= 1 AND confidence_level <= 10
    ),
    CONSTRAINT journal_entries_success_rating_range CHECK (
        success_rating IS NULL OR (success_rating >= 1 AND success_rating <= 10)
    ),
    CONSTRAINT journal_entries_content_not_empty CHECK (LENGTH(TRIM(content)) > 0)
);

CREATE INDEX idx_journal_entries_user_id ON journal_entries(user_id);
CREATE INDEX idx_journal_entries_trade_id ON journal_entries(trade_id);
CREATE INDEX idx_journal_entries_entry_type ON journal_entries(entry_type);
CREATE INDEX idx_journal_entries_asset_symbol ON journal_entries(asset_symbol);
CREATE INDEX idx_journal_entries_entry_date ON journal_entries(entry_date DESC);
CREATE INDEX idx_journal_entries_created_at ON journal_entries(created_at DESC);
CREATE INDEX idx_journal_entries_is_public ON journal_entries(is_public) WHERE is_public = TRUE;
CREATE INDEX idx_journal_entries_tags ON journal_entries USING GIN(tags);

COMMENT ON TABLE journal_entries IS 'Trade journal entries and reflection notes';
COMMENT ON COLUMN journal_entries.entry_type IS 'Type of entry: general, trade, analysis, reflection, lesson';
COMMENT ON COLUMN journal_entries.confidence_level IS 'Confidence level when making trade decision (1-10)';
COMMENT ON COLUMN journal_entries.success_rating IS 'Post-trade success rating (1-10)';
COMMENT ON COLUMN journal_entries.tags IS 'User-defined tags for categorization';


CREATE TABLE manual_trade_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    journal_entry_id UUID REFERENCES journal_entries(id) ON DELETE SET NULL,
    
    symbol VARCHAR(20) NOT NULL,
    asset_name VARCHAR(255),
    
    trade_type VARCHAR(10) NOT NULL,
    entry_price DECIMAL(20, 4) NOT NULL,
    quantity DECIMAL(20, 8) NOT NULL,
    total_value DECIMAL(20, 2) NOT NULL,
    order_type VARCHAR(20) DEFAULT 'market',
    fees DECIMAL(20, 2) DEFAULT 0.00,
    broker VARCHAR(100),
    account_type VARCHAR(20) DEFAULT 'real',
    
    target_price DECIMAL(20, 4),
    stop_loss_price DECIMAL(20, 4),
    risk_reward_ratio DECIMAL(10, 2),
    position_size_percent DECIMAL(10, 4),
    
    strategy VARCHAR(100),
    time_horizon VARCHAR(20) DEFAULT 'medium',
    conviction_level INTEGER DEFAULT 5,
    
    market_conditions TEXT,
    economic_events JSONB DEFAULT '[]'::jsonb,
    technical_indicators JSONB DEFAULT '{}'::jsonb,
    
    current_price DECIMAL(20, 4),
    unrealized_pnl DECIMAL(20, 2) DEFAULT 0.00,
    unrealized_pnl_percent DECIMAL(10, 4) DEFAULT 0.0000,
    max_profit DECIMAL(20, 2) DEFAULT 0.00,
    max_loss DECIMAL(20, 2) DEFAULT 0.00,
    
    exit_price DECIMAL(20, 4),
    exit_date TIMESTAMPTZ,
    exit_reason TEXT,
    realized_pnl DECIMAL(20, 2),
    realized_pnl_percent DECIMAL(10, 4),
    
    status VARCHAR(20) DEFAULT 'open',
    is_active BOOLEAN DEFAULT TRUE,
    
    trade_date DATE NOT NULL,
    execution_time TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT manual_trade_logs_trade_type_check CHECK (
        trade_type IN ('buy', 'sell', 'short', 'cover')
    ),
    CONSTRAINT manual_trade_logs_order_type_check CHECK (
        order_type IN ('market', 'limit', 'stop', 'stop_limit')
    ),
    CONSTRAINT manual_trade_logs_account_type_check CHECK (
        account_type IN ('real', 'paper', 'demo')
    ),
    CONSTRAINT manual_trade_logs_time_horizon_check CHECK (
        time_horizon IN ('intraday', 'short', 'medium', 'long')
    ),
    CONSTRAINT manual_trade_logs_conviction_range CHECK (
        conviction_level >= 1 AND conviction_level <= 10
    ),
    CONSTRAINT manual_trade_logs_status_check CHECK (
        status IN ('open', 'closed', 'partial', 'cancelled')
    ),
    CONSTRAINT manual_trade_logs_quantity_positive CHECK (quantity > 0),
    CONSTRAINT manual_trade_logs_entry_price_positive CHECK (entry_price > 0)
);

CREATE INDEX idx_manual_trade_logs_user_id ON manual_trade_logs(user_id);
CREATE INDEX idx_manual_trade_logs_journal_entry_id ON manual_trade_logs(journal_entry_id);
CREATE INDEX idx_manual_trade_logs_symbol ON manual_trade_logs(symbol);
CREATE INDEX idx_manual_trade_logs_status ON manual_trade_logs(status);
CREATE INDEX idx_manual_trade_logs_trade_date ON manual_trade_logs(trade_date DESC);
CREATE INDEX idx_manual_trade_logs_execution_time ON manual_trade_logs(execution_time DESC);
CREATE INDEX idx_manual_trade_logs_user_symbol ON manual_trade_logs(user_id, symbol);
CREATE INDEX idx_manual_trade_logs_user_status ON manual_trade_logs(user_id, status);

COMMENT ON TABLE manual_trade_logs IS 'Detailed manual trade execution records';
COMMENT ON COLUMN manual_trade_logs.trade_type IS 'Trade action: buy, sell, short, cover';
COMMENT ON COLUMN manual_trade_logs.conviction_level IS 'Trader conviction level (1-10)';
COMMENT ON COLUMN manual_trade_logs.risk_reward_ratio IS 'Expected risk/reward ratio';
COMMENT ON COLUMN manual_trade_logs.status IS 'Trade status: open, closed, partial, cancelled';


CREATE TABLE trade_analysis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    trade_log_id UUID NOT NULL UNIQUE REFERENCES manual_trade_logs(id) ON DELETE CASCADE,
    
    pre_trade_analysis TEXT,
    entry_criteria TEXT,
    risk_assessment TEXT,
    expected_duration TEXT,
    
    mid_trade_notes JSONB DEFAULT '[]'::jsonb,
    adjustment_reasons JSONB DEFAULT '[]'::jsonb,
    emotional_state JSONB DEFAULT '[]'::jsonb,
    
    post_trade_analysis TEXT,
    what_went_right TEXT,
    what_went_wrong TEXT,
    key_learnings TEXT,
    would_do_differently TEXT,
    
    execution_quality INTEGER DEFAULT 5,
    timing_quality INTEGER DEFAULT 5,
    risk_management_quality INTEGER DEFAULT 5,
    
    pre_trade_emotion VARCHAR(50),
    during_trade_emotion VARCHAR(50),
    post_trade_emotion VARCHAR(50),
    emotional_discipline_rating INTEGER DEFAULT 5,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT trade_analysis_execution_quality_range CHECK (
        execution_quality >= 1 AND execution_quality <= 10
    ),
    CONSTRAINT trade_analysis_timing_quality_range CHECK (
        timing_quality >= 1 AND timing_quality <= 10
    ),
    CONSTRAINT trade_analysis_risk_quality_range CHECK (
        risk_management_quality >= 1 AND risk_management_quality <= 10
    ),
    CONSTRAINT trade_analysis_emotional_discipline_range CHECK (
        emotional_discipline_rating >= 1 AND emotional_discipline_rating <= 10
    )
);

CREATE INDEX idx_trade_analysis_user_id ON trade_analysis(user_id);
CREATE INDEX idx_trade_analysis_trade_log_id ON trade_analysis(trade_log_id);
CREATE INDEX idx_trade_analysis_created_at ON trade_analysis(created_at DESC);

COMMENT ON TABLE trade_analysis IS 'Detailed post-trade analysis and reflection';
COMMENT ON COLUMN trade_analysis.execution_quality IS 'Quality of trade execution (1-10)';
COMMENT ON COLUMN trade_analysis.timing_quality IS 'Quality of entry/exit timing (1-10)';
COMMENT ON COLUMN trade_analysis.risk_management_quality IS 'Quality of risk management (1-10)';
COMMENT ON COLUMN trade_analysis.emotional_discipline_rating IS 'Emotional discipline rating (1-10)';


CREATE TRIGGER update_journal_entries_updated_at
    BEFORE UPDATE ON journal_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_manual_trade_logs_updated_at
    BEFORE UPDATE ON manual_trade_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trade_analysis_updated_at
    BEFORE UPDATE ON trade_analysis
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
