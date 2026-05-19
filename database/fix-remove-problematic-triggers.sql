-- CRITICAL FIX: Drop problematic triggers
-- The trigger update_users_updated_at might be resetting role values

-- Drop the trigger completely
DROP TRIGGER IF EXISTS update_users_updated_at ON users;

-- Drop the function too
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Verify trigger is gone
SELECT trigger_name FROM information_schema.triggers WHERE event_object_table = 'users';

-- Verify user role is still super_admin
SELECT id, email, name, role FROM users WHERE email = 'superadmin@test.com' LIMIT 1;
