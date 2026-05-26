-- Create sales_report table
-- Stores sales achievement report uploaded by super admin, readable by marketing.
CREATE TABLE IF NOT EXISTS sales_report (
  id            UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  no_outlet     TEXT,
  nama_outlet   TEXT    NOT NULL,
  status        TEXT,
  me            TEXT,
  cluster       TEXT,
  kelompok      TEXT,
  target        NUMERIC DEFAULT 0,
  pencapaian    NUMERIC DEFAULT 0,
  pt_persen     NUMERIC DEFAULT 0,
  pt_selisih    NUMERIC DEFAULT 0,
  t_poin        NUMERIC DEFAULT 0,
  p_poin        NUMERIC DEFAULT 0,
  poin_persen   NUMERIC DEFAULT 0,
  report_name   TEXT,                                                        -- CSV filename
  created_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS
ALTER TABLE sales_report ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view
CREATE POLICY "Authenticated users can view sales report" ON sales_report
  FOR SELECT USING (auth.role() = 'authenticated');

-- Only super_admin can write
CREATE POLICY "Super admins can insert sales report" ON sales_report
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'super_admin')
  );

CREATE POLICY "Super admins can delete sales report" ON sales_report
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'super_admin')
  );

-- Indexes for common filter columns
CREATE INDEX IF NOT EXISTS idx_sales_report_me      ON sales_report(me);
CREATE INDEX IF NOT EXISTS idx_sales_report_cluster ON sales_report(cluster);
CREATE INDEX IF NOT EXISTS idx_sales_report_status  ON sales_report(status);
