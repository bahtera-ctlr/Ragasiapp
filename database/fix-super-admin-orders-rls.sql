-- Fix: Izinkan super_admin membuat order dan invoice
-- (dibutuhkan saat menyetujui pengajuan diskon)
-- Jalankan di Supabase SQL Editor

-- 1. Izinkan super_admin INSERT ke tabel orders
CREATE POLICY orders_super_admin_create ON orders
  FOR INSERT
  WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) = 'super_admin'
  );

-- 2. Izinkan super_admin INSERT ke tabel invoices
CREATE POLICY invoices_super_admin_create ON invoices
  FOR INSERT
  WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) = 'super_admin'
  );

-- Verifikasi policy yang ada
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('orders', 'invoices')
ORDER BY tablename, policyname;
