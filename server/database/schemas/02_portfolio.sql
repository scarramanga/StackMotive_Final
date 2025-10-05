

CREATE TABLE portfolio_summary (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    vault_id VARCHAR(100) NOT NULL,
    
    portfolio_value DECIMAL(20, 2) NOT NULL DEFAULT 0.00,
    total_gain_loss DECIMAL(20, 2) NOT NULL DEFAULT 0.00,
    total_gain_loss_percent DECIMAL(10, 4) NOT NULL DEFAULT 0.0000,
    day_gain_loss DECIMAL(20, 2) NOT NULL DEFAULT 0.00,
    day_gain_loss_percent DECIMAL(10, 4) NOT NULL DEFAULT 0.0000,
    
    cash_balance DECIMAL(20, 2) NOT NULL DEFAULT 0.00,
    invested_amount DECIMAL(20, 2) NOT NULL DEFAULT 0.00,
    number_of_holdings INTEGER NOT NULL DEFAULT 0,
    
    last_updated TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT portfolio_summary_unique_user_vault UNIQUE(user_id, vault_id),
    CONSTRAINT portfolio_summary_value_positive CHECK (portfolio_value >= 0),
    CONSTRAINT portfolio_summary_holdings_positive CHECK (number_of_holdings >= 0)
);

CREATE INDEX idx_portfolio_summary_user_id ON portfolio_summary(user_id);
CREATE INDEX idx_portfolio_summary_vault_id ON portfolio_summary(vault_id);
CREATE INDEX idx_portfolio_summary_user_vault ON portfolio_summary(user_id, vault_id);
CREATE INDEX idx_portfolio_summary_last_updated ON portfolio_summary(last_updated DESC);

COMMENT ON TABLE portfolio_summary IS 'High-level portfolio metrics and summary data per vault';
COMMENT ON COLUMN portfolio_summary.vault_id IS 'Portfolio/vault identifier for multi-portfolio support';
COMMENT ON COLUMN portfolio_summary.portfolio_value IS 'Total current market value of portfolio';
COMMENT ON COLUMN portfolio_summary.invested_amount IS 'Total amount invested (cost basis)';


CREATE TABLE portfolio_holdings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    vault_id VARCHAR(100),
    
    symbol VARCHAR(20) NOT NULL,
    asset_name VARCHAR(255),
    asset_class VARCHAR(50) NOT NULL DEFAULT 'equity',
    allocation_type VARCHAR(50),
    
    quantity DECIMAL(20, 8) NOT NULL,
    avg_cost DECIMAL(20, 4) NOT NULL,
    current_price DECIMAL(20, 4) NOT NULL,
    market_value DECIMAL(20, 2) NOT NULL,
    
    total_gain_loss DECIMAL(20, 2) NOT NULL DEFAULT 0.00,
    total_gain_loss_percent DECIMAL(10, 4) NOT NULL DEFAULT 0.0000,
    day_gain_loss DECIMAL(20, 2) NOT NULL DEFAULT 0.00,
    day_gain_loss_percent DECIMAL(10, 4) NOT NULL DEFAULT 0.0000,
    
    last_updated TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT portfolio_holdings_quantity_positive CHECK (quantity > 0),
    CONSTRAINT portfolio_holdings_asset_class_check CHECK (
        asset_class IN ('equity', 'crypto', 'bond', 'cash', 'fund', 'commodity', 'alternative')
    )
);

CREATE INDEX idx_portfolio_holdings_user_id ON portfolio_holdings(user_id);
CREATE INDEX idx_portfolio_holdings_vault_id ON portfolio_holdings(vault_id);
CREATE INDEX idx_portfolio_holdings_symbol ON portfolio_holdings(symbol);
CREATE INDEX idx_portfolio_holdings_user_vault ON portfolio_holdings(user_id, vault_id);
CREATE INDEX idx_portfolio_holdings_asset_class ON portfolio_holdings(asset_class);
CREATE INDEX idx_portfolio_holdings_last_updated ON portfolio_holdings(last_updated DESC);

COMMENT ON TABLE portfolio_holdings IS 'Individual asset positions within portfolios';
COMMENT ON COLUMN portfolio_holdings.symbol IS 'Asset ticker symbol';
COMMENT ON COLUMN portfolio_holdings.quantity IS 'Number of shares/units held (supports fractional)';
COMMENT ON COLUMN portfolio_holdings.asset_class IS 'Asset classification for allocation analysis';


CREATE TABLE portfolio_position (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    symbol VARCHAR(20) NOT NULL,
    name VARCHAR(255),
    
    quantity DECIMAL(20, 8) NOT NULL,
    avg_price DECIMAL(20, 4) NOT NULL,
    current_price DECIMAL(20, 4),
    
    asset_class VARCHAR(50) NOT NULL DEFAULT 'equity',
    account VARCHAR(100) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    
    sync_source VARCHAR(50) NOT NULL,
    last_updated TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT portfolio_position_unique_user_symbol_account UNIQUE(user_id, symbol, account),
    CONSTRAINT portfolio_position_quantity_positive CHECK (quantity > 0),
    CONSTRAINT portfolio_position_asset_class_check CHECK (
        asset_class IN ('equity', 'crypto', 'fund', 'bond', 'cash', 'commodity', 'alternative')
    ),
    CONSTRAINT portfolio_position_sync_source_check CHECK (
        sync_source IN ('csv', 'ibkr', 'kucoin', 'kraken', 'tiger', 'manual')
    )
);

CREATE INDEX idx_portfolio_position_user_id ON portfolio_position(user_id);
CREATE INDEX idx_portfolio_position_symbol ON portfolio_position(symbol);
CREATE INDEX idx_portfolio_position_account ON portfolio_position(account);
CREATE INDEX idx_portfolio_position_sync_source ON portfolio_position(sync_source);
CREATE INDEX idx_portfolio_position_user_symbol ON portfolio_position(user_id, symbol);

COMMENT ON TABLE portfolio_position IS 'Detailed position tracking with broker synchronization metadata';
COMMENT ON COLUMN portfolio_position.sync_source IS 'Source of position data: csv, ibkr, kucoin, kraken, tiger, manual';
COMMENT ON COLUMN portfolio_position.account IS 'Account/broker name for multi-account support';


CREATE TABLE portfolio_sync_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    sync_source VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL,
    records_imported INTEGER NOT NULL DEFAULT 0,
    error_message TEXT,
    filename VARCHAR(500),
    
    sync_started TIMESTAMPTZ NOT NULL,
    sync_completed TIMESTAMPTZ NOT NULL,
    
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT portfolio_sync_log_status_check CHECK (
        status IN ('success', 'error', 'partial', 'pending')
    ),
    CONSTRAINT portfolio_sync_log_records_positive CHECK (records_imported >= 0),
    CONSTRAINT portfolio_sync_log_sync_source_check CHECK (
        sync_source IN ('csv', 'ibkr', 'kucoin', 'kraken', 'tiger', 'manual')
    )
);

CREATE INDEX idx_portfolio_sync_log_user_id ON portfolio_sync_log(user_id);
CREATE INDEX idx_portfolio_sync_log_source ON portfolio_sync_log(sync_source);
CREATE INDEX idx_portfolio_sync_log_status ON portfolio_sync_log(status);
CREATE INDEX idx_portfolio_sync_log_created ON portfolio_sync_log(created_at DESC);
CREATE INDEX idx_portfolio_sync_log_user_time ON portfolio_sync_log(user_id, created_at DESC);

COMMENT ON TABLE portfolio_sync_log IS 'Audit trail of portfolio synchronization operations';
COMMENT ON COLUMN portfolio_sync_log.status IS 'Sync result: success, error, partial, pending';
COMMENT ON COLUMN portfolio_sync_log.metadata IS 'Additional sync details in JSON format';


CREATE TRIGGER update_portfolio_summary_updated_at
    BEFORE UPDATE ON portfolio_summary
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_portfolio_holdings_updated_at
    BEFORE UPDATE ON portfolio_holdings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_portfolio_position_updated_at
    BEFORE UPDATE ON portfolio_position
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
