-- Buat tabel users untuk menyimpan data profil pengguna dengan role
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin_keuangan', 'marketing', 'fakturis', 'admin_logistik', 'admin_ekspedisi', 'super_admin')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS (Row Level Security)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users bisa lihat data diri mereka sendiri
CREATE POLICY user_read_own_data ON users
  FOR SELECT
  USING (auth.uid() = id);

-- RLS Policy: Users bisa update data diri mereka (super_admin bisa update semua)
CREATE POLICY user_update_own_data ON users
  FOR UPDATE
  USING (auth.uid() = id OR (SELECT role FROM users WHERE id = auth.uid()) = 'super_admin')
  WITH CHECK (auth.uid() = id OR (SELECT role FROM users WHERE id = auth.uid()) = 'super_admin');

-- RLS Policy: Super admin bisa create user baru
CREATE POLICY admin_create_users ON users
  FOR INSERT
  WITH CHECK ((SELECT role FROM users WHERE id = auth.uid()) = 'super_admin' OR auth.uid() IS NULL);

-- Create index untuk email dan role
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- Buat function untuk update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Buat trigger untuk update updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
