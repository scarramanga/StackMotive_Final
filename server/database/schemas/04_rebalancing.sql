

CREATE TABLE rebalance_schedule (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    frequency VARCHAR(20) NOT NULL DEFAULT 'manual',
    threshold DECIMAL(10, 4) NOT NULL DEFAULT 5.0,
    only_if_thresholds_exceeded BOOLEAN NOT NULL DEFAULT TRUE,
    
    day_of_week INTEGER,
    day_of_month INTEGER,
    time_of_day TIME NOT NULL DEFAULT '09:30:00',
    exclude_weekends BOOLEAN NOT NULL DEFAULT TRUE,
    
    allow_partial_rebalancing BOOLEAN NOT NULL DEFAULT FALSE,
    max_trades_per_session INTEGER NOT NULL DEFAULT 10,
    
    last_rebalance_time TIMESTAMPTZ,
    next_scheduled_time TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT rebalance_schedule_unique_user UNIQUE(user_id),
    CONSTRAINT rebalance_schedule_frequency_check CHECK (
        frequency IN ('manual', 'daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'annually')
    ),
    CONSTRAINT rebalance_schedule_threshold_check CHECK (threshold >= 0 AND threshold <= 100),
    CONSTRAINT rebalance_schedule_day_of_week_check CHECK (
        day_of_week IS NULL OR (day_of_week >= 0 AND day_of_week <= 6)
    ),
    CONSTRAINT rebalance_schedule_day_of_month_check CHECK (
        day_of_month IS NULL OR (day_of_month >= 1 AND day_of_month <= 31)
    ),
    CONSTRAINT rebalance_schedule_max_trades_positive CHECK (max_trades_per_session > 0)
);

CREATE INDEX idx_rebalance_schedule_user_id ON rebalance_schedule(user_id);
CREATE INDEX idx_rebalance_schedule_enabled ON rebalance_schedule(enabled) WHERE enabled = TRUE;
CREATE INDEX idx_rebalance_schedule_next_scheduled ON rebalance_schedule(next_scheduled_time);
CREATE INDEX idx_rebalance_schedule_frequency ON rebalance_schedule(frequency);

COMMENT ON TABLE rebalance_schedule IS 'User-configured automatic portfolio rebalancing schedules';
COMMENT ON COLUMN rebalance_schedule.frequency IS 'Rebalancing frequency: manual, daily, weekly, biweekly, monthly, quarterly, annually';
COMMENT ON COLUMN rebalance_schedule.threshold IS 'Portfolio drift percentage that triggers rebalancing (0-100)';
COMMENT ON COLUMN rebalance_schedule.day_of_week IS 'Day of week for weekly rebalancing (0=Monday, 6=Sunday)';
COMMENT ON COLUMN rebalance_schedule.day_of_month IS 'Day of month for monthly rebalancing (1-31)';
COMMENT ON COLUMN rebalance_schedule.only_if_thresholds_exceeded IS 'Only rebalance if drift exceeds threshold';


CREATE TABLE rebalance_execution (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    schedule_id UUID REFERENCES rebalance_schedule(id) ON DELETE SET NULL,
    
    execution_type VARCHAR(30) NOT NULL,
    portfolio_value_before DECIMAL(20, 2) NOT NULL,
    total_drift_percent DECIMAL(10, 4) NOT NULL,
    trades_executed INTEGER NOT NULL DEFAULT 0,
    
    completed_successfully BOOLEAN NOT NULL,
    error_message TEXT,
    
    executed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT rebalance_execution_type_check CHECK (
        execution_type IN ('scheduled', 'manual', 'threshold_triggered', 'api_triggered')
    ),
    CONSTRAINT rebalance_execution_portfolio_positive CHECK (portfolio_value_before >= 0),
    CONSTRAINT rebalance_execution_trades_positive CHECK (trades_executed >= 0)
);

CREATE INDEX idx_rebalance_execution_user_id ON rebalance_execution(user_id);
CREATE INDEX idx_rebalance_execution_schedule_id ON rebalance_execution(schedule_id);
CREATE INDEX idx_rebalance_execution_executed_at ON rebalance_execution(executed_at DESC);
CREATE INDEX idx_rebalance_execution_user_time ON rebalance_execution(user_id, executed_at DESC);
CREATE INDEX idx_rebalance_execution_type ON rebalance_execution(execution_type);
CREATE INDEX idx_rebalance_execution_success ON rebalance_execution(completed_successfully);

COMMENT ON TABLE rebalance_execution IS 'History of portfolio rebalancing executions';
COMMENT ON COLUMN rebalance_execution.execution_type IS 'What triggered the rebalance: scheduled, manual, threshold_triggered, api_triggered';
COMMENT ON COLUMN rebalance_execution.total_drift_percent IS 'Portfolio drift percentage at time of rebalancing';
COMMENT ON COLUMN rebalance_execution.trades_executed IS 'Number of trades executed during rebalancing';


CREATE TRIGGER update_rebalance_schedule_updated_at
    BEFORE UPDATE ON rebalance_schedule
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
