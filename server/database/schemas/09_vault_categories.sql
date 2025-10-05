

CREATE TABLE vault_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    category_name VARCHAR(255) NOT NULL,
    category_code VARCHAR(50) NOT NULL,
    category_type VARCHAR(50) NOT NULL,
    category_description TEXT,
    category_color VARCHAR(7) DEFAULT '#3B82F6',
    category_icon VARCHAR(100),
    
    target_allocation_percent DECIMAL(10, 4) DEFAULT 0.0000,
    min_allocation_percent DECIMAL(10, 4) DEFAULT 0.0000,
    max_allocation_percent DECIMAL(10, 4) DEFAULT 100.0000,
    
    rebalance_threshold DECIMAL(10, 4) DEFAULT 5.0000,
    rebalance_frequency VARCHAR(20) DEFAULT 'monthly',
    auto_rebalance_enabled BOOLEAN DEFAULT TRUE,
    
    risk_level VARCHAR(20) DEFAULT 'medium',
    max_single_position_percent DECIMAL(10, 4) DEFAULT 10.0000,
    volatility_limit DECIMAL(10, 4) DEFAULT 25.0000,
    
    tax_efficiency_priority INTEGER DEFAULT 5,
    tax_loss_harvesting_enabled BOOLEAN DEFAULT TRUE,
    
    is_active BOOLEAN DEFAULT TRUE,
    display_order INTEGER DEFAULT 1,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT vault_categories_unique_user_code UNIQUE(user_id, category_code),
    CONSTRAINT vault_categories_type_check CHECK (
        category_type IN ('asset_class', 'sector', 'geography', 'strategy', 'risk_level', 'custom')
    ),
    CONSTRAINT vault_categories_allocation_range CHECK (
        target_allocation_percent >= 0 AND target_allocation_percent <= 100 AND
        min_allocation_percent >= 0 AND min_allocation_percent <= 100 AND
        max_allocation_percent >= 0 AND max_allocation_percent <= 100 AND
        min_allocation_percent <= target_allocation_percent AND
        target_allocation_percent <= max_allocation_percent
    ),
    CONSTRAINT vault_categories_rebalance_threshold_check CHECK (
        rebalance_threshold >= 0 AND rebalance_threshold <= 100
    ),
    CONSTRAINT vault_categories_rebalance_frequency_check CHECK (
        rebalance_frequency IN ('daily', 'weekly', 'monthly', 'quarterly', 'annually', 'never')
    ),
    CONSTRAINT vault_categories_risk_level_check CHECK (
        risk_level IN ('very_low', 'low', 'medium', 'high', 'very_high')
    ),
    CONSTRAINT vault_categories_position_percent_check CHECK (
        max_single_position_percent > 0 AND max_single_position_percent <= 100
    ),
    CONSTRAINT vault_categories_volatility_check CHECK (
        volatility_limit > 0 AND volatility_limit <= 100
    ),
    CONSTRAINT vault_categories_tax_priority_range CHECK (
        tax_efficiency_priority >= 1 AND tax_efficiency_priority <= 10
    ),
    CONSTRAINT vault_categories_display_order_positive CHECK (display_order > 0),
    CONSTRAINT vault_categories_color_format_check CHECK (
        category_color ~ '^#[0-9A-Fa-f]{6}$'
    )
);

CREATE INDEX idx_vault_categories_user_id ON vault_categories(user_id);
CREATE INDEX idx_vault_categories_category_type ON vault_categories(category_type);
CREATE INDEX idx_vault_categories_is_active ON vault_categories(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_vault_categories_user_active ON vault_categories(user_id, is_active);
CREATE INDEX idx_vault_categories_display_order ON vault_categories(user_id, display_order);

COMMENT ON TABLE vault_categories IS 'User-defined asset allocation categories';
COMMENT ON COLUMN vault_categories.category_type IS 'Category classification: asset_class, sector, geography, strategy, risk_level, custom';
COMMENT ON COLUMN vault_categories.target_allocation_percent IS 'Target allocation percentage for this category (0-100)';
COMMENT ON COLUMN vault_categories.rebalance_threshold IS 'Drift % that triggers rebalancing';
COMMENT ON COLUMN vault_categories.risk_level IS 'Risk classification: very_low, low, medium, high, very_high';
COMMENT ON COLUMN vault_categories.tax_efficiency_priority IS 'Tax efficiency priority (1-10, higher = more important)';


CREATE TABLE asset_category_assignment (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES vault_categories(id) ON DELETE CASCADE,
    
    symbol VARCHAR(20) NOT NULL,
    asset_name VARCHAR(255),
    asset_class VARCHAR(50),
    sector VARCHAR(100),
    market VARCHAR(50) DEFAULT 'NZX',
    
    assignment_type VARCHAR(20) DEFAULT 'manual',
    assignment_rule TEXT,
    assignment_confidence DECIMAL(5, 4) DEFAULT 1.0000,
    
    target_weight_in_category DECIMAL(10, 4) DEFAULT 0.0000,
    
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT asset_category_assignment_assignment_type_check CHECK (
        assignment_type IN ('manual', 'auto', 'rule_based', 'ai_suggested')
    ),
    CONSTRAINT asset_category_assignment_confidence_range CHECK (
        assignment_confidence >= 0 AND assignment_confidence <= 1
    ),
    CONSTRAINT asset_category_assignment_weight_range CHECK (
        target_weight_in_category >= 0 AND target_weight_in_category <= 100
    )
);

CREATE INDEX idx_asset_category_assignment_user_id ON asset_category_assignment(user_id);
CREATE INDEX idx_asset_category_assignment_category_id ON asset_category_assignment(category_id);
CREATE INDEX idx_asset_category_assignment_symbol ON asset_category_assignment(symbol);
CREATE INDEX idx_asset_category_assignment_is_active ON asset_category_assignment(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_asset_category_assignment_user_symbol ON asset_category_assignment(user_id, symbol);
CREATE INDEX idx_asset_category_assignment_user_category ON asset_category_assignment(user_id, category_id);

COMMENT ON TABLE asset_category_assignment IS 'Maps individual assets to vault categories';
COMMENT ON COLUMN asset_category_assignment.assignment_type IS 'How asset was assigned: manual, auto, rule_based, ai_suggested';
COMMENT ON COLUMN asset_category_assignment.assignment_confidence IS 'Confidence in assignment (0-1, used for auto assignments)';
COMMENT ON COLUMN asset_category_assignment.target_weight_in_category IS 'Target weight within the category (0-100%)';


CREATE TRIGGER update_vault_categories_updated_at
    BEFORE UPDATE ON vault_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_asset_category_assignment_updated_at
    BEFORE UPDATE ON asset_category_assignment
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
