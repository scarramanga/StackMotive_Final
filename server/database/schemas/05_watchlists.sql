

CREATE TABLE watchlists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_public BOOLEAN NOT NULL DEFAULT FALSE,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT watchlists_name_not_empty CHECK (LENGTH(TRIM(name)) > 0)
);

CREATE INDEX idx_watchlists_owner_id ON watchlists(owner_id);
CREATE INDEX idx_watchlists_is_public ON watchlists(is_public) WHERE is_public = TRUE;
CREATE INDEX idx_watchlists_created_at ON watchlists(created_at DESC);
CREATE INDEX idx_watchlists_name ON watchlists(name);

COMMENT ON TABLE watchlists IS 'User-created watchlists for tracking assets';
COMMENT ON COLUMN watchlists.is_public IS 'Whether the watchlist is publicly visible';
COMMENT ON COLUMN watchlists.owner_id IS 'User who created the watchlist';


CREATE TABLE watchlist_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    watchlist_id UUID NOT NULL REFERENCES watchlists(id) ON DELETE CASCADE,
    
    symbol VARCHAR(20) NOT NULL,
    name VARCHAR(255),
    
    price DECIMAL(20, 4),
    change_24h DECIMAL(10, 4) DEFAULT 0,
    market_cap DECIMAL(30, 2),
    
    notes TEXT,
    
    added_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT watchlist_items_symbol_not_empty CHECK (LENGTH(TRIM(symbol)) > 0)
);

CREATE INDEX idx_watchlist_items_watchlist_id ON watchlist_items(watchlist_id);
CREATE INDEX idx_watchlist_items_symbol ON watchlist_items(symbol);
CREATE INDEX idx_watchlist_items_added_at ON watchlist_items(added_at DESC);

COMMENT ON TABLE watchlist_items IS 'Assets within watchlists';
COMMENT ON COLUMN watchlist_items.price IS 'Cached current price (updated periodically)';
COMMENT ON COLUMN watchlist_items.change_24h IS '24-hour price change percentage';
COMMENT ON COLUMN watchlist_items.notes IS 'User notes about this asset';


CREATE TABLE watchlist_shares (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    watchlist_id UUID NOT NULL REFERENCES watchlists(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    shared_with_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    is_read_only BOOLEAN NOT NULL DEFAULT FALSE,
    
    shared_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT watchlist_shares_unique_share UNIQUE(watchlist_id, shared_with_id),
    CONSTRAINT watchlist_shares_no_self_share CHECK (owner_id != shared_with_id)
);

CREATE INDEX idx_watchlist_shares_watchlist_id ON watchlist_shares(watchlist_id);
CREATE INDEX idx_watchlist_shares_owner_id ON watchlist_shares(owner_id);
CREATE INDEX idx_watchlist_shares_shared_with_id ON watchlist_shares(shared_with_id);
CREATE INDEX idx_watchlist_shares_shared_at ON watchlist_shares(shared_at DESC);

COMMENT ON TABLE watchlist_shares IS 'Watchlist sharing permissions between users';
COMMENT ON COLUMN watchlist_shares.is_read_only IS 'Whether the recipient can only view or also edit';
COMMENT ON COLUMN watchlist_shares.owner_id IS 'User who owns the watchlist';
COMMENT ON COLUMN watchlist_shares.shared_with_id IS 'User the watchlist is shared with';


CREATE TRIGGER update_watchlists_updated_at
    BEFORE UPDATE ON watchlists
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
