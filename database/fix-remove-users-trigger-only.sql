-- FIX: Drop ONLY the trigger on users table, keep function for other tables
DROP TRIGGER IF EXISTS update_users_updated_at ON users;

-- Verify trigger is gone
SELECT trigger_name FROM information_schema.triggers WHERE event_object_table = 'users';

-- Check user role is still super_admin
SELECT id, email, name, role FROM users WHERE email = 'superadmin@test.com' LIMIT 1;
