

CREATE TABLE user_trade_rule (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    symbol VARCHAR(20) NOT NULL,
    
    rule_type VARCHAR(20) NOT NULL,
    threshold DECIMAL(20, 4) NOT NULL,
    frequency VARCHAR(20),
    amount DECIMAL(20, 2),
    
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    last_triggered TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT user_trade_rule_type_check CHECK (rule_type IN ('DCA', 'Stop-Loss')),
    CONSTRAINT user_trade_rule_frequency_check CHECK (
        frequency IS NULL OR frequency IN ('daily', 'weekly', 'biweekly', 'monthly', 'quarterly')
    ),
    CONSTRAINT user_trade_rule_threshold_positive CHECK (threshold > 0),
    CONSTRAINT user_trade_rule_amount_positive CHECK (amount IS NULL OR amount > 0),
    CONSTRAINT user_trade_rule_dca_requires_frequency CHECK (
        rule_type != 'DCA' OR frequency IS NOT NULL
    ),
    CONSTRAINT user_trade_rule_dca_requires_amount CHECK (
        rule_type != 'DCA' OR amount IS NOT NULL
    )
);

CREATE INDEX idx_user_trade_rule_user_id ON user_trade_rule(user_id);
CREATE INDEX idx_user_trade_rule_symbol ON user_trade_rule(symbol);
CREATE INDEX idx_user_trade_rule_type ON user_trade_rule(rule_type);
CREATE INDEX idx_user_trade_rule_enabled ON user_trade_rule(enabled) WHERE enabled = TRUE;
CREATE INDEX idx_user_trade_rule_user_symbol ON user_trade_rule(user_id, symbol);
CREATE INDEX idx_user_trade_rule_user_symbol_type ON user_trade_rule(user_id, symbol, rule_type);
CREATE INDEX idx_user_trade_rule_last_triggered ON user_trade_rule(last_triggered DESC);

COMMENT ON TABLE user_trade_rule IS 'DCA and Stop-Loss trading automation rules';
COMMENT ON COLUMN user_trade_rule.rule_type IS 'Type of automation: DCA (Dollar Cost Averaging) or Stop-Loss';
COMMENT ON COLUMN user_trade_rule.threshold IS 'Target price for DCA or stop percentage for Stop-Loss';
COMMENT ON COLUMN user_trade_rule.frequency IS 'DCA frequency: daily, weekly, biweekly, monthly, quarterly';
COMMENT ON COLUMN user_trade_rule.amount IS 'Dollar amount to invest for DCA rules';
COMMENT ON COLUMN user_trade_rule.enabled IS 'Whether the rule is currently active';
COMMENT ON COLUMN user_trade_rule.last_triggered IS 'Last time this rule was executed';


CREATE TRIGGER update_user_trade_rule_updated_at
    BEFORE UPDATE ON user_trade_rule
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
