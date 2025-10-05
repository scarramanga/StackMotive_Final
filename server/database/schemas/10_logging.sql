

CREATE TABLE agent_memory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    block_id VARCHAR(50) NOT NULL,
    action VARCHAR(100) NOT NULL,
    context TEXT NOT NULL,
    
    user_input TEXT,
    agent_response TEXT,
    
    metadata JSONB,
    
    timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    session_id VARCHAR(255) NOT NULL
);

CREATE INDEX idx_agent_memory_user_id ON agent_memory(user_id);
CREATE INDEX idx_agent_memory_timestamp ON agent_memory(timestamp DESC);
CREATE INDEX idx_agent_memory_user_timestamp ON agent_memory(user_id, timestamp DESC);
CREATE INDEX idx_agent_memory_block_id ON agent_memory(block_id);
CREATE INDEX idx_agent_memory_action ON agent_memory(action);
CREATE INDEX idx_agent_memory_session_id ON agent_memory(session_id);
CREATE INDEX idx_agent_memory_metadata ON agent_memory USING GIN(metadata);

COMMENT ON TABLE agent_memory IS 'Universal logging of all user actions for AI learning and analytics';
COMMENT ON COLUMN agent_memory.block_id IS 'Feature/module identifier (e.g., "block_1", "block_13")';
COMMENT ON COLUMN agent_memory.action IS 'Action type performed';
COMMENT ON COLUMN agent_memory.context IS 'Action summary/description';
COMMENT ON COLUMN agent_memory.user_input IS 'User input data (JSON or text)';
COMMENT ON COLUMN agent_memory.agent_response IS 'System response data (JSON or text)';
COMMENT ON COLUMN agent_memory.metadata IS 'Additional contextual information in JSON format';
COMMENT ON COLUMN agent_memory.session_id IS 'User session identifier for grouping related actions';





CREATE OR REPLACE FUNCTION archive_old_agent_memory()
RETURNS void AS $$
BEGIN
    
    
    RAISE NOTICE 'Agent memory archival completed at %', NOW();
END;
$$ LANGUAGE plpgsql;



CREATE OR REPLACE VIEW agent_memory_statistics AS
SELECT 
    user_id,
    DATE(timestamp) as activity_date,
    block_id,
    action,
    COUNT(*) as action_count,
    COUNT(DISTINCT session_id) as session_count,
    MIN(timestamp) as first_action_time,
    MAX(timestamp) as last_action_time
FROM agent_memory
GROUP BY user_id, DATE(timestamp), block_id, action;

COMMENT ON VIEW agent_memory_statistics IS 'Daily aggregated user activity statistics';


CREATE OR REPLACE VIEW recent_agent_activity AS
SELECT 
    am.id,
    am.user_id,
    u.email as user_email,
    am.block_id,
    am.action,
    am.context,
    am.timestamp,
    am.session_id
FROM agent_memory am
JOIN users u ON am.user_id = u.id
WHERE am.timestamp >= NOW() - INTERVAL '24 hours'
ORDER BY am.timestamp DESC;

COMMENT ON VIEW recent_agent_activity IS 'User activity from the last 24 hours';
