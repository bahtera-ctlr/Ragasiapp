-- Create employees table untuk menyimpan data karyawan
CREATE TABLE IF NOT EXISTS public.employees (
  id SERIAL PRIMARY KEY,
  nip VARCHAR(50) NOT NULL UNIQUE,
  nama_karyawan VARCHAR(255) NOT NULL,
  grade VARCHAR(50),
  jabatan VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS employees_read_admin ON public.employees;
DROP POLICY IF EXISTS employees_write_admin ON public.employees;

-- RLS Policy: Admin keuangan, super_admin, dan fakturis bisa baca semua
CREATE POLICY employees_read_admin ON public.employees
  FOR SELECT
  USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin_keuangan', 'super_admin', 'fakturis')
  );

-- RLS Policy: Admin keuangan dan super_admin bisa create, update, delete
CREATE POLICY employees_write_admin ON public.employees
  FOR ALL
  USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin_keuangan', 'super_admin')
  )
  WITH CHECK (
    (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin_keuangan', 'super_admin')
  );

-- Create index untuk NIP
CREATE INDEX IF NOT EXISTS idx_employees_nip ON public.employees(nip);

-- Create or replace function untuk update updated_at
CREATE OR REPLACE FUNCTION public.update_employees_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists first
DROP TRIGGER IF EXISTS update_employees_updated_at ON public.employees;

-- Create trigger
CREATE TRIGGER update_employees_updated_at
BEFORE UPDATE ON public.employees
FOR EACH ROW
EXECUTE FUNCTION public.update_employees_updated_at();
