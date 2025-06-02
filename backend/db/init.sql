-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
    username VARCHAR(255) NOT NULL,
    password_hash VARCHAR NOT NULL,
    CONSTRAINT users_username_unique UNIQUE (username)
);

-- Create groups table
CREATE TABLE groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    saved_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create user_to_group table
CREATE TABLE user_to_group (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, group_id)
);

-- Create messages table
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4() NOT NULL,
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    message VARCHAR NOT NULL,
    sent_by UUID NOT NULL REFERENCES users(id),
    sent_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    saved_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX idx_messages_group_id ON messages(group_id);
CREATE INDEX idx_user_to_group_group_id ON user_to_group(group_id);
CREATE INDEX idx_user_to_group_user_id ON user_to_group(user_id);

-- Create a view for safe user data access
CREATE VIEW user_details AS
    SELECT id, username
    FROM users;

-- Enable row level security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_to_group ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY user_self_access ON users
    FOR ALL
    USING (id = NULLIF(current_setting('request.jwt.claim.user_id', true), '')::UUID);

CREATE POLICY user_self_access ON user_details
    FOR SELECT
    USING (id = NULLIF(current_setting('request.jwt.claim.user_id', true), '')::UUID);

CREATE POLICY group_read_access ON groups
    FOR SELECT
    TO PUBLIC
    USING (true);

CREATE POLICY group_delete_access ON groups
    FOR DELETE
    USING (created_by = NULLIF(current_setting('request.jwt.claim.user_id', true), '')::UUID);

CREATE POLICY user_to_group_read_access ON user_to_group
    FOR SELECT
    USING (user_id = NULLIF(current_setting('request.jwt.claim.user_id', true), '')::UUID);

CREATE POLICY message_group_member_access ON messages
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_to_group
            WHERE user_id = NULLIF(current_setting('request.jwt.claim.user_id', true), '')::UUID
            AND group_id = messages.group_id
        )
    );

-- Function to get user details
CREATE OR REPLACE FUNCTION get_user_details(user_id UUID)
RETURNS TABLE (id UUID, username VARCHAR) AS $$
BEGIN
    RETURN QUERY
    SELECT ud.id, ud.username
    FROM user_details ud
    WHERE ud.id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to join a group
CREATE OR REPLACE FUNCTION join_group(p_group_id UUID)
RETURNS VOID AS $$
DECLARE
    v_user_id UUID;
BEGIN
    v_user_id := NULLIF(current_setting('request.jwt.claim.user_id', true), '')::UUID;
    
    INSERT INTO user_to_group (user_id, group_id)
    VALUES (v_user_id, p_group_id)
    ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to leave a group
CREATE OR REPLACE FUNCTION leave_group(p_group_id UUID)
RETURNS VOID AS $$
DECLARE
    v_user_id UUID;
BEGIN
    v_user_id := NULLIF(current_setting('request.jwt.claim.user_id', true), '')::UUID;
    
    DELETE FROM user_to_group
    WHERE user_id = v_user_id AND group_id = p_group_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create a group
CREATE OR REPLACE FUNCTION create_group(
    p_name VARCHAR,
    p_id UUID DEFAULT uuid_generate_v4(),
    p_created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
)
RETURNS groups AS $$
DECLARE
    v_user_id UUID;
    v_group groups;
BEGIN
    v_user_id := NULLIF(current_setting('request.jwt.claim.user_id', true), '')::UUID;
    
    INSERT INTO groups (id, name, created_by, created_at, saved_at)
    VALUES (p_id, p_name, v_user_id, p_created_at, p_created_at)
    RETURNING * INTO v_group;

    -- Automatically add creator to the group
    INSERT INTO user_to_group (user_id, group_id)
    VALUES (v_user_id, v_group.id);

    RETURN v_group;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's groups
CREATE OR REPLACE FUNCTION get_user_groups(p_user_id UUID)
RETURNS SETOF groups AS $$
BEGIN
    IF p_user_id = NULLIF(current_setting('request.jwt.claim.user_id', true), '')::UUID THEN
        RETURN QUERY
        SELECT g.*
        FROM groups g
        JOIN user_to_group utg ON g.id = utg.group_id
        WHERE utg.user_id = p_user_id;
    ELSE
        RETURN;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create a message
CREATE OR REPLACE FUNCTION create_message(
    p_group_id UUID,
    p_message VARCHAR,
    p_sent_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
)
RETURNS messages AS $$
DECLARE
    v_user_id UUID;
    v_message messages;
BEGIN
    v_user_id := NULLIF(current_setting('request.jwt.claim.user_id', true), '')::UUID;
    
    -- Check if user is member of the group
    IF NOT EXISTS (
        SELECT 1 FROM user_to_group
        WHERE user_id = v_user_id AND group_id = p_group_id
    ) THEN
        RAISE EXCEPTION 'User is not a member of this group';
    END IF;

    INSERT INTO messages (group_id, message, sent_by, sent_at, saved_at)
    VALUES (p_group_id, p_message, v_user_id, p_sent_at, p_sent_at)
    RETURNING * INTO v_message;

    RETURN v_message;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create health check function
CREATE OR REPLACE FUNCTION health()
RETURNS json
LANGUAGE sql
STABLE
AS $$
  SELECT json_build_object(
    'status', 'OK',
    'timestamp', CURRENT_TIMESTAMP
  );
$$;

-- Grant execute permissions to the app user
GRANT EXECUTE ON FUNCTION health() TO app_user;
GRANT EXECUTE ON FUNCTION get_user_details(UUID) TO app_user;
GRANT EXECUTE ON FUNCTION join_group(UUID) TO app_user;
GRANT EXECUTE ON FUNCTION leave_group(UUID) TO app_user;
GRANT EXECUTE ON FUNCTION create_group(VARCHAR, UUID, TIMESTAMPTZ) TO app_user;
GRANT EXECUTE ON FUNCTION get_user_groups(UUID) TO app_user;
GRANT EXECUTE ON FUNCTION create_message(UUID, VARCHAR, TIMESTAMPTZ) TO app_user;

-- Grant table permissions to app user
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO app_user; 