-- Create a function for the health check endpoint
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

-- Grant execute permission to the app user
GRANT EXECUTE ON FUNCTION health() TO app_user; 