-- Create discount_requests table
CREATE TABLE IF NOT EXISTS discount_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  marketing_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  discount_percentage NUMERIC NOT NULL,
  reason TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, approved, rejected
  approval_notes TEXT,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create limit_requests table
CREATE TABLE IF NOT EXISTS limit_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  marketing_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  current_limit NUMERIC NOT NULL,
  requested_limit NUMERIC NOT NULL,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, approved, rejected
  approval_notes TEXT,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create withdrawal_history table
CREATE TABLE IF NOT EXISTS withdrawal_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  marketing_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  withdrawal_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS
ALTER TABLE discount_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE limit_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawal_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for discount_requests
-- Allow users to see their own discount requests or admins to see all
CREATE POLICY "Users can view their own discount requests" ON discount_requests
  FOR SELECT USING (
    auth.uid() = marketing_id 
    OR EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'super_admin')
  );

-- Allow users to insert their own discount requests
CREATE POLICY "Users can insert their own discount requests" ON discount_requests
  FOR INSERT WITH CHECK (auth.uid() = marketing_id);

-- Allow users to update their own pending requests and admins to update all
CREATE POLICY "Users can update their own discount requests" ON discount_requests
  FOR UPDATE USING (
    (auth.uid() = marketing_id AND status = 'pending')
    OR EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'super_admin')
  );

-- RLS Policies for limit_requests
-- Allow users to see their own limit requests or admins to see all
CREATE POLICY "Users can view their own limit requests" ON limit_requests
  FOR SELECT USING (
    auth.uid() = marketing_id 
    OR EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'super_admin')
  );

-- Allow users to insert their own limit requests
CREATE POLICY "Users can insert their own limit requests" ON limit_requests
  FOR INSERT WITH CHECK (auth.uid() = marketing_id);

-- Allow users to update their own pending requests and admins to update all
CREATE POLICY "Users can update their own limit requests" ON limit_requests
  FOR UPDATE USING (
    (auth.uid() = marketing_id AND status = 'pending')
    OR EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'super_admin')
  );

-- RLS Policies for withdrawal_history
-- Allow users to see their own withdrawal history or admins to see all
CREATE POLICY "Users can view their own withdrawal history" ON withdrawal_history
  FOR SELECT USING (
    auth.uid() = marketing_id 
    OR EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'super_admin')
  );

-- Allow users to insert their own withdrawal history
CREATE POLICY "Users can insert their own withdrawal history" ON withdrawal_history
  FOR INSERT WITH CHECK (auth.uid() = marketing_id);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_discount_requests_marketing_id ON discount_requests(marketing_id);
CREATE INDEX IF NOT EXISTS idx_discount_requests_outlet_id ON discount_requests(outlet_id);
CREATE INDEX IF NOT EXISTS idx_discount_requests_status ON discount_requests(status);

CREATE INDEX IF NOT EXISTS idx_limit_requests_marketing_id ON limit_requests(marketing_id);
CREATE INDEX IF NOT EXISTS idx_limit_requests_outlet_id ON limit_requests(outlet_id);
CREATE INDEX IF NOT EXISTS idx_limit_requests_status ON limit_requests(status);

CREATE INDEX IF NOT EXISTS idx_withdrawal_history_marketing_id ON withdrawal_history(marketing_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_history_outlet_id ON withdrawal_history(outlet_id);
