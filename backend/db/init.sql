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

-- Create indexes
CREATE INDEX idx_messages_group_id ON messages(group_id);
CREATE INDEX idx_user_to_group_group_id ON user_to_group(group_id);
CREATE INDEX idx_user_to_group_user_id ON user_to_group(user_id);


-- Enable row level security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_to_group ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY user_self_access ON users
    FOR ALL
    USING (id = NULLIF(current_setting('request.jwt.claims', true)::json->>'user_id', '')::UUID);

CREATE POLICY group_read_access ON groups
    FOR SELECT
    TO PUBLIC
    USING (true);

CREATE POLICY group_delete_access ON groups
    FOR DELETE
    USING (created_by = NULLIF(current_setting('request.jwt.claims', true)::json->>'user_id', '')::UUID);

CREATE POLICY user_to_group_read_access ON user_to_group
    FOR SELECT
    USING (user_id = NULLIF(current_setting('request.jwt.claims', true)::json->>'user_id', '')::UUID);

CREATE POLICY message_group_member_access ON messages
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM user_to_group
            WHERE user_id = NULLIF(current_setting('request.jwt.claims', true)::json->>'user_id', '')::UUID
            AND group_id = messages.group_id
        )
    );

-- Function to get user details
CREATE OR REPLACE FUNCTION get_user_details(user_id UUID)
RETURNS TABLE (id UUID, username VARCHAR) AS $$
BEGIN
    RETURN QUERY
    SELECT u.id, u.username
    FROM users u
    WHERE u.id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to join a group
CREATE OR REPLACE FUNCTION join_group(p_group_id UUID)
RETURNS VOID AS $$
DECLARE
    v_user_id UUID := NULLIF(current_setting('request.jwt.claims', true)::json->>'user_id', '')::UUID;
BEGIN
    INSERT INTO user_to_group (user_id, group_id)
    VALUES (v_user_id, p_group_id)
    ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to leave a group
CREATE OR REPLACE FUNCTION leave_group(p_group_id UUID)
RETURNS VOID AS $$
DECLARE
    v_user_id UUID := NULLIF(current_setting('request.jwt.claims', true)::json->>'user_id', '')::UUID;
BEGIN
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
    v_user_id UUID := NULLIF(current_setting('request.jwt.claims', true)::json->>'user_id', '')::UUID;
    v_group groups;
BEGIN
    INSERT INTO groups (id, name, created_by, created_at, saved_at)
    VALUES (p_id, p_name, v_user_id::UUID, p_created_at, now())
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
DECLARE
    v_user_id UUID := NULLIF(current_setting('request.jwt.claims', true)::json->>'user_id', '')::UUID;
BEGIN
    IF p_user_id = v_user_id THEN
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
    v_user_id UUID := NULLIF(current_setting('request.jwt.claims', true)::json->>'user_id', '')::UUID;
    v_message messages;
BEGIN
    -- Check if user is member of the group
    IF NOT EXISTS (
        SELECT 1 FROM user_to_group
        WHERE user_id = v_user_id AND group_id = p_group_id
    ) THEN
        RAISE EXCEPTION 'User is not a member of this group';
    END IF;

    INSERT INTO messages (group_id, message, sent_by, sent_at, saved_at)
    VALUES (p_group_id, p_message, v_user_id, p_sent_at, now())
    RETURNING * INTO v_message;

    RETURN v_message;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get group messages
CREATE OR REPLACE FUNCTION get_group_messages(p_group_id UUID)
RETURNS TABLE (id UUID, message VARCHAR, username VARCHAR, sent_at TIMESTAMPTZ) AS $$
BEGIN
    RETURN QUERY
    SELECT m.id, m.message, u.username, m.sent_at
    FROM messages m
    LEFT JOIN users u ON m.sent_by = u.id
    WHERE m.group_id = p_group_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to the app user
GRANT EXECUTE ON FUNCTION get_user_details(UUID) TO app_user;
GRANT EXECUTE ON FUNCTION join_group(UUID) TO app_user;
GRANT EXECUTE ON FUNCTION leave_group(UUID) TO app_user;
GRANT EXECUTE ON FUNCTION create_group(VARCHAR, UUID, TIMESTAMPTZ) TO app_user;
GRANT EXECUTE ON FUNCTION get_user_groups(UUID) TO app_user;
GRANT EXECUTE ON FUNCTION create_message(UUID, VARCHAR, TIMESTAMPTZ) TO app_user;

-- Grant table permissions to app user
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO app_user; 

-- Insert test users
INSERT INTO users (id, username, password_hash) VALUES
    ('123e4567-e89b-12d3-a456-426614174000', 'alice', 'dummy_hash'),
    ('223e4567-e89b-12d3-a456-426614174000', 'bob', 'dummy_hash'),
    ('323e4567-e89b-12d3-a456-426614174000', 'charlie', 'dummy_hash'),
    ('423e4567-e89b-12d3-a456-426614174000', 'david', 'dummy_hash'),
    ('523e4567-e89b-12d3-a456-426614174000', 'eve', 'dummy_hash'),
    ('623e4567-e89b-12d3-a456-426614174000', 'frank', 'dummy_hash'),
    ('723e4567-e89b-12d3-a456-426614174000', 'grace', 'dummy_hash'),
    ('823e4567-e89b-12d3-a456-426614174000', 'henry', 'dummy_hash'),
    ('923e4567-e89b-12d3-a456-426614174000', 'ivy', 'dummy_hash'),
    ('a23e4567-e89b-12d3-a456-426614174000', 'jack', 'dummy_hash');