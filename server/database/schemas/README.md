# StackMotive PostgreSQL Database Schema

## Overview

This directory contains the complete PostgreSQL schema for the StackMotive retail investor protection platform. The schema has been designed based on comprehensive data requirements analysis covering 22 persistent tables with 400+ fields.

## Schema Organization

The schema is divided into 10 logical modules, each in a separate SQL file:

1. **01_authentication.sql** - User authentication and session management
2. **02_portfolio.sql** - Portfolio summaries, holdings, and sync operations
3. **03_trading.sql** - Trading automation rules (DCA, Stop-Loss)
4. **04_rebalancing.sql** - Portfolio rebalancing schedules and execution history
5. **05_watchlists.sql** - Asset watchlists with sharing capabilities
6. **06_preferences.sql** - User configuration and theme preferences
7. **07_onboarding.sql** - User onboarding progress and trading preferences
8. **08_journaling.sql** - Trade journaling, logs, and analysis
9. **09_vault_categories.sql** - Asset allocation categories and assignments
10. **10_logging.sql** - Universal logging system (AgentMemory)

## Schema Design Principles

### Data Types
- **Primary Keys**: UUID (not INTEGER) for distributed system compatibility
- **Money/Decimals**: DECIMAL(20,2) or DECIMAL(10,4) for precision
- **Timestamps**: TIMESTAMPTZ for timezone awareness
- **JSON Data**: JSONB for efficient querying and indexing
- **Enums**: CHECK constraints for type safety

### Referential Integrity
- All foreign keys defined with appropriate CASCADE rules
- ON DELETE CASCADE for dependent data
- ON DELETE SET NULL for optional relationships

### Performance Optimization
- Indexes on all foreign keys
- Composite indexes for common query patterns
- Partial indexes for filtered queries (e.g., WHERE is_active = TRUE)
- GIN indexes for JSONB columns

### Naming Conventions
- Tables: snake_case, plural for collection tables
- Columns: snake_case
- Indexes: idx_{table}_{columns}
- Constraints: {table}_{column}_{type}

## Database Tables

### Authentication & User Management (01_authentication.sql)
```
users (22 columns)
├── Authentication: email, hashed_password
├── Status: tier, is_active, is_admin
├── Onboarding: has_completed_onboarding, onboarding_step
└── Preferences: preferred_currency

user_sessions (12 columns) - OPTIONAL for future use
├── Session tracking: session_token, refresh_token
├── Device info: ip_address, user_agent, device_info
└── Lifecycle: expires_at, last_activity_at, is_active
```

### Portfolio Management (02_portfolio.sql)
```
portfolio_summary (12 columns)
├── Identification: user_id, vault_id
├── Metrics: portfolio_value, total_gain_loss, day_gain_loss
└── Status: cash_balance, invested_amount, number_of_holdings

portfolio_holdings (17 columns)
├── Asset info: symbol, asset_name, asset_class
├── Position: quantity, avg_cost, current_price, market_value
└── Performance: total_gain_loss, day_gain_loss

portfolio_position (13 columns)
├── Detailed tracking with broker metadata
└── Sync source: csv, ibkr, kucoin, kraken, tiger, manual

portfolio_sync_log (10 columns)
└── Audit trail of portfolio synchronization operations
```

### Trading Automation (03_trading.sql)
```
user_trade_rule (10 columns)
├── DCA Rules: threshold, frequency, amount
└── Stop-Loss Rules: threshold (stop percentage)
```

### Rebalancing (04_rebalancing.sql)
```
rebalance_schedule (15 columns)
├── Schedule: frequency, threshold, day_of_week, time_of_day
└── Constraints: max_trades_per_session, exclude_weekends

rebalance_execution (8 columns)
└── Execution history: type, portfolio_value, trades_executed, success
```

### Watchlists (05_watchlists.sql)
```
watchlists (6 columns)
└── User-created watchlists with public/private visibility

watchlist_items (8 columns)
└── Assets in watchlists with cached market data

watchlist_shares (6 columns)
└── Sharing permissions between users
```

### User Preferences (06_preferences.sql)
```
user_preferences (30 columns)
├── Display: theme, language, timezone, chart_type
├── Data: data_refresh_interval, real_time_data
├── Notifications: email, push, sms settings
└── Trading: default_order_type, confirm_orders

user_theme_preferences (13 columns)
└── Detailed UI customization: colors, fonts, layout
```

### Onboarding (07_onboarding.sql)
```
user_onboarding_progress (38 columns)
├── Progress: current_step, completed_steps, is_complete
├── Profile: trading_experience, risk_tolerance, investment_horizon
├── Personal: full_name, date_of_birth, phone_number
├── Tax: tax_residency, tax_identification_number
└── Legal: terms_accepted, privacy_policy_accepted

user_trading_preferences (32 columns)
├── Style: trading_style, strategy_preference
├── Position Sizing: default_position_size, max_position_size
├── Risk: stop_loss_percentage, take_profit_percentage
├── Allocation: cash, equity, bond, alternative targets
└── Trading Mode: paper_trading_enabled, real_trading_enabled
```

### Trade Journaling (08_journaling.sql)
```
journal_entries (22 columns)
├── Entry details: title, content, entry_type
├── Trade reference: trade_id, asset_symbol
└── Analysis: confidence_level, success_rating, lessons_learned

manual_trade_logs (38 columns)
├── Execution: symbol, trade_type, entry_price, quantity
├── Risk: target_price, stop_loss_price, risk_reward_ratio
├── Strategy: strategy, time_horizon, conviction_level
├── Position tracking: current_price, unrealized_pnl
└── Exit: exit_price, exit_date, realized_pnl

trade_analysis (20 columns)
├── Pre-trade: pre_trade_analysis, entry_criteria, risk_assessment
├── During: mid_trade_notes, adjustment_reasons, emotional_state
├── Post-trade: what_went_right, what_went_wrong, key_learnings
└── Quality: execution_quality, timing_quality, emotional_discipline
```

### Vault Categories (09_vault_categories.sql)
```
vault_categories (18 columns)
├── Details: category_name, category_code, category_type
├── Allocation: target, min, max allocation percentages
├── Rebalancing: threshold, frequency, auto_rebalance_enabled
├── Risk: risk_level, max_single_position_percent, volatility_limit
└── Tax: tax_efficiency_priority, tax_loss_harvesting_enabled

asset_category_assignment (12 columns)
├── Asset: symbol, asset_name, asset_class, sector
└── Assignment: assignment_type, confidence, target_weight
```

### Universal Logging (10_logging.sql)
```
agent_memory (9 columns)
├── Context: block_id, action, context
├── Data: user_input, agent_response, metadata (JSONB)
└── Session: timestamp, session_id
```

## Installation Instructions

### Prerequisites
- PostgreSQL 14+ (for enhanced JSONB features)
- UUID extension enabled

### Deployment Steps

1. **Create Database**
```sql
CREATE DATABASE stackmotive_production;
\c stackmotive_production
```

2. **Execute Schema Files in Order**
```bash
psql -U postgres -d stackmotive_production -f 01_authentication.sql
psql -U postgres -d stackmotive_production -f 02_portfolio.sql
psql -U postgres -d stackmotive_production -f 03_trading.sql
psql -U postgres -d stackmotive_production -f 04_rebalancing.sql
psql -U postgres -d stackmotive_production -f 05_watchlists.sql
psql -U postgres -d stackmotive_production -f 06_preferences.sql
psql -U postgres -d stackmotive_production -f 07_onboarding.sql
psql -U postgres -d stackmotive_production -f 08_journaling.sql
psql -U postgres -d stackmotive_production -f 09_vault_categories.sql
psql -U postgres -d stackmotive_production -f 10_logging.sql
```

3. **Create Application User and Grant Permissions**
```sql
CREATE USER stackmotive_app WITH PASSWORD 'your_secure_password';

-- Grant table permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO stackmotive_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO stackmotive_app;

-- Grant default permissions for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public 
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO stackmotive_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public 
    GRANT USAGE, SELECT ON SEQUENCES TO stackmotive_app;
```

## Data Relationships

### Core Relationships
```
users (1) → (Many) portfolio_summary
users (1) → (Many) portfolio_holdings
users (1) → (Many) portfolio_position
users (1) → (Many) user_trade_rule
users (1) → (1) rebalance_schedule
users (1) → (Many) watchlists
users (1) → (1) user_preferences
users (1) → (1) user_theme_preferences
users (1) → (1) user_onboarding_progress
users (1) → (1) user_trading_preferences
users (1) → (Many) vault_categories
users (1) → (Many) journal_entries
users (1) → (Many) manual_trade_logs
users (1) → (Many) agent_memory

portfolio_summary (1) → (Many) portfolio_holdings
vault_categories (1) → (Many) asset_category_assignment
watchlists (1) → (Many) watchlist_items
watchlists (1) → (Many) watchlist_shares
journal_entries (1) → (1) manual_trade_logs
manual_trade_logs (1) → (1) trade_analysis
rebalance_schedule (1) → (Many) rebalance_execution
```

## Migration from SQLite

### Key Differences

| SQLite | PostgreSQL |
|--------|------------|
| INTEGER AUTOINCREMENT | UUID DEFAULT uuid_generate_v4() |
| REAL | DECIMAL(20,2) or DECIMAL(10,4) |
| TEXT (timestamps) | TIMESTAMPTZ |
| TEXT (JSON) | JSONB |
| Limited constraints | Full CHECK constraints |
| datetime('now') | CURRENT_TIMESTAMP |

### Migration Strategy

1. **Phase 1**: Core authentication and portfolio (01-02)
2. **Phase 2**: Trading features (03-04)
3. **Phase 3**: User configuration (05-07)
4. **Phase 4**: Advanced features (08-09)
5. **Phase 5**: Analytics (10 - consider partitioning)

### Data Migration Considerations

- **UUID Generation**: Existing INTEGER IDs need UUID mapping
- **JSON Conversion**: TEXT JSON → JSONB (automatic casting works)
- **Timestamp Conversion**: TEXT dates → TIMESTAMPTZ
- **Decimal Precision**: REAL → DECIMAL (check for precision loss)

## Performance Tuning

### High-Volume Tables
- `agent_memory` - Consider monthly partitioning
- `portfolio_holdings` - Index on (user_id, vault_id, symbol)
- `manual_trade_logs` - Index on (user_id, trade_date DESC)

### Query Optimization
- Use prepared statements for common queries
- Implement connection pooling
- Consider materialized views for dashboard metrics
- Use partial indexes for filtered queries

### Monitoring
- Track slow queries (log queries > 100ms)
- Monitor table bloat and run VACUUM regularly
- Monitor index usage and remove unused indexes
- Set up pg_stat_statements for query analysis

## Maintenance

### Regular Tasks
- **Daily**: Monitor database size and slow queries
- **Weekly**: Analyze query patterns, update statistics
- **Monthly**: Review and archive old agent_memory logs
- **Quarterly**: Review index usage, optimize as needed

### Backup Strategy
- **Full Backup**: Daily at 2 AM UTC
- **Incremental**: Every 6 hours
- **Point-in-Time Recovery**: WAL archiving enabled
- **Retention**: 30 days online, 1 year archived

## Security Considerations

### Access Control
- Application user has limited DML permissions only
- Admin user for DDL operations kept separate
- Row-level security policies can be added per tenant

### Data Protection
- Passwords stored as bcrypt hashes
- Sensitive PII fields should be encrypted at application layer
- Consider encrypting: hashed_password, tax_identification_number

### Audit Trail
- All user actions logged in agent_memory
- Database triggers log UPDATE/DELETE on critical tables
- Consider adding audit columns: created_by, updated_by

## Future Enhancements

### Planned Features
- Row-level security for multi-tenancy
- Partitioning for agent_memory (by month)
- Materialized views for analytics dashboards
- Full-text search on journal entries
- TimescaleDB extension for time-series data
- PostGIS extension for geographic data (if needed)

### Market Intelligence Storage
The following features currently return mock data and will need persistent storage:
- Market data (prices, historical data)
- Institutional flow tracking
- Smart money signals
- Dark pool trades
- Insider trading filings
- Sovereign/macro signals
- Backtest results

## Support & Documentation

### Related Documentation
- `/docs/api/` - API endpoint documentation
- `/docs/architecture/` - System architecture
- `/server/database/migrations/` - Alembic migration scripts

### Contact
- Technical Lead: andy@sovereignassets.org
- Repository: scarramanga/StackMotive_Final

---

**Last Updated**: October 5, 2025  
**Schema Version**: 1.0.0  
**PostgreSQL Compatibility**: 14+
